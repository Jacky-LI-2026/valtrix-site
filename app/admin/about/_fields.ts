import { MultiLangFieldConfig } from "@/lib/admin-form";

// ============================================================
// 关于我们 · 统一字段配置（新增页 / 编辑页共用）
// 注意：content（内容块）用 MultiLangFieldAdapter + JsonArrayEditor 定制编辑，
// highlights（核心价值观/统计项）为自定义列表编辑器，
// 均不走 MultiLangFormField，勿迁入本配置。
// ============================================================
export const ABOUT_FIELDS: MultiLangFieldConfig[] = [
  { name: "title", label: "标题", kind: "text", required: true, capitalize: true, placeholder: "标题", placeholderEn: "Title" },
  { name: "subtitle", label: "副标题", kind: "text", capitalize: true, placeholder: "副标题", placeholderEn: "Subtitle" },
];
