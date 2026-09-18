'use client';

import { useState, useEffect, useCallback } from 'react';
import MultiLangFieldV2 from './MultiLangFieldV2';

interface MultiLangFieldAdapterProps {
  label: string;
  valueZh: string;
  valueEn: string;
  onChangeZh: (value: string) => void;
  onChangeEn: (value: string) => void;
  renderEditor: (value: string, onChange: (value: string) => void, lang: string, readOnly: boolean) => React.ReactNode;
  onTranslate?: (zhValue: string, targetLang: string) => Promise<string>;
  autoTranslate?: boolean;
  translateButtonText?: string;
  // 新增：支持所有语言的值同步
  values?: Record<string, string>;
  onValuesChange?: (values: Record<string, string>) => void;
}

/**
 * MultiLangField适配器
 * 将旧版的valueZh/valueEn接口转换为V2的多语言值对象接口
 * 用于快速推广V2到现有页面，无需修改数据库结构
 */
export default function MultiLangFieldAdapter({
  label,
  valueZh,
  valueEn,
  onChangeZh,
  onChangeEn,
  renderEditor,
  onTranslate,
  autoTranslate = false,
  translateButtonText,
  values: externalValues,
  onValuesChange,
}: MultiLangFieldAdapterProps) {
  // 将分开的zh/en值转换为多语言值对象
  const [values, setValues] = useState<Record<string, string>>({
    zh: valueZh,
    en: valueEn,
    ...(externalValues || {}),
  });

  // 同步外部valueZh/valueEn变化
  useEffect(() => {
    setValues(prev => {
      const newValues = { ...prev, zh: valueZh, en: valueEn };
      if (externalValues) {
        Object.assign(newValues, externalValues);
      }
      return newValues;
    });
  }, [valueZh, valueEn, externalValues]);

  // 处理单个语言值变化
  const handleChange = useCallback((lang: string, value: string) => {
    setValues(prev => {
      const newValues = { ...prev, [lang]: value };
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
      // 已有整组写回通道：全量写回一次即可，禁止再调 onChangeZh/onChangeEn 二次写回
      // （它们基于渲染闭包的旧 values，会把同一批刚写入的其他语种覆盖成旧值/空）
      onValuesChange(newValues);
    } else {
      // 无 onValuesChange 时退化为写回 zh/en
      if (newValues.zh !== undefined) onChangeZh(newValues.zh);
      if (newValues.en !== undefined) onChangeEn(newValues.en);
    }
  }, [onChangeZh, onChangeEn, onValuesChange]);

  return (
    <MultiLangFieldV2
      label={label}
      values={values}
      onChange={handleChange}
      onChangeAll={handleChangeAll}
      renderEditor={renderEditor}
      onTranslate={onTranslate}
      autoTranslate={autoTranslate}
      defaultLang="zh"
    />
  );
}
