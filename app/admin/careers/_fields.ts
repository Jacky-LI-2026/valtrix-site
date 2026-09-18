import { MultiLangFieldConfig } from "@/lib/admin-form";

// ============================================================
// 招聘职位 · 统一字段配置（新增页 / 编辑页共用，改字段只改这里）
// ============================================================
export const CAREER_FIELDS: MultiLangFieldConfig[] = [
  { name: "title", label: "职位名称", kind: "text", required: true, capitalize: true, placeholder: "职位名称", placeholderEn: "Job Title" },
  { name: "department", label: "部门", kind: "text", placeholder: "如：研发部", placeholderEn: "Department" },
  { name: "location", label: "工作地点", kind: "text", placeholder: "如：深圳", placeholderEn: "Location" },
  { name: "type", label: "工作类型", kind: "text", placeholder: "全职 / 兼职 / 实习 / 远程", placeholderEn: "Full-time / Part-time / Intern / Remote" },
  { name: "salary", label: "薪资范围", kind: "text", placeholder: "如：15K-25K", placeholderEn: "e.g. 15K-25K" },
  { name: "experience", label: "经验要求", kind: "text", placeholder: "如：3-5年", placeholderEn: "e.g. 3-5 years" },
  { name: "education", label: "学历要求", kind: "text", placeholder: "如：本科及以上", placeholderEn: "e.g. Bachelor or above" },
  { name: "tags", label: "职位标签", kind: "stringArray", itemLabel: "标签内容", addButtonText: "添加标签" },
  { name: "description", label: "职位描述", kind: "stringArray", itemLabel: "描述内容", addButtonText: "添加描述" },
  { name: "responsibilities", label: "岗位职责", kind: "stringArray", itemLabel: "职责内容", addButtonText: "添加职责" },
  { name: "requirements", label: "任职要求", kind: "stringArray", itemLabel: "要求内容", addButtonText: "添加要求" },
  { name: "benefits", label: "福利待遇", kind: "stringArray", itemLabel: "福利内容", addButtonText: "添加福利" },
];
