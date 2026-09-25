'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import MultiLangFieldV2 from './MultiLangFieldV2';
import AiFieldButton from './AiFieldButton';
import CharCounter from './CharCounter';
import { throttleTranslate } from '@/lib/translate-utils';

interface MultiLangTextFieldProps {
  label: string;
  valueZh: string;
  valueEn: string;
  onChangeZh: (value: string) => void;
  onChangeEn: (value: string) => void;
  type?: 'text' | 'textarea' | 'richtext';
  placeholder?: string;
  placeholderEn?: string;
  rows?: number;
  height?: number;
  required?: boolean;
  autoTranslate?: boolean;
  richTextEditor?: React.ComponentType<any>;
  // 新增：支持所有语言的值同步
  values?: Record<string, string>;
  onValuesChange?: (values: Record<string, string>) => void;
  // 新增：是否将英文翻译结果的首字母大写（用于标题类内容）
  capitalize?: boolean;
  /** 各语种的字数上限（来自数据库列宽，经 /meta 下发）；用于输入框 maxLength + 「已用 x / 上限 y」 */
  maxLengthByLang?: Record<string, number>;
}

/**
 * 多语言简单文本组件
 * 用于标题、摘要、正文等简单文本字段的多语言编辑
 * 内部使用MultiLangFieldV2，支持动态语种和非中文只读自动翻译
 */
export default function MultiLangTextField({
  label,
  valueZh,
  valueEn,
  onChangeZh,
  onChangeEn,
  type = 'text',
  placeholder = '',
  placeholderEn = '',
  rows = 3,
  height = 300,
  required = false,
  autoTranslate = false,
  richTextEditor: RichTextEditor,
  values: externalValues,
  onValuesChange,
  capitalize = false,
  maxLengthByLang,
}: MultiLangTextFieldProps) {
  const LANG_SHOW: Record<string, string> = {
    zh: '中文', en: 'English', ja: '日本語', ko: '한국어', fr: 'Français', ar: 'العربية',
  };
  // 将分开的zh/en值转换为多语言值对象
  const [values, setValues] = useState<Record<string, string>>({
    zh: valueZh,
    en: valueEn,
    ...(externalValues || {}),
  });

  // 同步外部valueZh/valueEn/externalValues变化
  useEffect(() => {
    setValues(prev => {
      const newValues = { ...prev };
      // 同步zh和en
      if (newValues.zh !== valueZh) newValues.zh = valueZh;
      if (newValues.en !== valueEn) newValues.en = valueEn;
      // 同步其他语种
      if (externalValues) {
        Object.keys(externalValues).forEach(key => {
          if (key !== 'zh' && key !== 'en' && newValues[key] !== externalValues[key]) {
            newValues[key] = externalValues[key];
          }
        });
      }
      return newValues;
    });
  }, [valueZh, valueEn, externalValues]);

  // 处理单个语言值变化
  const handleChange = useCallback((lang: string, value: string) => {
    setValues(prev => {
      const newValues = { ...prev, [lang]: value };
      // 同步到外部状态
      if (onValuesChange) onValuesChange(newValues);
      return newValues;
    });
    
    if (lang === 'zh') {
      onChangeZh(value);
    } else if (lang === 'en') {
      onChangeEn(value);
    }
  }, [onChangeZh, onChangeEn, onValuesChange]);

  // 处理所有语言值变化（自动翻译/一键翻译时使用）
  const handleChangeAll = useCallback((newValues: Record<string, string>) => {
    setValues(newValues);
    if (onValuesChange) {
      // 已有整组写回通道（父组件 form 含全部语种键）：全量写回即可，
      // 切勿再用 onChangeZh/onChangeEn 二次写回——它们基于渲染闭包的旧 values，
      // 会把同一批里刚写入的其他语种（如 ja）覆盖成旧值，导致一键翻译"不生效"。
      onValuesChange(newValues);
    } else {
      // 无 onValuesChange 时退化为写回 zh/en
      if (newValues.zh !== undefined) onChangeZh(newValues.zh);
      if (newValues.en !== undefined) onChangeEn(newValues.en);
    }
  }, [onChangeZh, onChangeEn, onValuesChange]);

  // 简单文本翻译（走全局节流，限流失败自动重试一次）
  const handleTranslate = useCallback(async (zhValue: string, targetLang: string): Promise<string> => {
    if (!zhValue || !zhValue.trim()) return '';
    try {
      await throttleTranslate();
      let data = await callTranslate(zhValue, targetLang);
      // 限流返回原文（fallback）时，退避重试一次
      if (data.success && data.provider === 'fallback') {
        await new Promise(resolve => setTimeout(resolve, 1200));
        await throttleTranslate();
        data = await callTranslate(zhValue, targetLang);
      }
      // 仅在真正翻译成功时返回；fallback 返回原文时不覆盖已有内容
      if (data.success && data.provider !== 'fallback' && data.translatedText) {
        return data.translatedText;
      }
    } catch (e) {
      console.error('翻译失败:', e);
    }
    return zhValue; // 翻译失败返回原文
  }, [capitalize]);

  async function callTranslate(text: string, lang: string): Promise<any> {
    const res = await fetch('/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang: lang, capitalize }),
    });
    return res.json();
  }

  // 渲染编辑器
  const renderEditor = (value: string, onChange: (value: string) => void, lang: string, readOnly: boolean) => {
    const isZh = lang === 'zh';
    const ph = isZh ? placeholder : (placeholderEn || placeholder);
    // 数据库列宽上限（该语种）；没有上限（Text 列）时为 undefined ⇒ 不显示提示、不加 maxLength
    const max = maxLengthByLang?.[lang];

    if (type === 'richtext' && RichTextEditor) {
      return (
        <div className={readOnly ? 'opacity-80 pointer-events-none' : ''}>
          <RichTextEditor
            value={value}
            onChange={onChange}
            placeholder={ph}
            height={height}
            aiLabel={label || '正文内容'}
          />
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div className={readOnly ? 'opacity-80 pointer-events-none' : ''}>
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            maxLength={max}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-y disabled:bg-gray-50 disabled:text-gray-500"
            placeholder={ph}
          />
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <CharCounter value={value} max={max} />
            <AiFieldButton label={label} langLabel={LANG_SHOW[lang] || lang.toUpperCase()} value={value} onResult={onChange} />
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex gap-2 items-stretch">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
            maxLength={max}
            required={required && isZh}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-500"
            placeholder={ph}
          />
          {!readOnly && (
            <AiFieldButton label={label} langLabel={LANG_SHOW[lang] || lang.toUpperCase()} value={value} onResult={onChange} />
          )}
        </div>
        {/* 字数提示：有数据库上限时才显示（Title/Subtitle/SEO 标题这类 VarChar 列） */}
        {max ? <div className="mt-1 flex justify-end"><CharCounter value={value} max={max} /></div> : null}
      </div>
    );
  };

  return (
    <MultiLangFieldV2
      label={label}
      values={values}
      onChange={handleChange}
      onChangeAll={handleChangeAll}
      renderEditor={renderEditor}
      onTranslate={handleTranslate}
      autoTranslate={autoTranslate}
      defaultLang="zh"
    />
  );
}
