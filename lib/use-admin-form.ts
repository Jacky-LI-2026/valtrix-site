'use client'

import { useCallback, useState } from 'react'
import {
  MultiLangFieldConfig,
  LANGS,
  buildLangValues,
  buildTranslateFieldMap,
  expandLangFieldNames,
  langFieldName,
} from './admin-form'

export interface AdminFormApi<T extends Record<string, any>> {
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  /** 更新单个字段（含非多语言字段） */
  handleChange: (field: string, value: string | number | boolean | any[]) => void
  /** 多语言字段整组更新（MultiLangFieldV2 onChangeAll / 一键翻译） */
  handleValuesChange: (baseField: string, values: Record<string, string>) => void
  /** 从 form 提取某基础字段的多语言值对象 */
  getLangValues: (baseField: string) => Record<string, string>
  /** 生成 AutoTranslateBar 的 fieldMap（供「一键翻译全部」批量翻译） */
  buildFieldMap: () => Record<string, string>
  /** 供 AutoTranslateBar 读取最新表单值 */
  getFormValues: () => T
  /** 供 AutoTranslateBar 回写翻译结果 */
  updateFormValue: (field: string, value: any) => void
}

/**
 * 后台多语言编辑表单统一 Hook
 * 收敛各页面重复样板：form 状态、handleChange、多语言值读写、翻译 fieldMap。
 * 配合 MultiLangFormField 与 AutoTranslateBar 使用。
 */
export function useAdminForm<T extends Record<string, any>>(
  initialForm: T,
  fields: MultiLangFieldConfig[] = []
): AdminFormApi<T> {
  // 初始化时把多语言字段全部展开（含各语种键），
  // 否则 handleValuesChange / applyLangValues 因「字段不存在」写不进去，
  // 导致新建页手动输入/一键翻译的外文无法进入 form。
  const [form, setForm] = useState<T>(() => {
    const base: Record<string, any> = { ...(initialForm as any) }
    fields.forEach((f) => {
      LANGS.forEach((lang) => {
        const fieldName = langFieldName(f.name, lang)
        if (!(fieldName in base)) {
          base[fieldName] = ''
        }
      })
    })
    return base as T
  })

  const handleChange = useCallback((field: string, value: string | number | boolean | any[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleValuesChange = useCallback((baseField: string, values: Record<string, string>) => {
    setForm((prev) => {
      const next = { ...prev }
      Object.keys(values).forEach((lang) => {
        const fieldName = langFieldName(baseField, lang as any)
        if (fieldName in next) {
          ;(next as any)[fieldName] = values[lang] ?? ''
        } else {
          // 🔴 2026-09-18：这个守卫会**静默丢弃**写入 —— 实测就是「字段级翻译按钮点了没反应」的直接原因：
          //   加载记录时若某个语种键没被带进 form（见 ContentTypeForm 的加载分支 / expandFieldsToForm），
          //   这里既不写、也不报错。
          //   守卫本身**要保留**（避免把模型没有的列写进提交体，例如 buildTranslateFieldMap 会把 slug 也映射成 slugEn），
          //   但至少留下痕迹，便于下次 5 分钟内定位而不是查半天。
          console.warn(`[useAdminForm] 跳过写入：表单里没有 ${fieldName}（base=${baseField}, lang=${lang}）`)
        }
      })
      return next
    })
  }, [])

  const getLangValues = useCallback(
    (baseField: string): Record<string, string> => {
      return buildLangValues(form, baseField)
    },
    [form]
  )

  const buildFieldMap = useCallback(() => {
    return buildTranslateFieldMap(fields)
  }, [fields])

  const getFormValues = useCallback(() => form, [form])

  const updateFormValue = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  return {
    form,
    setForm,
    handleChange,
    handleValuesChange,
    getLangValues,
    buildFieldMap,
    getFormValues,
    updateFormValue,
  }
}

// 兼容导出：多语言字段名工具
export { expandLangFieldNames, langFieldName }
