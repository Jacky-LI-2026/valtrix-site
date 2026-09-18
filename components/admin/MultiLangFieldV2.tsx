'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Languages, Sparkles, Lock, RefreshCw } from 'lucide-react';
import { throttleTranslate } from '@/lib/translate-utils';

interface Language {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface MultiLangFieldV2Props {
  label: string;
  values: Record<string, string>; // { zh: '', en: '', ja: '', ... }
  onChange: (lang: string, value: string) => void;
  onChangeAll?: (values: Record<string, string>) => void;
  renderEditor: (value: string, onChange: (value: string) => void, lang: string, readOnly: boolean) => React.ReactNode;
  onTranslate?: (zhValue: string, targetLang: string) => Promise<string>;
  autoTranslate?: boolean; // 是否自动翻译（中文变化时自动翻译到所有非中文语种）
  defaultLang?: string; // 默认语言，默认zh
}

export default function MultiLangFieldV2({
  label,
  values,
  onChange,
  onChangeAll,
  renderEditor,
  onTranslate,
  autoTranslate = false, // 是否自动翻译（中文变化时自动翻译到所有非中文语种），默认关闭
  defaultLang = 'zh',
}: MultiLangFieldV2Props) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currentLang, setCurrentLang] = useState<string>(defaultLang);
  const [translating, setTranslating] = useState<string | null>(null); // 正在翻译的目标语言
  const [autoTranslating, setAutoTranslating] = useState(false);
  const autoTranslatingRef = useRef(false); // 使用ref跟踪翻译状态，避免函数重新创建
  const valuesRef = useRef(values); // 使用ref跟踪最新的values状态
  const [zhContent, setZhContent] = useState(values['zh'] || '');

  // 同步values到ref
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // 从API获取启用的语种列表
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await fetch('/api/admin/languages');
        if (res.ok) {
          const data = await res.json();
          // 只显示启用的语种
          const activeLangs = data.filter((l: Language) => l.isActive);
          setLanguages(activeLangs);
          // 如果当前语言不在启用列表中，切换到默认语言
          if (!activeLangs.find((l: Language) => l.code === currentLang)) {
            const defaultLangItem = activeLangs.find((l: Language) => l.isDefault) || activeLangs[0];
            if (defaultLangItem) setCurrentLang(defaultLangItem.code);
          }
        }
      } catch (e) {
        console.error('获取语种列表失败:', e);
        // 降级：使用默认的中英文
        setLanguages([
          { code: 'zh', name: '中文', nameEn: 'Chinese', flag: '🇨🇳', isDefault: true, isActive: true, sortOrder: 1 },
          { code: 'en', name: '英文', nameEn: 'English', flag: '🇺🇸', isDefault: false, isActive: true, sortOrder: 2 },
        ]);
      }
    };
    fetchLanguages();
  }, []);

  // 跟踪中文内容变化，用于自动翻译
  useEffect(() => {
    setZhContent(values['zh'] || '');
  }, [values['zh']]);

  // 自动翻译：中文内容变化时，自动翻译到所有启用的非中文语种
  const handleAutoTranslate = useCallback(async () => {
    console.log('handleAutoTranslate 被调用');
    console.log('autoTranslate:', autoTranslate);
    console.log('onTranslate:', typeof onTranslate);
    console.log('zhContent:', zhContent?.substring(0, 100));
    console.log('autoTranslatingRef:', autoTranslatingRef.current);

    if (!autoTranslate || !onTranslate || !zhContent || autoTranslatingRef.current) {
      console.log('条件不满足，返回');
      return;
    }
    
    const nonZhLangs = languages.filter(l => l.code !== 'zh');
    if (nonZhLangs.length === 0) return;

    console.log(`开始自动翻译，目标语言: ${nonZhLangs.map(l => l.code).join(', ')}`);

    autoTranslatingRef.current = true;
    setAutoTranslating(true);
    try {
      // 先收集所有语种的翻译结果
      const allResults: Record<string, string> = { zh: zhContent };
      for (let i = 0; i < nonZhLangs.length; i++) {
        const lang = nonZhLangs[i];
        try {
          console.log(`翻译到 ${lang.name}...`);
          const translated = await onTranslate(zhContent, lang.code);
          if (translated && translated.trim()) {
            allResults[lang.code] = translated;
            console.log(`翻译到 ${lang.name} 完成，结果: ${translated?.substring(0, 50)}`);
          } else {
            allResults[lang.code] = values[lang.code] || '';
          }
        } catch (e) {
          console.error(`翻译到${lang.name}失败:`, e);
          allResults[lang.code] = values[lang.code] || '';
        }
        
        // 全局节流（与字符串/数组/顶部翻译共享同一时间戳，避免百度 54003 限流）
        if (i < nonZhLangs.length - 1) {
          await throttleTranslate();
        }
      }
      // 一次性更新所有语种的翻译结果
      if (onChangeAll) {
        onChangeAll(allResults);
      } else {
        for (const lang of nonZhLangs) {
          onChange(lang.code, allResults[lang.code]);
        }
      }
      console.log('自动翻译完成');
    } finally {
      autoTranslatingRef.current = false;
      setAutoTranslating(false);
    }
  }, [autoTranslate, onTranslate, zhContent, languages, onChange]);

  // 手动翻译到指定语言
  const handleTranslateTo = async (targetLang: string) => {
    if (!onTranslate || !zhContent || translating) return;
    setTranslating(targetLang);
    try {
      const translated = await onTranslate(zhContent, targetLang);
      onChange(targetLang, translated);
      setCurrentLang(targetLang);
    } catch (e) {
      console.error(`翻译到${targetLang}失败:`, e);
    } finally {
      setTranslating(null);
    }
  };

  // 翻译到所有非中文语种
  const handleTranslateAll = async () => {
    if (!onTranslate || !zhContent || translating) return;
    const nonZhLangs = languages.filter(l => l.code !== 'zh');
    if (nonZhLangs.length === 0) return;

    setTranslating('all');
    try {
      // 先收集所有语种的翻译结果
      const allResults: Record<string, string> = { zh: zhContent };
      for (let i = 0; i < nonZhLangs.length; i++) {
        const lang = nonZhLangs[i];
        try {
          console.log(`翻译到 ${lang.name}...`);
          const translated = await onTranslate(zhContent, lang.code);
          if (translated && translated.trim()) {
            allResults[lang.code] = translated;
            console.log(`翻译到 ${lang.name} 完成`);
          } else {
            console.log(`翻译到 ${lang.name} 结果为空，保留原文`);
            allResults[lang.code] = values[lang.code] || '';
          }
        } catch (e) {
          console.error(`翻译到${lang.name}失败:`, e);
          allResults[lang.code] = values[lang.code] || '';
        }
        
        // 全局节流（与字符串/数组/顶部翻译共享同一时间戳，避免百度 54003 限流）
        if (i < nonZhLangs.length - 1) {
          await throttleTranslate();
        }
      }
      // 一次性更新所有语种的翻译结果
      if (onChangeAll) {
        onChangeAll(allResults);
      } else {
        // 如果没有onChangeAll，则逐个更新
        for (const lang of nonZhLangs) {
          onChange(lang.code, allResults[lang.code]);
        }
      }
      console.log('一键翻译全部完成');
    } finally {
      setTranslating(null);
    }
  };

  const isZh = currentLang === 'zh';
  const currentLangInfo = languages.find(l => l.code === currentLang);
  const hasContent = (lang: string) => values[lang] && values[lang] !== '[]' && values[lang] !== '""' && values[lang].length > 0;

  return (
    <div className="col-span-2 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
          <Languages size={16} className="text-gray-400" />
          {label}
          {autoTranslate && (
            <span className="text-xs text-gray-400 font-normal">（非中文自动翻译）</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          {/* 自动翻译按钮 */}
          {autoTranslate && onTranslate && (
            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={autoTranslating || !zhContent}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="根据中文内容自动翻译到所有启用的非中文语种"
            >
              <RefreshCw size={14} className={autoTranslating ? 'animate-spin' : ''} />
              {autoTranslating ? '自动翻译中...' : '自动翻译全部'}
            </button>
          )}
          {/* 一键翻译到所有语言 */}
          {onTranslate && !autoTranslate && (
            <button
              type="button"
              onClick={handleTranslateAll}
              disabled={translating !== null || !zhContent}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={14} className={translating === 'all' ? 'animate-spin' : ''} />
              {translating === 'all' ? '翻译中...' : '一键翻译全部'}
            </button>
          )}
        </div>
      </div>

      {/* 语言切换标签 */}
      <div className="flex items-center gap-1 border-b border-gray-200 pb-2 flex-wrap">
        {languages.map((lang) => {
          const isActive = currentLang === lang.code;
          const hasLangContent = hasContent(lang.code);
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setCurrentLang(lang.code)}
              className={`px-3 py-1.5 text-sm rounded-t-md transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-red-600 text-white'
                  : hasLangContent
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.code !== 'zh' && (
                <Lock size={10} className={isActive ? 'text-white/70' : 'text-gray-400'} />
              )}
            </button>
          );
        })}
      </div>

      {/* 非中文语言的提示和单独翻译按钮 */}
      {!isZh && currentLangInfo && (
        <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <Languages size={14} />
            <span>{currentLangInfo.name}内容由中文自动翻译生成，可手动修改调整</span>
          </div>
          {onTranslate && (
            <button
              type="button"
              onClick={() => handleTranslateTo(currentLang)}
              disabled={translating === currentLang || !zhContent}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors disabled:opacity-50"
            >
              <Sparkles size={12} className={translating === currentLang ? 'animate-spin' : ''} />
              {translating === currentLang ? '翻译中...' : `重新翻译为${currentLangInfo.name}`}
            </button>
          )}
        </div>
      )}

      {/* 当前语言的编辑器 */}
      <div className="pt-2 relative" key={`editor-${currentLang}`}>
        {renderEditor(
          values[currentLang] || '',
          (value: string) => onChange(currentLang, value),
          currentLang,
          false // 所有语种都可以编辑
        )}
      </div>

      {/* 翻译进度提示 */}
      {(translating || autoTranslating) && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw size={12} className="animate-spin" />
          <span>正在翻译内容，请稍候...</span>
        </div>
      )}
    </div>
  );
}
