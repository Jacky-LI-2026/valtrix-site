/**
 * 后台管理 · 多语言表单统一字段配置
 * =====================================================
 * 全站后台多个内容模块（产品/新闻/行业/职位/关于/服务/资源）共用同一套
 * 「多语言 + SEO/GEO + 富文本翻译」能力。本文件定义**统一字段配置**与
 * 工具函数，页面只需声明 `fields` 配置即可渲染多语言字段、自动翻译、
 * 自动序列化，实现「统一调用功能、定义不同字段」。
 *
 * 字段命名约定（全站统一，勿破坏）：
 *   zh 字段 = base（如 name）
 *   非 zh 字段 = base + 语言首字母大写（如 nameEn / nameJa / nameKo / nameFr / nameAr）
 * 语种集合与后台「语种管理」一致，新增语种时同步扩展 LANGS 与组件。
 */

// ---- 语种 ----
export const LANGS = ['zh', 'en', 'ja', 'ko', 'fr', 'ar'] as const
export type Lang = (typeof LANGS)[number]

export const LANG_LABELS: Record<Lang, string> = {
  zh: '中文',
  en: '英文',
  ja: '日文',
  ko: '韩文',
  fr: '法文',
  ar: '阿拉伯文',
}

/** 由基础字段名 + 语种得到数据库字段名：name + en -> nameEn，name + zh -> name */
export function langFieldName(base: string, lang: Lang): string {
  if (lang === 'zh') return base
  return `${base}${lang.charAt(0).toUpperCase()}${lang.slice(1)}`
}

/** 展开某个基础字段在所有语种下的字段名 */
export function expandLangFieldNames(base: string): Record<Lang, string> {
  return LANGS.reduce((acc, lang) => {
    acc[lang] = langFieldName(base, lang)
    return acc
  }, {} as Record<Lang, string>)
}

/**
 * 由「列宽上限表」推出某个多语言字段各语种的上限：`{ zh: 500, fr: 500, en: 300, … }`
 * ---------------------------------------------------------------------------
 * 上游：`/api/admin/content/[type]/meta` 的 `limits`（服务端读 `prisma/schema.prisma` 的 VarChar 宽度）。
 * 用途：编辑页把结果塞进字段 config 的 `maxLengthByLang`，输入框据此加 `maxLength` 并显示
 * 「已用 x / 上限 y」（owner 2026-09-20 要求：「不要保存后才知道超了」）。
 * 返回 undefined 表示该字段没有任何列宽上限（例如 Text 列）—— 此时不显示提示、不加限制。
 */
export function maxLengthByLangOf(limits: Record<string, number> | undefined, baseName: string): Record<string, number> | undefined {
  if (!limits) return undefined
  const out: Record<string, number> = {}
  for (const lang of LANGS) {
    const max = limits[langFieldName(baseName, lang)]
    if (typeof max === 'number' && max > 0) out[lang] = max
  }
  return Object.keys(out).length ? out : undefined
}

/** 从 form 提取某基础字段的多语言值对象 { zh, en, ja, ... } */
export function buildLangValues<T extends Record<string, any>>(
  form: T,
  base: string
): Record<Lang, string> {
  const names = expandLangFieldNames(base)
  const values = {} as Record<Lang, string>
  LANGS.forEach((lang) => {
    const v = form[names[lang]]
    values[lang] = v == null ? '' : String(v)
  })
  return values
}

/** 将多语言值对象写回 form（只覆盖存在的字段） */
export function applyLangValues<T extends Record<string, any>>(
  form: T,
  base: string,
  values: Record<string, string>
): T {
  const next = { ...form }
  Object.keys(values).forEach((lang) => {
    const fieldName = langFieldName(base, lang as Lang)
    if (fieldName in next) {
      ;(next as any)[fieldName] = values[lang] ?? ''
    }
  })
  return next
}

// ---- 统一字段配置 ----
export type FieldKind = 'text' | 'textarea' | 'richtext' | 'jsonArray' | 'stringArray'

export interface JsonArrayField {
  key: string
  label: string
  type?: 'text' | 'textarea'
  placeholder?: string
}

export interface MultiLangFieldConfig {
  /** 基础字段名（zh），如 name；非 zh 字段自动展开为 nameEn/nameJa/... */
  name: string
  /** 中文标签 */
  label: string
  /** 字段类型，默认 text */
  kind?: FieldKind
  /** 中文必填 */
  required?: boolean
  placeholder?: string
  placeholderEn?: string
  /** textarea 行数 */
  rows?: number
  /** richtext 高度 */
  height?: number
  /** 标题类字段翻译结果首字母大写 */
  capitalize?: boolean
  /** 是否参与整页「一键翻译全部」，默认 true */
  autoTranslate?: boolean
  /** text/textarea 字段是否显示 AI 生成/润色按钮，默认 true（作用于中文值） */
  ai?: boolean
  /** 布局：col-span-2 整行（默认），col-span-1 半行 */
  colSpan?: 1 | 2
  /** jsonArray 专用：对象数组字段结构 */
  jsonFields?: JsonArrayField[]
  /** stringArray 专用 */
  itemLabel?: string
  addButtonText?: string
  /**
   * 各语种的字数上限（2026-09-20）：来自数据库列宽（`prisma/schema.prisma` 的 `@db.VarChar(n)`），
   * 经 `/api/admin/content/[type]/meta` 下发。编辑页据此给输入框加 `maxLength` 并显示
   * 「已用 x / 上限 y」——避免"保存后才知道超了"。未声明的语种/字段不加限制（Text 列无上限）。
   */
  maxLengthByLang?: Record<string, number>
}

/** 生成 AutoTranslateBar 的 fieldMap：{ zh字段: zh字段En }（仅 autoTranslate 字段） */
export function buildTranslateFieldMap(
  fields: MultiLangFieldConfig[],
  baseField: (name: string) => string = (n) => n
): Record<string, string> {
  const map: Record<string, string> = {}
  fields.forEach((f) => {
    if (f.autoTranslate === false) return
    map[baseField(f.name)] = langFieldName(baseField(f.name), 'en')
  })
  return map
}

/** 生成 AutoTranslateBar 的 capitalize 字段名数组：配置了 capitalize:true 且参与自动翻译的字段 */
export function buildCapitalizeFields(
  fields: MultiLangFieldConfig[],
  baseField: (name: string) => string = (n) => n
): string[] {
  const list: string[] = []
  fields.forEach((f) => {
    if (f.autoTranslate === false) return
    if (f.capitalize) list.push(baseField(f.name))
  })
  return list
}

/**
 * 提交前序列化：把 jsonArray/stringArray 字段（form 中为 JSON 字符串）解析为数组。
 * 解析失败安全回退为 []，避免整单保存失败。
 */
export function serializeJsonFields<T extends Record<string, any>>(
  form: T,
  fields: MultiLangFieldConfig[]
): Record<string, any> {
  const payload: Record<string, any> = { ...form }
  const arrayFields = fields.filter((f) => f.kind === 'jsonArray' || f.kind === 'stringArray')
  arrayFields.forEach((f) => {
    LANGS.forEach((lang) => {
      const fieldName = langFieldName(f.name, lang)
      const raw = form[fieldName]
      if (raw == null || raw === '') {
        payload[fieldName] = []
      } else if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw)
          payload[fieldName] = Array.isArray(parsed) ? parsed : []
        } catch {
          payload[fieldName] = []
        }
      }
    })
  })
  return payload
}

/** 反序列化（加载）：把数组字段转为 form 使用的 JSON 字符串（空白保留空串便于编辑） */
export function deserializeJsonFields<T extends Record<string, any>>(
  data: T,
  fields: MultiLangFieldConfig[]
): Record<string, any> {
  const form: Record<string, any> = { ...data }
  const arrayFields = fields.filter((f) => f.kind === 'jsonArray' || f.kind === 'stringArray')
  arrayFields.forEach((f) => {
    LANGS.forEach((lang) => {
      const fieldName = langFieldName(f.name, lang)
      const v = data[fieldName]
      form[fieldName] = v == null ? '' : JSON.stringify(v, null, 2)
    })
  })
  return form
}
