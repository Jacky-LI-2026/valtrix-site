"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Languages, Loader2, CheckCircle, Globe } from 'lucide-react'
import { translateJsonArray, throttleTranslate } from '@/lib/translate-utils'

// 根据目标语言 + 英文字段名推导多语言字段名（titleEn -> titleJa/...）
function langFieldName(lang: string, targetField: string): string {
  const map: Record<string, string> = {
    en: targetField,
    ja: targetField.replace(/En$/, 'Ja') || targetField + 'Ja',
    ko: targetField.replace(/En$/, 'Ko') || targetField + 'Ko',
    fr: targetField.replace(/En$/, 'Fr') || targetField + 'Fr',
    ar: targetField.replace(/En$/, 'Ar') || targetField + 'Ar',
    de: targetField.replace(/En$/, 'De') || targetField + 'De',
    es: targetField.replace(/En$/, 'Es') || targetField + 'Es',
    ru: targetField.replace(/En$/, 'Ru') || targetField + 'Ru',
    pt: targetField.replace(/En$/, 'Pt') || targetField + 'Pt',
    it: targetField.replace(/En$/, 'It') || targetField + 'It',
  }
  return map[lang] || targetField
}

// 调用翻译API
async function callTranslate(text: string, lang: string, capitalize = false): Promise<any> {
  const res = await fetch('/api/admin/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLang: lang, capitalize }),
  })
  return res.json()
}

interface AutoTranslateBarProps {
  // 需要自动翻译的字段映射：中文字段名 -> 英文字段名
  fieldMap: Record<string, string>
  // 获取当前表单值
  getFormValues: () => Record<string, any>
  // 更新表单值
  updateFormValue: (field: string, value: any) => void
  // 支持的语言列表
  languages?: { code: string; name: string }[]
  // 英文翻译结果是否首字母大写（标题类内容）。true=全部简单文本字段；数组=仅指定中文字段名
  capitalize?: boolean | string[]
}

const DEFAULT_LANGUAGES = [
  { code: 'en', name: '英文' },
  { code: 'ja', name: '日文' },
  { code: 'ko', name: '韩文' },
  { code: 'de', name: '德文' },
  { code: 'fr', name: '法文' },
]

export default function AutoTranslateBar({
  fieldMap,
  getFormValues,
  updateFormValue,
  languages,
  capitalize = false,
}: AutoTranslateBarProps) {
  const [autoTranslate, setAutoTranslate] = useState(false)
  const [targetLangs, setTargetLangs] = useState<string[]>(['en'])
  const [translating, setTranslating] = useState(false)
  const [lastTranslated, setLastTranslated] = useState('')
  const [langList, setLangList] = useState(languages || DEFAULT_LANGUAGES)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const translateTimer = useRef<NodeJS.Timeout | null>(null)
  const previousValues = useRef<Record<string, string>>({})
  // 使用useRef存储回调，避免引用变化导致无限循环
  const getFormValuesRef = useRef(getFormValues)
  const updateFormValueRef = useRef(updateFormValue)
  const fieldMapRef = useRef(fieldMap)
  const autoTranslateRef = useRef(autoTranslate)
  const targetLangsRef = useRef(targetLangs)
  const capitalizeRef = useRef(capitalize)

  // 同步ref
  useEffect(() => { getFormValuesRef.current = getFormValues }, [getFormValues])
  useEffect(() => { updateFormValueRef.current = updateFormValue }, [updateFormValue])
  useEffect(() => { fieldMapRef.current = fieldMap }, [fieldMap])
  useEffect(() => { autoTranslateRef.current = autoTranslate }, [autoTranslate])
  useEffect(() => { targetLangsRef.current = targetLangs }, [targetLangs])
  useEffect(() => { capitalizeRef.current = capitalize }, [capitalize])

  // 从语种管理API获取启用的语种列表
  useEffect(() => {
    if (languages && languages.length > 0) {
      setLangList(languages)
      return
    }
    fetch('/api/admin/languages')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const activeLangs = data
            .filter((l: any) => l.isActive)
            .map((l: any) => ({ code: l.code, name: l.name }))
          if (activeLangs.length > 0) {
            setLangList(activeLangs)
            // 默认选择所有非中文的语种
            const nonZhLangs = activeLangs.filter((l: any) => l.code !== 'zh').map((l: any) => l.code)
            if (nonZhLangs.length > 0) {
              setTargetLangs(nonZhLangs)
            }
          }
        }
      })
      .catch(() => {})
  }, [languages])

  // 翻译单个字段到多个目标语言
  const translateField = useCallback(async (sourceField: string, targetField: string, value: any, langs: string[], cap = false) => {
    // 处理空值
    if (value === null || value === undefined || value === '') {
      for (const lang of langs) {
        const fieldName = langFieldName(lang, targetField)
        updateFormValueRef.current(fieldName, Array.isArray(value) ? [] : '')
      }
      return
    }

    // 数组/对象字段：form 中为 JSON 字符串（如 "[\"...\"]"），需按 JSON 数组整体翻译。
    // （此前仅判断 Array.isArray(value)，而 form 里数组字段是 JSON 字符串，
    //   导致数组字段被当普通文本整体翻译 → 漏翻/乱码）
    const looksLikeJson =
      typeof value === 'string' &&
      /^\s*[\[{]/.test(value) &&
      (() => {
        try {
          const p = JSON.parse(value)
          return Array.isArray(p) || (typeof p === 'object' && p !== null)
        } catch {
          return false
        }
      })()

    // 处理数组或对象类型的字段（复杂JSON字段，如内容块）
    if (Array.isArray(value) || (typeof value === 'object' && value !== null) || looksLikeJson) {
      const jsonStr = typeof value === 'string' ? value : JSON.stringify(value)
      for (const lang of langs) {
        try {
          const translated = await translateJsonArray(jsonStr, lang)
          const fieldName = langFieldName(lang, targetField)
          // 保存为JSON字符串，符合MultiLangFieldV2组件的类型定义
          updateFormValueRef.current(fieldName, translated)
        } catch (error) {
          console.error(`翻译JSON字段 ${sourceField} 到 ${lang} 失败:`, error)
        }
      }
      return
    }

    // 处理字符串类型的字段（简单文本字段）
    const text = typeof value === 'string' ? value : String(value || '')
    if (!text || text.trim() === '') {
      return
    }

    for (const lang of langs) {
      try {
        // 全局节流（与数组翻译/自动翻译共享同一时间戳，跨字段生效）
        await throttleTranslate()
        let data = await callTranslate(text, lang, cap)
        // 限流返回原文（fallback）时，退避重试一次
        if (data.success && data.provider === 'fallback') {
          await new Promise(resolve => setTimeout(resolve, 1200))
          await throttleTranslate()
          data = await callTranslate(text, lang, cap)
        }
        // 仅在翻译真正成功时写回；provider=fallback 表示返回原文（如限流），
        // 此时不覆盖该语种已有内容，避免"日文变中文"的假象
        if (data.success && data.provider !== 'fallback') {
          const fieldName = langFieldName(lang, targetField)
          updateFormValueRef.current(fieldName, data.translatedText)
        }
      } catch (error) {
        console.error(`翻译字段 ${sourceField} 到 ${lang} 失败:`, error)
      }
    }
  }, [])

  // 翻译所有字段（手动"一键翻译全部"随时可执行，不依赖自动翻译开关）
  const translateAll = useCallback(async () => {
    setTranslating(true)
    const values = getFormValuesRef.current()
    const fMap = fieldMapRef.current
    const langs = targetLangsRef.current

    if (langs.length === 0) {
      setTranslating(false)
      return
    }

    for (const [sourceField, targetField] of Object.entries(fMap)) {
      const sourceValue = values[sourceField]
      // capitalize: true=全部简单文本字段；数组=仅指定中文字段名
      const cap = Array.isArray(capitalizeRef.current) ? capitalizeRef.current.includes(sourceField) : !!capitalizeRef.current
      // 传递原始值给translateField函数，让它根据值的类型选择相应的翻译函数
      await translateField(sourceField, targetField, sourceValue, langs, cap)
    }

    setTranslating(false)
    setLastTranslated(new Date().toLocaleTimeString())
  }, [translateField])

  // 监听中文输入变化，自动翻译（防抖）——仅"自动翻译"开启时生效
  useEffect(() => {
    const checkChanges = () => {
      if (!autoTranslateRef.current) return
      const values = getFormValuesRef.current()
      const fMap = fieldMapRef.current
      let hasChange = false

      for (const sourceField of Object.keys(fMap)) {
        const currentValue = values[sourceField] || ''
        const text = typeof currentValue === 'string' ? currentValue : String(currentValue || '')
        if (previousValues.current[sourceField] !== text) {
          hasChange = true
          previousValues.current[sourceField] = text
        }
      }

      if (hasChange) {
        if (translateTimer.current) clearTimeout(translateTimer.current)
        translateTimer.current = setTimeout(() => {
          translateAll()
        }, 1500) // 1.5秒防抖
      }
    }

    const interval = setInterval(checkChanges, 500)
    return () => {
      clearInterval(interval)
      if (translateTimer.current) clearTimeout(translateTimer.current)
    }
  }, [translateAll])

  return (
    <div className="mb-6 rounded-lg border border-[#CC0000]/15 bg-gradient-to-r from-red-50/80 to-rose-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#CC0000] shadow-sm">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">多语言自动翻译</h3>
            <p className="text-xs text-gray-500">输入中文时自动翻译，英文内容可手动修改</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 语言选择（多选） */}
          <div className="flex items-center gap-2 relative">
            <label className="text-xs text-gray-600">目标语言:</label>
            <button
              type="button"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white min-w-[120px] text-left flex items-center justify-between"
            >
              <span className="truncate">
                {targetLangs.length === 0 ? '请选择' : 
                 targetLangs.length === 1 ? langList.find(l => l.code === targetLangs[0])?.name || targetLangs[0] :
                 `已选${targetLangs.length}种`}
              </span>
              <span className="ml-2 text-gray-400">▼</span>
            </button>
            {showLangDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
                <div className="p-2 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      const nonZhLangs = langList.filter(l => l.code !== 'zh').map(l => l.code)
                      setTargetLangs(nonZhLangs)
                    }}
                    className="text-xs text-[#CC0000] transition-colors hover:text-[#aa0000]"
                  >
                    全选（除中文）
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetLangs([])}
                    className="text-xs text-gray-500 hover:text-gray-700 ml-3"
                  >
                    清空
                  </button>
                </div>
                {langList.filter(l => l.code !== 'zh').map((lang) => (
                  <label
                    key={lang.code}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={targetLangs.includes(lang.code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetLangs([...targetLangs, lang.code])
                        } else {
                          setTargetLangs(targetLangs.filter(c => c !== lang.code))
                        }
                      }}
                      className="h-4 w-4 rounded accent-[#CC0000]"
                    />
                    <span>{lang.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 自动翻译开关 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
              className="h-4 w-4 rounded accent-[#CC0000]"
            />
            <span className="text-sm text-gray-700">自动翻译</span>
          </label>

          {/* 手动翻译按钮 */}
          <button
            type="button"
            onClick={translateAll}
            disabled={translating}
            className="inline-flex items-center gap-2 rounded-md bg-[#CC0000] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#aa0000] disabled:opacity-50"
          >
            {translating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                翻译中...
              </>
            ) : (
              <>
                <Languages size={16} />
                一键翻译全部
              </>
            )}
          </button>
        </div>
      </div>

      {/* 翻译状态 */}
      <div className="mt-3 flex items-center gap-2 text-xs">
        {translating ? (
          <span className="flex items-center gap-1 text-[#CC0000]">
            <Loader2 size={12} className="animate-spin" />
            正在自动翻译...
          </span>
        ) : lastTranslated ? (
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle size={12} />
            上次翻译: {lastTranslated}
          </span>
        ) : (
          <span className="text-gray-400">
            {autoTranslate ? '自动翻译已开启，输入中文后1.5秒自动翻译' : '自动翻译已关闭'}
          </span>
        )}
      </div>
    </div>
  )
}
