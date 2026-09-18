"use client";

import { useEffect, useState } from "react";
import { FileText, Package, Layers } from "lucide-react";
import UrlUploadInput from "./UrlUploadInput";
import MultiLangTextField from "./MultiLangTextField";

interface ProductOption {
  id: string; // slug
  name: string;
  model: string;
  tab: string;
  category: string;
}
interface OtherOption {
  id: string; // slug
  name: string;
}

interface Props {
  kind: "industry" | "service";
  form: Record<string, any>;
  handleChange: (name: string, value: any) => void;
}

/**
 * 推荐与下载配置 · 统一入口
 * 行业方案 / 服务方案共用：
 * 1. 方案下载文件（审核制：访客留资后台确认后开放下载）
 * 2. 推荐相关产品（关联真实产品，前台渲染为产品卡片/链接）
 * 3. 推荐相关行业（kind=industry，探索其他行业）或推荐相关服务（kind=service）
 */
export default function RecommendConfig({ kind, form, handleChange }: Props) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [others, setOthers] = useState<OtherOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  const isIndustry = kind === "industry";

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/public/products?specs=3").then((r) => r.json()),
      fetch(isIndustry ? "/api/public/industries" : "/api/public/services").then((r) => r.json()),
    ])
      .then(([pd, od]) => {
        if (!alive) return;
        // 拍平产品：tab -> category -> models
        const flat: ProductOption[] = [];
        const tabs = pd?.data || pd || [];
        for (const tab of tabs) {
          for (const cat of tab.categories || []) {
            for (const m of cat.models || []) {
              flat.push({
                id: m.id,
                name: m.name || m.model || "",
                model: m.model || "",
                tab: tab.name || tab.id || "",
                category: cat.name || cat.id || "",
              });
            }
          }
        }
        setProducts(flat);
        const list = Array.isArray(od) ? od : [];
        setOthers(list.map((x: any) => ({ id: x.slug, name: x.name || x.title || "" })));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      alive = false;
    };
  }, [isIndustry]);

  const selectedProducts: string[] = Array.isArray(form.relatedProductSlugs) ? form.relatedProductSlugs : [];
  const selectedOthers: string[] = Array.isArray(
    isIndustry ? form.relatedIndustrySlugs : form.relatedServiceSlugs
  )
    ? isIndustry
      ? form.relatedIndustrySlugs
      : form.relatedServiceSlugs
    : [];

  // 文件名称多语言值（zh=基础字段，其余=后缀字段）
  const fileNameLangs = ["zh", "en", "ja", "ko", "fr", "ar"];
  const fileNameValues: Record<string, string> = {};
  fileNameLangs.forEach((lang) => {
    const fieldName = lang === "zh" ? "solutionFileName" : `solutionFileName${lang.charAt(0).toUpperCase()}${lang.slice(1)}`;
    fileNameValues[lang] = form[fieldName] || "";
  });
  function handleFileNameValuesChange(values: Record<string, string>) {
    fileNameLangs.forEach((lang) => {
      const fieldName = lang === "zh" ? "solutionFileName" : `solutionFileName${lang.charAt(0).toUpperCase()}${lang.slice(1)}`;
      handleChange(fieldName, values[lang] ?? "");
    });
  }

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    if (list.includes(v)) set(list.filter((x) => x !== v));
    else set([...list, v]);
  }

  const block = "bg-white rounded-lg border border-gray-100 shadow-sm p-5";
  const titleCls = "flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3";

  return (
    <div className="space-y-4">
      {/* 1. 方案下载文件 */}
      <div className={block}>
        <div className={titleCls}>
          <FileText size={16} className="text-red-500" />
          {isIndustry ? "解决方案下载（前台“解决方案”区块显示下载按钮，访客留资后台确认后开放下载）" : "服务方案下载（前台“服务方案下载”区块显示下载按钮，访客留资后台确认后开放下载）"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">方案文件</label>
            <UrlUploadInput
              value={form.solutionFile || ""}
              onChange={(url) => handleChange("solutionFile", url)}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
              showPreview={false}
              placeholder={isIndustry ? "/uploads/solution-xxx.pdf（上传解决方案文档）" : "/uploads/solution-xxx.pdf（上传服务方案文档）"}
            />
            <p className="text-xs text-gray-400 mt-1">支持 PDF / Word / PPT / ZIP，上传后自动压缩</p>
          </div>
          <div>
            <MultiLangTextField
              label="文件名称"
              valueZh={form.solutionFileName || ""}
              valueEn={form.solutionFileNameEn || ""}
              onChangeZh={(v) => handleChange("solutionFileName", v)}
              onChangeEn={(v) => handleChange("solutionFileNameEn", v)}
              values={fileNameValues}
              onValuesChange={handleFileNameValuesChange}
              type="text"
              placeholder={isIndustry ? "如：珠宝首饰行业解决方案.pdf" : "如：ODM/OEM 服务方案.pdf"}
              capitalize
            />
            <p className="text-xs text-gray-400 mt-1">显示在下载按钮上（留空则显示“下载解决方案”）</p>
          </div>
        </div>
      </div>

      {/* 2. 推荐相关产品 */}
      <div className={block}>
        <div className={titleCls}>
          <Package size={16} className="text-red-500" />
          推荐相关产品（前台“相关产品”区块显示；不勾选则显示下方“相关产品”字段中的文字标签）
        </div>
        {!loaded ? (
          <div className="text-gray-400 text-sm py-3">产品列表加载中...</div>
        ) : products.length === 0 ? (
          <div className="text-gray-400 text-sm py-3">暂无已发布产品</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {products.map((p) => (
              <label
                key={p.id}
                className="flex items-start gap-2 p-2 rounded-md border border-gray-100 hover:border-red-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={() => toggle(selectedProducts, (v) => handleChange("relatedProductSlugs", v), p.id)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  {p.name}
                  <span className="block text-xs text-gray-400">
                    {p.model} · {p.tab} / {p.category}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 3. 推荐相关行业 / 服务 */}
      <div className={block}>
        <div className={titleCls}>
          <Layers size={16} className="text-red-500" />
          {isIndustry ? "探索其他行业（前台“探索其他行业”区块显示；不勾选则自动推荐前 3 个行业）" : "推荐相关服务（前台“相关服务”区块显示；不勾选则自动推荐其他服务）"}
        </div>
        {!loaded ? (
          <div className="text-gray-400 text-sm py-3">{isIndustry ? "行业列表加载中..." : "服务列表加载中..."}</div>
        ) : others.length === 0 ? (
          <div className="text-gray-400 text-sm py-3">{isIndustry ? "暂无行业" : "暂无服务"}</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {others.map((x) => (
              <label
                key={x.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-100 hover:border-red-200 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedOthers.includes(x.id)}
                  onChange={() =>
                    toggle(
                      selectedOthers,
                      (v) => handleChange(isIndustry ? "relatedIndustrySlugs" : "relatedServiceSlugs", v),
                      x.id
                    )
                  }
                  className="mt-0"
                />
                <span className="text-sm text-gray-700">{x.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
