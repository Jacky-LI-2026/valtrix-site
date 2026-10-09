"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 使用说明书 - 全文搜索（客户端组件）
 *
 * 为什么做成客户端：说明书正文由服务端 `renderMarkdown()` 渲染进 `#guide-content`，
 * 搜索索引直接在**渲染结果**上按 h1~h4 切章节生成 —— 不额外传正文（省流量）、
 * 且永远与页面所见一致（改 md 后无需再动索引）。
 *
 * 功能：多关键词（空格=且）、命中章节列表 + 摘要、正文命中高亮、
 *      上一处/下一处跳转、⌘/Ctrl+K 聚焦、Esc 清空。
 * 样式用自带 <style>（不依赖 Tailwind 扫描常量，避免类名被 purge）。
 */

const CONTENT_ID = "guide-content";
const MARK_CLASS = "guide-hit";
const MARK_ACTIVE_CLASS = "guide-hit-active";
const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4"]);
const MAX_RESULTS = 80;

interface Section {
  id: string;
  title: string;
  level: number;
  trail: string;
  text: string;
}

interface SearchHit {
  section: Section;
  count: number;
  snippet: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parseTerms(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  raw
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .forEach((t) => {
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    });
  return out;
}

/** 按 h1~h4 把正文切成章节，取每节纯文本用于搜索 */
function collectSections(): Section[] {
  const root = document.getElementById(CONTENT_ID);
  if (!root) return [];

  const sections: Section[] = [];
  let current: Section | null = null;
  let parentTitle = "";

  Array.from(root.children).forEach((child) => {
    const el = child as HTMLElement;
    if (HEADING_TAGS.has(el.tagName)) {
      const title = (el.textContent || "").replace(/\s+/g, " ").trim();
      const level = Number(el.tagName.slice(1));
      if (level === 2) parentTitle = title;
      current = {
        id: el.id,
        title,
        level,
        trail: level >= 3 && parentTitle ? `${parentTitle} › ${title}` : title,
        text: "",
      };
      sections.push(current);
      return;
    }
    if (!current) return;
    const text = (el.textContent || "").replace(/\s+/g, " ");
    if (text.trim()) current.text += `${text} `;
  });

  return sections.filter((s) => s.id && s.title);
}

function makeSnippet(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase());
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) return text.slice(0, 90);
  const start = Math.max(0, at - 32);
  const end = Math.min(text.length, at + 110);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function runSearch(sections: Section[], terms: string[]): SearchHit[] {
  if (!terms.length) return [];
  const patterns = terms.map((t) => new RegExp(escapeRegExp(t), "gi"));
  const hits: SearchHit[] = [];

  for (const section of sections) {
    const hay = `${section.title} ${section.text}`;
    let count = 0;
    let allPresent = true;

    for (const re of patterns) {
      re.lastIndex = 0;
      let found = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(hay)) !== null) {
        found += 1;
        if (m.index === re.lastIndex) re.lastIndex += 1; // 防零宽死循环
      }
      if (found === 0) {
        allPresent = false;
        break;
      }
      count += found;
    }
    if (!allPresent || count === 0) continue;
    hits.push({ section, count, snippet: makeSnippet(section.text, terms) });
  }

  return hits.sort((a, b) => b.count - a.count);
}

export default function GuideSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [markCount, setMarkCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [ready, setReady] = useState(false);

  const sectionsRef = useRef<Section[]>([]);
  const marksRef = useRef<HTMLElement[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const terms = parseTerms(query);

  /* ---------- 正文高亮 ---------- */

  const clearMarks = useCallback(() => {
    const marks = marksRef.current;
    marksRef.current = [];
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
      parent.normalize();
    });
    setMarkCount(0);
    setActiveIndex(-1);
  }, []);

  const highlight = useCallback(
    (words: string[]): number => {
      clearMarks();
      const root = document.getElementById(CONTENT_ID);
      if (!root || words.length === 0) return 0;

      const re = new RegExp(words.map(escapeRegExp).join("|"), "gi");
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const value = node.nodeValue || "";
          if (!value.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent || parent.closest("script, style")) return NodeFilter.FILTER_REJECT;
          re.lastIndex = 0;
          return re.test(value) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });

      const textNodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) textNodes.push(node as Text);

      const created: HTMLElement[] = [];
      textNodes.forEach((textNode) => {
        const value = textNode.nodeValue || "";
        const parts: (string | HTMLElement)[] = [];
        let last = 0;
        let localCount = 0;
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(value)) !== null) {
          if (m.index > last) parts.push(value.slice(last, m.index));
          const mark = document.createElement("mark");
          mark.className = MARK_CLASS;
          mark.textContent = m[0];
          parts.push(mark);
          created.push(mark);
          localCount += 1;
          last = m.index + m[0].length;
          if (m.index === re.lastIndex) re.lastIndex += 1;
        }
        if (localCount === 0) return;
        if (last < value.length) parts.push(value.slice(last));
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          frag.appendChild(typeof p === "string" ? document.createTextNode(p) : p);
        });
        textNode.parentNode?.replaceChild(frag, textNode);
      });

      marksRef.current = created;
      setMarkCount(created.length);
      return created.length;
    },
    [clearMarks]
  );

  const gotoMark = useCallback((index: number) => {
    const marks = marksRef.current;
    if (marks.length === 0) return;
    const i = ((index % marks.length) + marks.length) % marks.length;
    marks.forEach((mark, k) => mark.classList.toggle(MARK_ACTIVE_CLASS, k === i));
    marks[i].scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveIndex(i);
  }, []);

  /* ---------- 索引与搜索 ---------- */

  useEffect(() => {
    sectionsRef.current = collectSections();
    setReady(true);
  }, []);

  useEffect(() => {
    if (terms.length === 0) {
      setHits([]);
      setTotal(0);
      clearMarks();
      return;
    }
    const found = runSearch(sectionsRef.current, terms);
    setHits(found.slice(0, MAX_RESULTS));
    setTotal(found.reduce((sum, hit) => sum + hit.count, 0));

    const timer = window.setTimeout(() => highlight(terms), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, clearMarks, highlight]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const jumpToSection = useCallback(
    (section: Section) => {
      const el = document.getElementById(section.id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      const marks = marksRef.current;
      const idx = marks.findIndex(
        (mark) => el.compareDocumentPosition(mark) & Node.DOCUMENT_POSITION_FOLLOWING
      );
      if (idx >= 0) gotoMark(idx);
    },
    [gotoMark]
  );

  const reset = () => {
    setQuery("");
    setHits([]);
    setTotal(0);
    clearMarks();
  };

  const snippetParts = (text: string) => {
    if (terms.length === 0) return [text];
    const re = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
    return text.split(re);
  };
  const isTerm = (part: string) => terms.some((t) => t.toLowerCase() === part.toLowerCase());

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
      <style>{`
        #${CONTENT_ID} mark.${MARK_CLASS} { background: #fde68a; color: inherit; padding: 0 1px; border-radius: 2px; }
        #${CONTENT_ID} mark.${MARK_CLASS}.${MARK_ACTIVE_CLASS} { background: #ea580c; color: #fff; }
      `}</style>

      <div className="flex items-center gap-3 px-4 py-3">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              gotoMark(e.shiftKey ? activeIndex - 1 : activeIndex + 1);
            } else if (e.key === "Escape") {
              e.preventDefault();
              reset();
              inputRef.current?.blur();
            }
          }}
          placeholder="搜索说明书内容（多个关键词用空格分隔，如：产品 规格）"
          className="flex-1 min-w-0 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent outline-none"
          aria-label="搜索使用说明书"
        />
        {query && (
          <>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {total > 0 ? `${hits.length} 个章节 · ${total} 处命中` : "无匹配"}
              {markCount > 0 && ` · 高亮 ${markCount} 处`}
            </span>
            {markCount > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => gotoMark(activeIndex - 1)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors"
                  title="上一处（Shift+Enter）"
                >
                  上一处
                </button>
                <button
                  type="button"
                  onClick={() => gotoMark(activeIndex + 1)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors"
                  title="下一处（Enter）"
                >
                  下一处
                </button>
              </>
            )}
            <button
              type="button"
              onClick={reset}
              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              清空
            </button>
          </>
        )}
        <kbd className="hidden md:inline-block text-[11px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 whitespace-nowrap">
          ⌘K
        </kbd>
      </div>

      {ready && query && (
        <div className="border-t border-gray-100">
          {hits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              未找到「{query}」相关内容，试试更短的关键词。
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {hits.map((hit) => (
                <li key={hit.section.id}>
                  <button
                    type="button"
                    onClick={() => jumpToSection(hit.section)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[13px] ${
                          hit.section.level === 2 ? "font-semibold text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {hit.section.trail}
                      </span>
                      <span className="text-[11px] text-red-600 bg-red-50 rounded px-1.5 py-0.5">
                        {hit.count} 处
                      </span>
                    </div>
                    {hit.snippet && (
                      <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {snippetParts(hit.snippet).map((part, i) =>
                          isTerm(part) ? (
                            <mark key={i} className="bg-yellow-200 text-gray-800 rounded-sm px-0.5">
                              {part}
                            </mark>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
