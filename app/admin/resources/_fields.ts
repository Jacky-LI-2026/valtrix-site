import { MultiLangFieldConfig } from "@/lib/admin-form";

// ============================================================
// 资源 · 统一字段配置（新增页 / 编辑页共用，改字段只改这里）
// ============================================================
export const RESOURCE_FIELDS: MultiLangFieldConfig[] = [
  { name: "title", label: "资源标题", kind: "text", required: true, capitalize: true, placeholder: "资源标题", placeholderEn: "Resource Title" },
  { name: "description", label: "资源描述", kind: "textarea", rows: 4, placeholder: "请输入资源描述...", placeholderEn: "Resource description..." },
];
