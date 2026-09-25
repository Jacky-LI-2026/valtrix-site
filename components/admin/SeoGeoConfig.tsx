"use client"

import { Search, MapPin, Lightbulb, Sparkles, Loader2, RefreshCw, CheckSquare, Square } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { GEO_REGIONS, getCitiesByRegion } from '@/lib/geo-data'
import CharCounter from './CharCounter'

interface SeoGeoConfigProps {
  seoTitle: string
  seoTitleEn?: string
  seoDescription: string
  seoDescriptionEn?: string
  seoKeywords: string
  seoKeywordsEn?: string
  geoRegion: string
  geoCity: string
  onChange: (field: string, value: string) => void
  /**
   * 字段字数上限（可选）：`{ seoTitle: 200, seoTitleEn: 200 }` —— 由编辑页从
   * `/api/admin/content/[type]/meta` 的列宽下发，用于输入框 `maxLength` + 「已用 x / 上限 y」。
   * 未提供的字段（Text 列，如 关键词/描述/城市清单）不加限制。
   */
  maxLengthByField?: Record<string, number>
  /**
   * 整个表单（可选）：用于读写**多语种 SEO**（seoTitleEn/Ja/Ko/Fr/Ar 等）。
   * 传入后本组件的多语言区直接从 form 取名，父表单只需 `handleChange` 写回。
   */
  form?: Record<string, any>
  // 用于关键词提取的源文本
  sourceText?: string
  sourceTitle?: string
  sourceSummary?: string
  sourceImageAlt?: string
  // 是否自动填充
  autoFill?: boolean
}

// 行业相关关键词库（模拟大数据网络提取）
const INDUSTRY_KEYWORDS = [
  '工业阀门', '闸阀', '球阀', '蝶阀', '止回阀',
  '安全阀', '调节阀', '不锈钢阀门', '船用阀门', '流体控制',
  '工业阀门', '闸阀', '球阀', '蝶阀', '止回阀',
  '安全阀', '调节阀', '不锈钢阀门', '法兰连接', '流体控制',
  '精密流体元件', '卡套接头', '管阀件', '石油化工', '水处理',
  '天然气管道', '电力能源', '船用阀门', '低温阀门', '高压阀门',
  'VALTRIX', '阀门厂家', '工业阀门制造商', '流体系统解决方案', '阀门供应商',
]
/**
 * 多语种 SEO（owner 2026-09-21：「产品级页面端的 SEO 可以多语言吗？」）
 * 库里 `seoTitle/seoDescription/seoKeywords` 本来就各有 6 个语种列，前台
 * `buildSeoMetadata` 也是按 `seoTitle<语种>` 取值的 —— 缺的只是**后台编辑界面**。
 */
const SEO_I18N_LANGS: { code: string; label: string; suffix: string }[] = [
  { code: 'en', label: 'English', suffix: 'En' },
  { code: 'ja', label: '日本語', suffix: 'Ja' },
  { code: 'ko', label: '한국어', suffix: 'Ko' },
  { code: 'fr', label: 'Français', suffix: 'Fr' },
  { code: 'ar', label: 'العربية', suffix: 'Ar' },
]

export default function SeoGeoConfig({
  seoTitle,
  seoTitleEn = '',
  seoDescription,
  seoDescriptionEn = '',
  seoKeywords,
  seoKeywordsEn = '',
  geoRegion,
  geoCity,
  onChange,
  maxLengthByField,
  form,
  sourceText = '',
  sourceTitle = '',
  sourceSummary = '',
  sourceImageAlt = '',
  autoFill = true,
}: SeoGeoConfigProps) {
  const [extracting, setExtracting] = useState(false)
  const [aiExtracting, setAiExtracting] = useState(false)
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  const [aiSuggestedKeywords, setAiSuggestedKeywords] = useState<string[]>([])
  const [hasAutoFilled, setHasAutoFilled] = useState(false)
  // 英文SEO关键词自动翻译相关状态
  const [translatingKeywords, setTranslatingKeywords] = useState(false)
  const [englishKeywordsEdited, setEnglishKeywordsEdited] = useState(false)
  // 多语种 SEO：当前编辑语种 + 一键翻译状态
  const [seoI18nLang, setSeoI18nLang] = useState('en')
  const [seoI18nBusy, setSeoI18nBusy] = useState(false)
  const [seoI18nMsg, setSeoI18nMsg] = useState('')

  /** 取某键的值：优先整表单 `form`，回退到组件自身的 props（兼容其它调用方） */
  const valOf = (key: string): string => {
    if (form && key in form) return String((form as any)[key] ?? '')
    if (key === 'seoTitle') return seoTitle || ''
    if (key === 'seoDescription') return seoDescription || ''
    if (key === 'seoKeywords') return seoKeywords || ''
    return ''
  }

  /**
   * 一键翻译：中文的 SEO 标题/描述/关键词 → 英/日/韩/法/阿
   * 与后台其它表单同一接口（POST /api/admin/translate），逐条回填。
   */
  const translateSeoI18n = async () => {
    const bases = [
      { base: 'seoTitle', zh: valOf('seoTitle'), capitalize: true },
      { base: 'seoDescription', zh: valOf('seoDescription'), capitalize: false },
      { base: 'seoKeywords', zh: valOf('seoKeywords'), capitalize: false },
    ]
    if (!bases.some((b) => b.zh.trim())) {
      setSeoI18nMsg('请先填写中文的 SEO 标题/描述/关键词')
      return
    }
    setSeoI18nBusy(true)
    setSeoI18nMsg('')
    try {
      for (const l of SEO_I18N_LANGS) {
        for (const b of bases) {
          if (!b.zh.trim()) continue
          const res = await fetch('/api/admin/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: b.zh, targetLang: l.code, capitalize: b.capitalize }),
          })
          const d = await res.json().catch(() => ({}))
          if (!res.ok || !d.translatedText) throw new Error(`${l.label} ${b.base} 翻译失败：${d.error || res.status}`)
          onChange(`${b.base}${l.suffix}`, d.translatedText)
        }
      }
      setSeoI18nMsg(`已翻译 ${SEO_I18N_LANGS.length} 个语种`)
    } catch (e: any) {
      setSeoI18nMsg(e?.message || '翻译失败')
    } finally {
      setSeoI18nBusy(false)
    }
  }
  // 使用useRef存储源文本和回调，避免引用变化导致无限循环
  const sourceTitleRef = useRef(sourceTitle)
  const sourceTextRef = useRef(sourceText)
  const sourceSummaryRef = useRef(sourceSummary)
  const sourceImageAltRef = useRef(sourceImageAlt)
  const onChangeRef = useRef(onChange)
  const seoKeywordsRef = useRef(seoKeywords)
  const seoKeywordsEnRef = useRef(seoKeywordsEn)
  const seoTitleEnRef = useRef(seoTitleEn)
  const seoDescriptionEnRef = useRef(seoDescriptionEn)

  useEffect(() => { sourceTitleRef.current = sourceTitle }, [sourceTitle])
  useEffect(() => { sourceTextRef.current = sourceText }, [sourceText])
  useEffect(() => { sourceSummaryRef.current = sourceSummary }, [sourceSummary])
  useEffect(() => { sourceImageAltRef.current = sourceImageAlt }, [sourceImageAlt])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { seoKeywordsRef.current = seoKeywords }, [seoKeywords])
  useEffect(() => { seoKeywordsEnRef.current = seoKeywordsEn }, [seoKeywordsEn])
  useEffect(() => { seoTitleEnRef.current = seoTitleEn }, [seoTitleEn])
  useEffect(() => { seoDescriptionEnRef.current = seoDescriptionEn }, [seoDescriptionEn])

  // 中文SEO关键词自动翻译为英文
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const translateKeywords = async () => {
      const zhKeywords = seoKeywordsRef.current?.trim()
      const enKeywords = seoKeywordsEnRef.current?.trim()

      // 如果中文关键词为空，或者英文关键词已被用户编辑且不为空，不自动翻译
      if (!zhKeywords || (englishKeywordsEdited && enKeywords)) {
        return
      }

      setTranslatingKeywords(true)
      try {
        const response = await fetch('/api/admin/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: zhKeywords,
            targetLang: 'en',
            isHtml: false,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.translatedText) {
            // 翻译后的关键词，保持逗号分隔格式
            const translated = data.translatedText
              .replace(/，/g, ',')  // 中文逗号转英文逗号
              .replace(/、/g, ',')  // 中文顿号转英文逗号
              .trim()
            onChangeRef.current('seoKeywordsEn', translated)
          }
        }
      } catch (error) {
        console.error('SEO关键词自动翻译失败:', error)
      } finally {
        setTranslatingKeywords(false)
      }
    }

    // 防抖处理，避免频繁调用翻译API
    if (seoKeywords && seoKeywords.trim()) {
      timeoutId = setTimeout(() => {
        translateKeywords()
      }, 800) // 800ms防抖
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [seoKeywords, englishKeywordsEdited])

  // 解析逗号分隔的字符串为数组
  const parseMultiValue = (value: string): string[] => {
    if (!value) return []
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }

  // 选中的地区列表
  const selectedRegions = useMemo(() => parseMultiValue(geoRegion), [geoRegion])

  // 选中的城市列表
  const selectedCities = useMemo(() => parseMultiValue(geoCity), [geoCity])

  // 切换地区选中状态
  const toggleRegion = (regionName: string) => {
    let newRegions: string[]
    if (selectedRegions.includes(regionName)) {
      newRegions = selectedRegions.filter(r => r !== regionName)
      // 移除该地区的所有城市
      const regionCities = getCitiesByRegion(regionName).map(c => c.name)
      const newCities = selectedCities.filter(c => !regionCities.includes(c))
      onChange('geoCity', newCities.join(','))
    } else {
      newRegions = [...selectedRegions, regionName]
    }
    onChange('geoRegion', newRegions.join(','))
  }

  // 全选/取消全选地区
  const toggleAllRegions = () => {
    if (selectedRegions.length === GEO_REGIONS.length) {
      onChange('geoRegion', '')
      onChange('geoCity', '')
    } else {
      const allRegions = GEO_REGIONS.map(r => r.name)
      onChange('geoRegion', allRegions.join(','))
      // 全选所有城市
      const allCities = GEO_REGIONS.flatMap(r => r.cities.map(c => c.name))
      onChange('geoCity', allCities.join(','))
    }
  }

  // 切换城市选中状态
  const toggleCity = (cityName: string) => {
    let newCities: string[]
    if (selectedCities.includes(cityName)) {
      newCities = selectedCities.filter(c => c !== cityName)
    } else {
      newCities = [...selectedCities, cityName]
    }
    onChange('geoCity', newCities.join(','))
  }

  // 全选/取消全选当前地区的城市
  const toggleAllCities = () => {
    const currentRegionCities = selectedRegions.flatMap(r => getCitiesByRegion(r).map(c => c.name))
    const allSelected = currentRegionCities.every(c => selectedCities.includes(c))
    
    if (allSelected) {
      const newCities = selectedCities.filter(c => !currentRegionCities.includes(c))
      onChange('geoCity', newCities.join(','))
    } else {
      const newCities = Array.from(new Set([...selectedCities, ...currentRegionCities]))
      onChange('geoCity', newCities.join(','))
    }
  }

  // 获取当前选中地区的所有城市
  const currentRegionCities = useMemo(() => {
    return selectedRegions.flatMap(r => getCitiesByRegion(r))
  }, [selectedRegions])

  // 清理HTML标签
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  // 获取所有源文本
  const getAllSourceText = useCallback(() => {
    return [sourceTitleRef.current, sourceSummaryRef.current, sourceImageAltRef.current, stripHtml(sourceTextRef.current)]
      .filter(Boolean)
      .join(' ')
  }, [])

  // 生成SEO标题
  const generateSeoTitle = useCallback(() => {
    const title = sourceTitleRef.current
    if (title) {
      const base = title.length > 30 ? title.substring(0, 30) : title
      return `${base} - VALTRIX专业工业阀门与流体控制设备`
    }
    return 'VALTRIX - 专业工业阀门与精密流体控制解决方案'
  }, [])

  // 生成SEO描述
  const generateSeoDescription = useCallback(() => {
    const summary = sourceSummaryRef.current || stripHtml(sourceTextRef.current).substring(0, 100)
    if (summary) {
      return `${summary} VALTRIX专注工业阀门与精密流体控制元件研发、生产与服务，提供闸阀、球阀、蝶阀、止回阀、安全阀、调节阀等全系列产品与行业解决方案。`
    }
    return 'VALTRIX专注工业阀门与精密流体控制元件研发、生产与服务，提供闸阀、球阀、蝶阀、止回阀、安全阀、调节阀等全系列阀门产品，广泛应用于石油化工、水处理、天然气、电力、冶金矿业与船舶海工等行业。'
  }, [])

  // 关键词提取功能（基于标题、摘要、图片alt、正文）
  const extractKeywords = useCallback(() => {
    setExtracting(true)
    try {
      const text = getAllSourceText().toLowerCase()
      // 停用词
      const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'i', 'me', 'my', 'mine']

      const words: string[] = []

      // 提取英文专业术语（3个字母以上）
      const englishWords = text.match(/[a-zA-Z]{3,}/g) || []
      englishWords.forEach(w => {
        if (!stopWords.includes(w) && w.length > 2) {
          words.push(w.toUpperCase())
        }
      })

      // 提取中文2-4字词
      const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || []
      const chineseText = chineseChars.join('')
      for (let len = 2; len <= 4; len++) {
        for (let i = 0; i <= chineseText.length - len; i++) {
          const word = chineseText.substring(i, i + len)
          if (!stopWords.includes(word)) {
            words.push(word)
          }
        }
      }

      // 统计词频
      const wordCount: Record<string, number> = {}
      words.forEach(w => {
        wordCount[w] = (wordCount[w] || 0) + 1
      })

      // 按词频排序，取前20个
      const sorted = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word]) => word)

      setSuggestedKeywords(sorted)
    } catch (e) {
      console.error('关键词提取失败:', e)
    } finally {
      setExtracting(false)
    }
  }, [getAllSourceText])

  // 网络大数据相关关键词推荐（模拟从网络提取强相关内容）
  const extractAiKeywords = useCallback(async () => {
    setAiExtracting(true)
    try {
      // 先尝试调用大模型API
      try {
        const allText = getAllSourceText()
        const res = await fetch('/api/admin/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `请基于以下内容，生成10个与内容强相关的SEO关键词，用逗号分隔：${allText.substring(0, 500)}`,
            targetLang: 'zh'
          }),
        })
        const data = await res.json()
        if (data.success && data.translatedText) {
          const keywords = data.translatedText
            .split(/[,，、\n]/)
            .map((k: string) => k.trim().replace(/^[\d.\s]+/, ''))
            .filter((k: string) => {
              const lenOk = k.length > 1 && k.length < 20
              // 过滤大模型返回的提示性句子（如"请基于以下内容，生成…关键词"）
              const hasPrompt = /请基于|生成.*关键词|个与内容|用逗号|以下内容|^关键词|作为.*输入/.test(k)
              // 过滤含句读/引号等标点的长句片段
              const hasPunct = /[。！？；：""''（）]/.test(k)
              return lenOk && !hasPrompt && !hasPunct
            })
            .slice(0, 10)
          if (keywords.length > 0) {
            setAiSuggestedKeywords(keywords)
            setAiExtracting(false)
            return
          }
        }
      } catch (e) {
        console.warn('大模型API调用失败，使用本地关键词库:', e)
      }

      // 大模型不可用时，从行业关键词库中筛选相关关键词
      const allText = getAllSourceText().toLowerCase()
      const relevant = INDUSTRY_KEYWORDS.filter(keyword => {
        const lowerKeyword = keyword.toLowerCase()
        // 检查关键词是否与源文本相关
        return allText.includes(lowerKeyword) ||
          lowerKeyword.includes('阀门') ||
          lowerKeyword.includes('流体') ||
          lowerKeyword.includes('阀门')
      })

      // 打乱顺序，取前10个
      const shuffled = relevant.sort(() => Math.random() - 0.5).slice(0, 10)
      setAiSuggestedKeywords(shuffled)
    } catch (e) {
      console.error('AI关键词提取失败:', e)
    } finally {
      setAiExtracting(false)
    }
  }, [getAllSourceText])

  // 一键智能填充SEO内容
  const smartFill = useCallback(() => {
    if (!seoTitle) {
      onChange('seoTitle', generateSeoTitle())
    }
    if (!seoDescription) {
      onChange('seoDescription', generateSeoDescription())
    }
    extractKeywords()
    extractAiKeywords()
  }, [seoTitle, seoDescription, onChange, generateSeoTitle, generateSeoDescription, extractKeywords, extractAiKeywords])

  // AI 一键生成 SEO（editor_summary 功能点，受 AI 开关矩阵控制）
  const [aiSeoBusy, setAiSeoBusy] = useState(false)
  const [aiSeoMsg, setAiSeoMsg] = useState('')
  const aiSeoFill = useCallback(async () => {
    setAiSeoBusy(true); setAiSeoMsg('')
    try {
      const src = String(getAllSourceText()).slice(0, 3000)
      const r = await fetch('/api/ai/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'editor_summary', action: 'summary', label: 'SEO 配置', text: src }),
      })
      const d = await r.json()
      if (!d.ok) { setAiSeoMsg(d.error || '调用失败'); return }
      // 解析三行：摘要 / SEO标题 / 关键词
      const lines = d.result.split(/\r?\n/).map((l: string) => l.trim().replace(/^[1-3][.、)）]\s*/, '').replace(/^[（(]?\d+[)）]?\s*[:：]?\s*/, '')).filter(Boolean)
      if (lines[0]) onChange('seoDescription', lines[0])
      if (lines[1]) onChange('seoTitle', lines[1])
      if (lines[2]) onChange('seoKeywords', lines[2].replace(/,/g, ', '))
      // 多语种补齐：中文标题/描述自动翻译到英文（关键词翻译已有独立逻辑）
      if (lines[1] && !seoTitleEnRef.current?.trim()) {
        try {
          const t = await fetch('/api/admin/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: lines[1], targetLang: 'en', isHtml: false }),
          })
          const td = await t.json()
          if (td.translatedText) onChange('seoTitleEn', td.translatedText)
        } catch { /* 静默 */ }
      }
      if (lines[0] && !seoDescriptionEnRef.current?.trim()) {
        try {
          const t = await fetch('/api/admin/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: lines[0], targetLang: 'en', isHtml: false }),
          })
          const td = await t.json()
          if (td.translatedText) onChange('seoDescriptionEn', td.translatedText)
        } catch { /* 静默 */ }
      }
      setAiSeoMsg('已生成并填充 SEO 标题/描述/关键词（含英文）')
      setTimeout(() => setAiSeoMsg(''), 3000)
    } catch (e: any) {
      setAiSeoMsg(e.message || '网络异常')
    } finally {
      setAiSeoBusy(false)
    }
  }, [getAllSourceText, onChange])

  // 组件加载时自动填充
  useEffect(() => {
    if (autoFill && !hasAutoFilled) {
      const hasSource = sourceTitleRef.current || sourceTextRef.current || sourceSummaryRef.current
      if (hasSource) {
        const timer = setTimeout(() => {
          smartFill()
          setHasAutoFilled(true)
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [autoFill, hasAutoFilled, smartFill])

  const applyKeyword = (keyword: string) => {
    const current = seoKeywords ? seoKeywords.split(/[,，]/).map(k => k.trim()).filter(Boolean) : []
    if (!current.includes(keyword)) {
      current.push(keyword)
      onChange('seoKeywords', current.join(', '))
    }
  }

  const applyAllSuggested = () => {
    const current = seoKeywords ? seoKeywords.split(/[,，]/).map(k => k.trim()).filter(Boolean) : []
    const all = [...current, ...suggestedKeywords, ...aiSuggestedKeywords]
    const unique = Array.from(new Set(all))
    onChange('seoKeywords', unique.join(', '))
  }

  return (
    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Search size={16} className="text-red-600" />
          SEO / GEO 优化配置
        </h3>
        <button
          type="button"
          onClick={smartFill}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded hover:from-purple-700 hover:to-blue-700 transition-colors"
        >
          <Sparkles size={14} />
          智能填充
        </button>
        <button
          type="button"
          onClick={aiSeoFill}
          disabled={aiSeoBusy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <Sparkles size={14} />
          {aiSeoBusy ? 'AI 生成中...' : 'AI 生成 SEO'}
        </button>
      </div>
      {aiSeoMsg && <div className={`text-xs mt-2 ${aiSeoMsg.startsWith('已') ? 'text-green-600' : 'text-red-500'}`}>{aiSeoMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">SEO标题（留空自动从标题生成）</label>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => onChange('seoTitle', e.target.value)}
            maxLength={maxLengthByField?.seoTitle}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            placeholder="搜索引擎显示的标题，建议60字符以内"
          />
          <div className="mt-1 flex justify-end">
            <CharCounter value={seoTitle} max={maxLengthByField?.seoTitle} />
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">SEO描述（留空自动从摘要/正文生成）</label>
          <textarea
            rows={2}
            value={seoDescription}
            onChange={(e) => onChange('seoDescription', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            placeholder="搜索引擎显示的描述，建议160字符以内"
          />
        </div>
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-500">SEO关键词（逗号分隔）</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={extractKeywords}
                disabled={extracting}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {extracting ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
                内容提取
              </button>
              <button
                type="button"
                onClick={extractAiKeywords}
                disabled={aiExtracting}
                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50"
              >
                {aiExtracting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                网络推荐
              </button>
              <button
                type="button"
                onClick={applyAllSuggested}
                className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
              >
                <RefreshCw size={12} />
                全部应用
              </button>
            </div>
          </div>
          <input
            type="text"
            value={seoKeywords}
            onChange={(e) => onChange('seoKeywords', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            placeholder="如：工业阀门, 闸阀, 球阀, 蝶阀, 流体控制"
          />
          {/* 英文SEO关键词 */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-500">
                SEO关键词（英文）
                {translatingKeywords && (
                  <span className="ml-2 text-blue-500">翻译中...</span>
                )}
              </label>
              {englishKeywordsEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setEnglishKeywordsEdited(false)
                    // 触发重新翻译
                    onChangeRef.current('seoKeywordsEn', '')
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  重新自动翻译
                </button>
              )}
            </div>
            <input
              type="text"
              value={seoKeywordsEn}
              onChange={(e) => {
                setEnglishKeywordsEdited(true)
                onChange('seoKeywordsEn', e.target.value)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              placeholder="e.g., valve, gate valve, ball valve, VALTRIX"
            />
            <p className="mt-1 text-xs text-gray-400">
              自动从中文关键词翻译，可手动编辑修改
            </p>
          </div>
          {/* 内容提取关键词建议 */}
          {suggestedKeywords.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-400 mr-2">内容提取：</span>
              <div className="flex flex-wrap gap-1.5 inline">
                {suggestedKeywords.slice(0, 10).map((keyword, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyKeyword(keyword)}
                    className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                  >
                    + {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* 网络推荐关键词 */}
          {aiSuggestedKeywords.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-400 mr-2">网络推荐：</span>
              <div className="flex flex-wrap gap-1.5 inline">
                {aiSuggestedKeywords.map((keyword, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyKeyword(keyword)}
                    className="px-2 py-0.5 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition-colors"
                  >
                    + {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* ===== 多语种 SEO（英/日/韩/法/阿）=====
            库里 seoTitle/seoDescription/seoKeywords 各有 6 个语种列，前台 buildSeoMetadata
            按当前语种取值 —— 这里把非中文语种也开放出来，并提供一键翻译。 */}
        <div className="md:col-span-2 border border-gray-200 rounded-md p-3 bg-gray-50/60">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="block text-xs font-medium text-gray-500">SEO 多语言（标题 / 描述 / 关键词）</label>
            <span className="flex items-center gap-2">
              {seoI18nMsg && (
                <span className={`text-xs ${seoI18nMsg.startsWith('已翻译') ? 'text-green-600' : 'text-red-500'}`}>{seoI18nMsg}</span>
              )}
              <button
                type="button"
                onClick={translateSeoI18n}
                disabled={seoI18nBusy}
                title="把中文的 SEO 标题/描述/关键词翻译到英/日/韩/法/阿（可再手动修改）"
                className="inline-flex items-center gap-1 text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {seoI18nBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {seoI18nBusy ? '翻译中…' : '一键翻译'}
              </button>
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {SEO_I18N_LANGS.map((l) => {
              const filled = valOf(`seoTitle${l.suffix}`).trim()
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setSeoI18nLang(l.code)}
                  className={`px-3 py-1.5 text-xs rounded-md border ${
                    seoI18nLang === l.code ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:bg-white'
                  }`}
                >
                  {l.label}{filled ? '' : ' ⚠'}
                </button>
              )
            })}
          </div>
          {(() => {
            const l = SEO_I18N_LANGS.find((x) => x.code === seoI18nLang) || SEO_I18N_LANGS[0]
            const kT = `seoTitle${l.suffix}`
            const kD = `seoDescription${l.suffix}`
            const kK = `seoKeywords${l.suffix}`
            const vT = valOf(kT)
            return (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">SEO 标题（{l.label}，留空回退中文）</label>
                  <input
                    type="text"
                    value={vT}
                    onChange={(e) => onChange(kT, e.target.value)}
                    maxLength={maxLengthByField?.[kT]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder={`${l.label} title`}
                  />
                  {maxLengthByField?.[kT] ? (
                    <div className="mt-1 flex justify-end">
                      <CharCounter value={vT} max={maxLengthByField[kT]} />
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">SEO 描述（{l.label}，留空回退中文）</label>
                  <textarea
                    rows={2}
                    value={valOf(kD)}
                    onChange={(e) => onChange(kD, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder={`${l.label} description`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    SEO 关键词（{l.label}，逗号分隔，留空回退中文）
                    {l.code === 'en' && <span className="ml-1 text-gray-400">（与上方「英文」同一字段，改哪个都行）</span>}
                  </label>
                  <input
                    type="text"
                    value={valOf(kK)}
                    onChange={(e) => onChange(kK, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder={`${l.label} keywords`}
                  />
                </div>
              </div>
            )
          })()}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
              <MapPin size={12} /> GEO地区（可多选）
            </label>
            <button
              type="button"
              onClick={toggleAllRegions}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              {selectedRegions.length === GEO_REGIONS.length ? (
                <><CheckSquare size={12} /> 取消全选</>
              ) : (
                <><Square size={12} /> 全选</>
              )}
            </button>
          </div>
          <div className="border border-gray-200 rounded-md p-2 max-h-32 overflow-y-auto bg-gray-50">
            <div className="grid grid-cols-2 gap-1">
              {GEO_REGIONS.map((region) => (
                <label
                  key={region.code}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-xs transition-colors ${
                    selectedRegions.includes(region.name)
                      ? 'bg-red-50 text-red-700'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRegions.includes(region.name)}
                    onChange={() => toggleRegion(region.name)}
                    className="w-3 h-3 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="truncate">{region.name}</span>
                  <span className="text-gray-400 text-[10px]">({region.cities.length})</span>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">已选 {selectedRegions.length} 个地区</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
              <MapPin size={12} /> GEO城市（可多选）
            </label>
            {selectedRegions.length > 0 && (
              <button
                type="button"
                onClick={toggleAllCities}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                {currentRegionCities.every(c => selectedCities.includes(c.name)) ? (
                  <><CheckSquare size={12} /> 取消全选</>
                ) : (
                  <><Square size={12} /> 全选当前地区</>
                )}
              </button>
            )}
          </div>
          <div className="border border-gray-200 rounded-md p-2 max-h-48 overflow-y-auto bg-gray-50">
            {selectedRegions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">请先选择地区</p>
            ) : (
              <div className="space-y-2">
                {selectedRegions.map(regionName => {
                  const cities = getCitiesByRegion(regionName)
                  return (
                    <div key={regionName}>
                      <p className="text-xs font-medium text-gray-500 mb-1 sticky top-0 bg-gray-50 py-0.5">
                        {regionName} ({cities.filter(c => selectedCities.includes(c.name)).length}/{cities.length})
                      </p>
                      <div className="grid grid-cols-3 gap-0.5">
                        {cities.map((city, index) => (
                          <label
                            key={`${city.name}-${index}`}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer text-[11px] transition-colors ${
                              selectedCities.includes(city.name)
                                ? 'bg-red-50 text-red-700'
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                            title={`${city.name} (${city.nameEn})${city.tier ? ' - ' + city.tier : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCities.includes(city.name)}
                              onChange={() => toggleCity(city.name)}
                              className="w-2.5 h-2.5 text-red-600 rounded focus:ring-red-500 flex-shrink-0"
                            />
                            <span className="truncate">{city.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">已选 {selectedCities.length} 个城市</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        提示：SEO配置影响搜索引擎收录排名；GEO配置影响地域相关搜索结果。智能填充自动从标题、摘要、图片标识、正文提取关键词，并通过网络大数据推荐强相关内容。
      </p>
    </div>
  )
}
