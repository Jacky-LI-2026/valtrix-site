"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { pickLang } from "@/lib/content-types/dynamic";

interface Props {
  cfg: any;
  items: any[];
}

/** 前台通用内容列表页渲染（按当前语种取多语言字段） */
export default function ContentListView({ cfg, items }: Props) {
  const { locale } = useI18n();

  if (!items || items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-dark">{cfg.label}</h1>
        <p className="text-dark-400 mt-4">暂无内容</p>
      </div>
    );
  }

  // 图片字段与简介字段（渲染用）：image 优先，其次 gallery 首图 / video
  const coverField = cfg.fields.find((f: any) => f.kind === "image" || f.kind === "video") ||
    cfg.fields.find((f: any) => f.kind === "gallery");
  const getCover = (item: any): string | null => {
    if (!coverField) return null;
    const v = item[coverField.name];
    if (coverField.kind === "gallery") return Array.isArray(v) && v.length ? v[0] : null;
    return v || null;
  };
  const textFields = cfg.fields.filter(
    (f: any) => f.kind === "text" || f.kind === "textarea" || f.kind === "richtext"
  );
  const summaryField = textFields.find((f: any) => f.name !== cfg.titleField && f.multiLang) || textFields[0];
  const titleLabel = (cfg.fields.find((f: any) => f.name === cfg.titleField)?.label) || "标题";

  return (
    <div>
      {/* 页头 */}
      <div className="bg-dark text-white py-20 text-center">
        <h1 className="text-3xl font-bold">{pickLang(cfg.label, locale) || cfg.label}</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const title = pickLang(item[cfg.titleField], locale) || item.title || "未命名";
            const summary = summaryField ? pickLang(item[summaryField.name], locale) : "";
            const img = getCover(item);
            const href = cfg.slugField ? `/content/${cfg.name}/${item[cfg.slugField] || item.slug}` : "#";
            return (
              <Link
                key={item.id}
                href={href}
                className="group bg-white rounded-xl border border-dark-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {img ? (
                  <div className="relative h-44 bg-dark-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-dark-100 to-dark-200 flex items-center justify-center text-dark-300 text-4xl font-bold">
                    {String(title).slice(0, 1)}
                  </div>
                )}
                <div className="p-5">
                  <div className="text-xs text-dark-400 mb-1">{titleLabel}</div>
                  <h3 className="font-semibold text-dark group-hover:text-primary transition-colors line-clamp-2">{title}</h3>
                  {summary && <p className="text-sm text-dark-500 mt-2 line-clamp-2">{summary}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
