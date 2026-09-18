'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'
import MultiLangTextField from './MultiLangTextField'
import MultiLangFieldV2 from './MultiLangFieldV2'
import AiTextButton from './AiTextButton'
import JsonArrayEditor from './JsonArrayEditor'
import StringArrayEditor from './StringArrayEditor'
import { MultiLangFieldConfig } from '@/lib/admin-form'
import { translateJsonArray } from '@/lib/translate-utils'

// 延迟加载富文本编辑器（避免每处 import 大型编辑器依赖）
const RichTextEditorLoader = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-50 rounded border border-gray-200 animate-pulse" />,
})

interface MultiLangFormFieldProps {
  /** 字段配置：只需声明 name/label/kind/...，渲染与翻译逻辑全部统一 */
  config: MultiLangFieldConfig
  /** 当前表单值（需含该字段所有语种展开后的键） */
  form: Record<string, any>
  /** 多语言值整组写回（由 useAdminForm.handleValuesChange 提供） */
  onValuesChange: (baseField: string, values: Record<string, string>) => void
  /** 从表单提取多语言值对象（由 useAdminForm.getLangValues 提供） */
  getLangValues: (baseField: string) => Record<string, string>
}

/**
 * 统一多语言字段渲染组件
 * =====================================================
 * 根据 config.kind 自动选择：
 *  - text / textarea / richtext → MultiLangTextField（基于 MultiLangFieldV2）
 *  - jsonArray / stringArray    → MultiLangFieldV2 + JsonArrayEditor / StringArrayEditor
 * 所有类型均支持：语种 Tab、中文变更自动/一键翻译、非中文内容可手动修改。
 * 页面新增字段只需加一行 FieldConfig，无需手写重复样板。
 */
export default function MultiLangFormField({
  config,
  form,
  onValuesChange,
  getLangValues,
}: MultiLangFormFieldProps) {
  const values = getLangValues(config.name)
  const kind = config.kind || 'text'

  // 单语言变化 → 整组写回
  const handleLangChange = useCallback(
    (lang: string, value: string) => {
      onValuesChange(config.name, { ...getLangValues(config.name), [lang]: value })
    },
    [config.name, onValuesChange, getLangValues]
  )

  // JSON 数组 / 字符串数组：使用 V2 + 数组编辑器
  if (kind === 'jsonArray' || kind === 'stringArray') {
    const isString = kind === 'stringArray'
    return (
      <MultiLangFieldV2
        label={config.label}
        values={values}
        onChange={handleLangChange}
        onChangeAll={(v) => onValuesChange(config.name, v)}
        onTranslate={(zh, targetLang) => translateJsonArray(zh, targetLang)}
        defaultLang="zh"
        renderEditor={(value, onChange, lang, readOnly) => (
          <div className={readOnly ? 'opacity-80 pointer-events-none' : ''}>
            {isString ? (
              <StringArrayEditor
                value={value}
                onChange={onChange}
                title={lang === 'zh' ? config.label : `${config.label} (${lang.toUpperCase()})`}
                addButtonText={config.addButtonText || (lang === 'zh' ? '添加项' : 'Add Item')}
                itemLabel={config.itemLabel || (lang === 'zh' ? '内容' : 'Content')}
              />
            ) : (
              <JsonArrayEditor
                value={value}
                onChange={onChange}
                fields={config.jsonFields || []}
                addButtonText={config.addButtonText || (lang === 'zh' ? '添加项' : 'Add Item')}
              />
            )}
          </div>
        )}
      />
    )
  }

  // 文本 / 富文本：使用 MultiLangTextField（支持全语种 values 同步）
  const showAi = (kind === 'text' || kind === 'textarea') && config.ai !== false
  return (
    <div>
      {showAi && (
        <div className="mb-1.5 flex justify-end">
          <AiTextButton
            label={config.label}
            value={form[config.name] || ''}
            onApply={(text) => onValuesChange(config.name, { ...values, zh: text })}
            compact
          />
        </div>
      )}
      <MultiLangTextField
        label={config.label}
        valueZh={form[config.name] || ''}
        valueEn={form[`${config.name}En`] || ''}
        onChangeZh={(v) => onValuesChange(config.name, { ...values, zh: v })}
        onChangeEn={(v) => onValuesChange(config.name, { ...values, en: v })}
        values={values}
        onValuesChange={(v) => onValuesChange(config.name, v)}
        type={kind as 'text' | 'textarea' | 'richtext'}
        placeholder={config.placeholder}
        placeholderEn={config.placeholderEn}
        rows={config.rows}
        height={config.height}
        required={config.required}
        capitalize={config.capitalize}
        richTextEditor={kind === 'richtext' ? RichTextEditorLoader : undefined}
      />
    </div>
  )
}
