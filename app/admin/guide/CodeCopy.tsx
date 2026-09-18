"use client";

import { useEffect } from "react";

/**
 * 代码块一键复制（客户端组件）
 * 扫描所有 .code-block 容器，在右上角注入复制按钮
 * 点击复制代码内容，显示"已复制"反馈
 */
export default function CodeCopy() {
  useEffect(() => {
    const addButtons = () => {
      document.querySelectorAll<HTMLElement>(".code-block").forEach((block) => {
        if (block.dataset.copyReady) return;
        block.dataset.copyReady = "1";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "复制";
        btn.className =
          "absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 " +
          "text-[11px] font-medium text-slate-500 bg-white border border-slate-200 " +
          "rounded-md shadow-sm hover:text-red-600 hover:border-red-300 transition-colors";
        btn.setAttribute("aria-label", "复制代码");

        btn.addEventListener("click", async () => {
          const codeEl = block.querySelector("code");
          const text = (codeEl?.textContent || block.textContent || "").trim();
          const showState = (ok: boolean) => {
            btn.textContent = ok ? "✓ 已复制" : "复制失败";
            btn.classList.toggle("text-green-600", ok);
            btn.classList.toggle("border-green-300", ok);
            setTimeout(() => {
              btn.textContent = "复制";
              btn.classList.remove("text-green-600", "border-green-300");
            }, 1600);
          };
          try {
            // 优先 Clipboard API
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(text);
              showState(true);
              return;
            }
            throw new Error("no clipboard api");
          } catch {
            // 降级：隐藏 textarea + execCommand（兼容内嵌/iframe 环境）
            try {
              const ta = document.createElement("textarea");
              ta.value = text;
              ta.style.position = "fixed";
              ta.style.opacity = "0";
              document.body.appendChild(ta);
              ta.select();
              const ok = document.execCommand("copy");
              document.body.removeChild(ta);
              showState(ok);
            } catch {
              showState(false);
            }
          }
        });

        block.appendChild(btn);
      });
    };

    addButtons();

    // 监听内容区动态变化（smooth 滚动/懒渲染场景）
    const observer = new MutationObserver(addButtons);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
