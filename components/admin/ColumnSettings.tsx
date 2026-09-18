"use client";

/**
 * 列表列设置（统一入口）
 * =====================
 * 后台内容列表页（新闻/产品/资源/行业/服务/案例/FAQ/职位/关于）表格列显隐控制。
 * - 每页定义可用列（key/label，顺序必须与表格列一致），本组件渲染「列设置」按钮 + 勾选面板
 * - 选择持久化到 localStorage（key: admin-list-cols-{moduleKey}），刷新后保持
 * - 隐藏逻辑：按列序号（tr > *:nth-child(n)）显隐，无需改表格 th/td 结构
 * - 「操作」列默认在最后且不可隐藏（columns 定义不包含它）
 *
 * 用法：
 *   const COLUMNS = [
 *     { key: "title", label: "标题" },
 *     { key: "category", label: "分类" },
 *     ...
 *   ]; // 顺序与表格列一致，不含「操作」列
 *   <ColumnSettings moduleKey="news" columns={COLUMNS} />
 */

import { useState, useEffect, useRef } from "react";
import { Columns3 } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
}

export default function ColumnSettings({
  moduleKey,
  columns,
}: {
  moduleKey: string;
  columns: ColumnDef[];
}) {
  const storageKey = `admin-list-cols-${moduleKey}`;
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const wrapRef = useRef<HTMLDivElement>(null);
  const ready = useRef(false);

  /** 按当前隐藏集合同步表格列显隐（列序号 = columns 顺序 + 1） */
  const applyAll = (hiddenSet: Set<string>) => {
    const root = wrapRef.current?.closest("main") || document;
    columns.forEach((c, i) => {
      const n = i + 1;
      const hide = hiddenSet.has(c.key);
      root.querySelectorAll(`tr > *:nth-child(${n})`).forEach((el) => {
        (el as HTMLElement).style.display = hide ? "none" : "";
      });
    });
  };

  // 初始读取 localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) setHidden(new Set(arr));
      }
    } catch {
      /* 忽略损坏数据 */
    }
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 就绪后应用一次初始隐藏
  useEffect(() => {
    if (ready.current) applyAll(hidden);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready.current]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggleColumn = (key: string, visible: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch {
        /* 忽略 */
      }
      applyAll(next);
      return next;
    });
  };

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        title="自定义显示列"
      >
        <Columns3 size={15} />
        列设置
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">显示列</div>
          {columns.map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!hidden.has(c.key)}
                onChange={(e) => toggleColumn(c.key, e.target.checked)}
                className="accent-red-600"
              />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
