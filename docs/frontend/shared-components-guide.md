# 后台通用功能块统一规范

> 文档性质：项目长期规范（形成记忆）。
> 范围：后台管理系统（`/admin`）多页面复用的通用功能块 —— **多语言字段 / 富文本翻译 / SEO+GEO / 数组编辑器 / 一键翻译**。
> 目标：多个页面通用模块**统一入口调用**，页面只需**定义字段（FieldConfig）**即可，杜绝各页面手写重复样板与组件版本分裂。
> 关联：`AGENTS.md`（记忆索引）、`docs/backend/05-dev-memory.md`（ADR/坑点）。

---

## 1. 通用功能块清单

| # | 功能块 | 统一入口 | 职责 |
|---|--------|----------|------|
| 1 | 多语言字段渲染 | `components/admin/MultiLangFormField.tsx` | 按 `FieldConfig` 渲染 text/textarea/richtext/jsonArray/stringArray 多语言编辑器 |
| 2 | 多语言表单样板 | `lib/use-admin-form.ts` `useAdminForm` | 收敛 form 状态、handleChange、多语言值读写、翻译 fieldMap |
| 3 | 字段配置与工具 | `lib/admin-form.ts` | `FieldConfig` 类型、多语言字段名展开、值读写、序列化 |
| 4 | 整页一键翻译 | `components/admin/AutoTranslateBar.tsx` | 目标语种多选、自动/手动翻译整页字段 |
| 5 | 多语言底层组件 | `components/admin/MultiLangFieldV2.tsx` | 语种 Tab + 翻译按钮 + 只读锁定，底层通用件（一般不直接用） |
| 6 | 多语言文本封装 | `components/admin/MultiLangTextField.tsx` | text/textarea/richtext 封装（MultiLangFormField 内部使用） |
| 7 | 数组编辑器 | `components/admin/JsonArrayEditor.tsx` / `StringArrayEditor.tsx` | JSON 对象数组 / 字符串数组编辑 |
| 8 | SEO+GEO 配置 | `components/admin/SeoGeoConfig.tsx` | SEO 标题/描述/关键词 + 关键词提取/网络推荐 + GEO 地区/城市 |
| 9 | 富文本编辑器 | `components/admin/RichTextEditor.tsx` | 富文本（由 MultiLangFormField 自动注入，不要直接 import 复用历史写法） |
| 10 | 上传组件 | `components/admin/UrlUploadInput.tsx` / `FileUpload.tsx` | URL/文件上传（图片/封面等） |
| 11 | 翻译服务 | `POST /api/admin/translate` + `lib/translate-utils.ts` | 单文本 / JSON 数组翻译（百度优先） |

**不推荐再用的旧组件**：`MultiLangField.tsx`（旧，仅 zh/en）、`MultiLangFieldAdapter.tsx`（过渡件）。新代码一律用 #1/#2/#3 统一入口。

---

## 2. 字段命名约定（全站硬约束）

```
中文（默认语种）字段 = 基础名         name
英文字段           = 基础名 + En     nameEn
日文               = 基础名 + Ja     nameJa
韩文               = 基础名 + Ko     nameKo
法文               = 基础名 + Fr     nameFr
阿拉伯文           = 基础名 + Ar     nameAr
```

- 由 `lib/admin-form.ts` 的 `langFieldName(base, lang)` / `expandLangFieldNames(base)` 统一生成，禁止手写拼接。
- 语种集合与后台「语种管理」表一致。新增语种：扩展 `LANGS` + `LANG_LABELS` + 语种管理表 + 数据库字段（需 prisma migration）。
- 数组字段（jsonArray/stringArray）：form 中为 **JSON 字符串**，DB 中为数组。转换用 `serializeJsonFields` / `deserializeJsonFields`。

---

## 3. 字段配置 FieldConfig（定义不同字段的唯一入口）

```ts
// lib/admin-form.ts
interface MultiLangFieldConfig {
  name: string            // 基础字段名（zh），如 name
  label: string           // 中文标签
  kind?: 'text' | 'textarea' | 'richtext' | 'jsonArray' | 'stringArray'  // 默认 text
  required?: boolean
  placeholder?: string
  placeholderEn?: string
  rows?: number           // textarea
  height?: number         // richtext
  capitalize?: boolean    // 标题类：翻译结果首字母大写
  autoTranslate?: boolean // 是否参与整页一键翻译，默认 true
  colSpan?: 1 | 2         // 布局（预留）
  jsonFields?: { key: string; label: string; type?: 'text'|'textarea'; placeholder?: string }[]  // jsonArray 结构
  itemLabel?: string      // stringArray 项标签
  addButtonText?: string
}
```

---

## 4. 页面使用模板（统一调用）

以「行业方案」编辑页为基准模板（`app/admin/industries/[id]/edit/page.tsx` 已按此迁移）：

```tsx
"use client";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import AutoTranslateBar from "@/components/admin/AutoTranslateBar";
import MultiLangFormField from "@/components/admin/MultiLangFormField";
import SeoGeoConfig from "@/components/admin/SeoGeoConfig";
import { useAdminForm } from "@/lib/use-admin-form";
import { MultiLangFieldConfig, serializeJsonFields, deserializeJsonFields } from "@/lib/admin-form";

// ---- 1. 定义本页字段（只改这里）----
const FIELDS: MultiLangFieldConfig[] = [
  { name: "name", label: "名称", kind: "text", required: true, capitalize: true },
  { name: "tagline", label: "一句话定位", kind: "text" },
  { name: "description", label: "详细描述", kind: "richtext", height: 400 },
  { name: "challenges", label: "行业挑战", kind: "jsonArray",
    jsonFields: [{ key: "title", label: "标题" }, { key: "detail", label: "详情", type: "textarea" }] },
  { name: "solutions", label: "解决方案", kind: "jsonArray",
    jsonFields: [{ key: "title", label: "标题" }, { key: "detail", label: "详情", type: "textarea" }] },
];

export default function EditPage() {
  const router = useRouter(); const params = useParams(); const id = params.id as string;
  const { form, setForm, handleChange, handleValuesChange, getLangValues, buildFieldMap, getFormValues, updateFormValue } =
    useAdminForm<Record<string, any>>(/* initial 由 fetch 后 setForm 填充 */ {}, FIELDS);

  // fetch 加载：数组字段用 deserializeJsonFields
  // const loaded = deserializeJsonFields(data, FIELDS); setForm({ ...loaded, seoTitle: data.seoTitle, ... });

  // 提交：数组字段用 serializeJsonFields 解析后 POST/PUT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = serializeJsonFields(form, FIELDS);   // JSON字符串 -> 数组
    const res = await fetch(`/api/admin/industries/${id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    // ...提示/跳转
  };

  return (
    <div className="space-y-6">
      {/* 页头、message 省略 */}
      <AutoTranslateBar
        fieldMap={buildFieldMap()}                     // 自动生成，无需手写
        getFormValues={getFormValues}
        updateFormValue={updateFormValue}
      />
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {FIELDS.map((f) => (
            <MultiLangFormField key={f.name} config={f} form={form} onValuesChange={handleValuesChange} getLangValues={getLangValues} />
          ))}
          {/* 其余普通字段仍用原生控件 + handleChange */}
        </div>
        <SeoGeoConfig
          seoTitle={form.seoTitle} seoDescription={form.seoDescription} seoKeywords={form.seoKeywords}
          geoRegion={form.geoRegion} geoCity={form.geoCity}
          onChange={handleChange}
          sourceTitle={form.name} sourceSummary={form.tagline} sourceText={form.description}
          autoFill={true}
        />
        {/* 保存按钮 */}
      </form>
    </div>
  );
}
```

> 说明：`AutoTranslateBar` 的 `fieldMap` 由 `buildFieldMap()` 依据 FIELDS 中 `autoTranslate !== false` 的字段自动生成（`{ name: 'nameEn', description: 'descriptionEn', ... }`）。数组字段也走 `translateJsonArray`，整页一键翻译自动覆盖。

---

## 5. 后端保存约定（必须遵守）

1. **POST/PUT 必须接收并写库全部多语言字段**（`title*` / `summary*` / `content*` / 各模块 `name*`、`description*`、数组字段 `*En/*Ja/...`）。
   - 教训：新闻接口曾漏存多语言字段，导致「翻译后无法保存」（提示成功、刷新丢失）——已修复（2026-08-31）。
   - 新增字段时：改 schema → migration → **同时**改前端 FIELDS 与后端 POST/PUT 解构、写库。
2. 数组字段 DB 为数组，接口 JSON 直接收数组（前端已 serializeJsonFields）。
3. 默认 `|| ''` / `|| []` 兜底，避免空值报错。

---

## 6. 现状映射与迁移指引

| 模块 | 多语言字段 | 当前状态 | 迁移动作 |
|------|-----------|----------|----------|
| 产品 products | name/subtitle/summary/description/features + specs | 已用 MultiLangTextField + 手写样板 | 可迁移到 FIELDS + useAdminForm（样板收敛） |
| 新闻 news | title/summary/content | 已用 MultiLangTextField + 手写样板 | 同上 |
| 行业 industries | name/tagline/description + challenges/solutions/products/cases | **已按本规范迁移**（new/edit 共用 `_fields.ts`，示范） | 已完成 |
| 职位 careers | title/location/type/salary/experience/education/tags/description/responsibilities/requirements/benefits | 用 MultiLangFieldAdapter + 手写，**form 缺 ja/ko/fr/ar 字段，外文无法保存** | 需迁移 + 补全多语种字段 |
| 关于 about | content/highlights/timeline/certifications | 手写（已有 ja/ko/fr/ar 字段） | 迁移到 FIELDS + useAdminForm |
| 服务 services | title/subtitle/description/features | 手写 | 同上 |
| 资源 resources | 视字段而定 | 手写（已有 ja/ko/fr/ar 字段） | 同上 |
| 菜单 menus | name（多语言） | 手动编辑 | 同上（编辑菜单场景） |

**迁移步骤（每页 4 步）**：
1. 抽取 `FIELDS`（把页面多语言字段配置化）。
2. `useAdminForm(initial, FIELDS)` 替换手写 form 样板。
3. 用 `<MultiLangFormField>` 替换 `MultiLangFieldAdapter`/手写 MultiLangTextField 调用；`buildFieldMap()` 替换手写 fieldMap。
4. 加载用 `deserializeJsonFields`，提交用 `serializeJsonFields`；核对后端 route 已保存全量多语言字段。

---

## 7. 关键坑点（复读 AGENTS.md）

- 前台版式视觉零改动（高优先级约束）。
- 翻译 API QPS 有限，批量翻译串行+延时（组件内已内置）。
- 语种禁用后 MultiLangFieldV2 自动隐藏该语种 Tab；如某页面需强制显示，在 FIELDS 配置说明。
- PowerShell 环境无 `&&`；中文路径加引号。
