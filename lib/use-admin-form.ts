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
