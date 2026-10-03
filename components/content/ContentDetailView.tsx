"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import sanitize from "sanitize-html";
import { useI18n } from "@/lib/i18n";
import { pickLang } from "@/lib/content-types/dynamic";
import { preserveLeadingSpaces } from "@/lib/rich-text";

interface Props {
  cfg: any;
  item: any;
}

/** 前台通用内容详情页渲染：按字段类型渲染（多语言/富文本/图片/数组/布尔/数字） */
export default function ContentDetailView({ cfg, item }: Props) {
  const { locale } = useI18n();
  const [videoEnabled, setVideoEnabled] = useState(true);

  // 「视频内容」插件开关：关闭则前台不渲染播放器
  useEffect(() => {
    fetch("/api/public/plugins", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.state && typeof d.state["video-content"] === "boolean") {
          setVideoEnabled(d.state["video-content"]);
        }
      })
      .catch(() => {});
  }, []);

  const renderFieldValue = (f: any, value: any) => {
    if (value === null || value === undefined || value === "") return null;
    const v = f.multiLang ? pickLang(value, locale) : value;
    if (v === "" || v === null || v === undefined) return null;
    switch (f.kind) {
      case "image":
        return (
          <div className="rounded-xl overflow-hidden border border-dark-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v} alt={f.label} className="w-full max-h-96 object-cover" />
          </div>
        );
      case "video":
        if (!videoEnabled) return null;
        return (
          <div className="rounded-xl overflow-hidden border border-dark-100 bg-black">
            <video controls className="w-full max-h-96" preload="metadata" poster={item[f.name + "Poster"] || undefined}>
              <source src={v} />
              您的浏览器不支持视频播放。
            </video>
          </div>
        );
      case "gallery":
        if (!Array.isArray(v) || v.length === 0) return null;
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {v.filter(Boolean).map((u, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-dark-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`${f.label} ${i + 1}`} className="w-full h-44 object-cover" />
              </div>
            ))}
          </div>
        );
      case "richtext":
        return (
          <div
            className="prose prose-sm max-w-none dark:prose-invert leading-relaxed text-dark-700 [&_img]:max-w-full [&_img]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: preserveLeadingSpaces(sanitize(v)) }}
          />
        );
      case "boolean":
        return v ? "✓" : "—";
      case "stringArray":
        if (!Array.isArray(v)) return null;
        return (
          <ul className="space-y-2">
            {v.filter(Boolean).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-dark-600">
                <span className="text-primary mt-1.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        );
      case "jsonArray":
        if (!Array.isArray(v)) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {v.filter(Boolean).map((row: any, i: number) => (
              <div key={i} className="border border-dark-100 rounded-lg p-4 bg-dark-50/50">
                {(f.jsonFields || []).map((jf: any) => {
                  const rv = row?.[jf.key];
                  if (!rv) return null;
                  const rvText = f.multiLang && typeof rv === "object" ? pickLang(rv, locale) : rv;
                  return (
                    <div key={jf.key} className={jf.key === (f.jsonFields?.[0]?.key) ? "font-semibold text-dark" : "text-sm text-dark-500 mt-1"}>
                      {rvText}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      case "number":
      case "select":
      case "text":
      case "textarea":
      default:
        return <p className="text-dark-700 leading-relaxed">{v}</p>;
    }
  };

  const title = (item[cfg.titleField] ? pickLang(item[cfg.titleField], locale) : "") || item.title || "未命名";

  return (
    <div>
      <div className="bg-dark text-white py-20 text-center">
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 详情字段 */}
        <div className="space-y-8">
          {cfg.fields
            .filter((f: any) => f.name !== cfg.titleField && f.name !== "status" && f.name !== "sortOrder")
            .map((f: any) => {
              const value = renderFieldValue(f, item[f.name]);
              if (value === null) return null;
              return (
                <div key={f.name}>
                  <h2 className="text-xl font-semibold text-dark mb-3">{f.label}</h2>
                  {value}
                </div>
              );
            })}
        </div>

        <div className="mt-12 pt-6 border-t border-dark-100 text-sm">
          <Link href={`/content/${cfg.name}`} className="text-primary hover:underline">
            ← 返回列表
          </Link>
        </div>
      </div>
    </div>
  );
}
