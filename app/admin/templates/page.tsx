'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { LayoutTemplate, Plus, Pencil, Trash2, Star, StarOff, Power, X, Save, AlertCircle, Eye, CheckCircle2, Copy, Upload, Download, Search, Palette, Package, FolderOpen } from 'lucide-react'
import {
  type TemplateTier,
  TIER_ORDER,
  TIER_LABEL,
  TIER_HINT,
  CUSTOM_NOTE,
  SKIN_NOTE,
  WIRED_NOTE,
  tierOfPreset,
  matchesQuery,
} from '@/lib/templates/template-groups'

interface TemplateItem {
  id: string
  name: string
  slug: string
  version: string
  description: string | null
  screenshot: string | null
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface FormState {
  name: string
  slug: string
  version: string
  description: string
  screenshot: string
  isDefault: boolean
}

const EMPTY_FORM: FormState = { name: '', slug: '', version: '1.0.0', description: '', screenshot: '', isDefault: false }

type TierFilter = 'all' | TemplateTier

/** 分区图标与配色（每个层级一个） */
const TIER_ICON: Record<TemplateTier, any> = {
  layout: LayoutTemplate,
  skin: Palette,
  pack: Package,
  custom: FolderOpen,
}
const TIER_ICON_COLOR: Record<TemplateTier, string> = {
  layout: 'text-blue-600',
  skin: 'text-purple-600',
  pack: 'text-green-600',
  custom: 'text-gray-500',
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  // 内置预设模板（R2 十套模板）
  const [presets, setPresets] = useState<any[]>([])
  const [applying, setApplying] = useState('')
  // 当前应用模板 slug（用于预设卡片高亮）
  const [currentSlug, setCurrentSlug] = useState('')
  // 系统默认版式 slug（由 ?mode=presets 下发）。用于在「整站版式模板」区**额外列出「默认版式」卡**。
  const [defaultSlug, setDefaultSlug] = useState('')
  // 行业包（R2 行业预设数据包）
  const [packs, setPacks] = useState<any[]>([])
  const [applyingPack, setApplyingPack] = useState('')
  // 「整站版式模板」slug 白名单（由 ?mode=presets 接口下发，用于把预设分成两个层级）
  const [fullLayoutSlugs, setFullLayoutSlugs] = useState<string[]>([])
  // 工具条：搜索关键字 + 类型筛选（同时作用于所有区块）
  const [query, setQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')

  const loadPresets = useCallback(() => {
    fetch('/api/admin/templates?mode=presets')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setPresets(d.presets || [])
          setFullLayoutSlugs(Array.isArray(d.fullLayoutSlugs) ? d.fullLayoutSlugs : [])
          setDefaultSlug(d.defaultSlug || '')
          // 「当前应用」= 前台**实际生效**的模板，必须与前台同源判定。
          // 由服务端 getActiveTemplateSlug() 下发（预览头 → 站点级 → theme_config → 默认模板）。
          //
          // 🔴 2026-09-15 修复：原实现自己 fetch('/api/admin/theme') 只查 theme_config，
          //    取不到时兜底成写死的 'default'。而前台同一情形兜底为 DEFAULT_TEMPLATE_SLUG（t2-industrial）。
          //    实测左文站：theme_config.templateSlug 为 null ⇒ 后台把「当前应用」标在 `default` 登记行上，
          //    而前台实际渲染的是 t2-industrial —— 后台与前台互相打架。
          //    现改为只显示服务端结论，页面不再自行推断（缺失时不显示徽章，也不猜）。
          setCurrentSlug(d.activeTemplateSlug || d.defaultSlug || '')
        }
      })
      .catch(() => {})
  }, [])

  const loadPacks = useCallback(() => {
    fetch('/api/admin/templates/industry')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPacks(d.packs || []) })
      .catch(() => {})
  }, [])

  const applyPack = async (slug: string) => {
    if (!confirm('应用行业包将：1) 切换推荐模板主题；2) 设置首页区块顺序；3) 覆盖 SEO 配置；4) 写入首页轮播默认文案。确定继续？')) return
    setApplyingPack(slug)
    setActionMsg('')
    try {
      const res = await fetch('/api/admin/templates/industry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '应用失败')
      setActionMsg(`已应用行业包「${result.name}」（模板：${result.templateSlug}）`)
      loadData()
      setTimeout(() => setActionMsg(''), 5000)
    } catch (e: any) {
      setActionMsg(e.message || '应用失败')
    } finally {
      setApplyingPack('')
    }
  }

  const applyPreset = async (slug: string) => {
    if (!confirm('应用该模板将覆盖当前主题配色（primary/accent/字体等），确定继续？')) return
    setApplying(slug)
    setActionMsg('')
    try {
      const res = await fetch('/api/admin/templates?action=applyPreset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '应用失败')
      setActionMsg(`已应用模板「${result.name}」`)
      loadData()
      setTimeout(() => setActionMsg(''), 4000)
    } catch (e: any) {
      setActionMsg(e.message || '应用失败')
    } finally {
      setApplying('')
    }
  }

  /** 只应用配色（不动当前模板）：把该皮肤的颜色/字体写进主题配置，版式保持当前不变 */
  const applyColors = async (slug: string) => {
    if (!confirm('只应用配色：仅把该皮肤的颜色与字体写入主题配置，不会切换当前模板（当前版式保持不动）。确定继续？')) return
    setApplying(slug)
    setActionMsg('')
    try {
      const res = await fetch('/api/admin/templates?action=applyColors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '应用失败')
      setActionMsg(`已应用配色「${result.name}」（未切换模板，当前版式保持不动）`)
      loadData()
      setTimeout(() => setActionMsg(''), 4000)
    } catch (e: any) {
      setActionMsg(e.message || '应用失败')
    } finally {
      setApplying('')
    }
  }

  /** 把内置预设复制为自定义模板（存为「我的模板」，可在模板列表中编辑） */
  const savePresetCopy = async (preset: any) => {
    if (!confirm(`将「${preset.name}」保存为自定义模板（可在下方模板列表中编辑修改）？`)) return
    setActionMsg('')
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: preset.name + '（自定义）',
          slug: preset.slug + '-custom',
          version: '1.0.0',
          description: preset.description,
          config: preset,
          isDefault: false,
          isActive: false,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '保存失败')
      setActionMsg(`已保存自定义模板「${preset.name}（自定义）」`)
      loadData()
      setTimeout(() => setActionMsg(''), 4000)
    } catch (e: any) {
      setActionMsg(e.message || '保存失败')
    }
  }

  /** 导出模板为 JSON 文件 */
  const exportTemplate = (t: any) => {
    const payload = {
      name: t.name,
      slug: t.slug,
      version: t.version || '1.0.0',
      description: t.description || '',
      config: t.config || null,
      isDefault: false,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${t.slug}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setActionMsg(`已导出模板「${t.name}」`);
    setTimeout(() => setActionMsg(''), 3000);
  };

  /** 从 JSON 文件导入模板 */
  const importTemplate = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data.name || !data.slug) throw new Error('文件缺少 name/slug 字段');
        const res = await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            slug: data.slug,
            version: data.version || '1.0.0',
            description: data.description || '',
            config: data.config || null,
            isDefault: false,
            isActive: false,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || '导入失败');
        setActionMsg(`已导入模板「${data.name}」`);
        loadData();
        setTimeout(() => setActionMsg(''), 4000);
      } catch (e: any) {
        setActionMsg('导入失败：' + (e.message || '文件格式错误'));
      }
    };
    reader.readAsText(file);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerImport = () => fileInputRef.current?.click();

  /** 刷新「当前应用」（前台实际生效的模板）。
   *
   *  🔴 2026-09-15 修复：`currentSlug` 此前**只在挂载时由 `loadPresets()` 取一次**
   *     （见下方 useEffect），而 `applyPreset` / `applyColors` / `setDefault` /
   *     `toggleActive` / `remove` / 保存 **全都只调 `loadData()`** —— `loadData` 又不碰
   *     `currentSlug`。⇒ 应用/启用新模板后，登记行换了，但「当前应用」徽章**仍停在旧模板上**。
   *     用户报障原话：「当启用某一个模版后，另一个模版还显示（当前应用）」。
   *     修法：把它挂进 `loadData()` 的收口，**凡数据变更必同步刷新徽章**，杜绝两者指向不同模板。
   *     取值仍走唯一入口 `?mode=presets` 的 `activeTemplateSlug`（服务端 getActiveTemplateSlug）。 */
  const loadActiveSlug = useCallback(() => {
    fetch('/api/admin/templates?mode=presets', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCurrentSlug(d.activeTemplateSlug || d.defaultSlug || '')
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/templates', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data)
        else setError(data.error || '加载失败')
      })
      .catch(() => setError('加载失败'))
      .finally(() => {
        setLoading(false)
        // 登记行与「当前应用」必须**一起刷新**，否则同屏出现「启用了 A，B 还是当前应用」
        loadActiveSlug()
      })
  }, [loadActiveSlug])

  useEffect(() => {
    loadData()
    loadPresets()
    loadPacks()
  }, [loadData, loadPresets, loadPacks])

  // 搜索过滤（三个层级各自过滤，关键字同时作用于全部区块）
  const filteredPresets = useMemo(() => presets.filter((p) => matchesQuery(p, query)), [presets, query])
  // 行业包的 SEO 标题/描述在嵌套 seo 对象里，顶层字符串匹配不到 ⇒ 显式摊平后作为额外搜索面传入
  // （**刻意不改成自动递归**：递归会让 theme/style 的值也变成命中源，搜色值会误命中）
  const filteredPacks = useMemo(
    () =>
      packs.filter((p) =>
        matchesQuery(p, query, [p?.seo?.title, p?.seo?.description, p?.seo?.keywords])
      ),
    [packs, query]
  )
  const filteredTemplates = useMemo(() => templates.filter((t) => matchesQuery(t, query)), [templates, query])

  // 预设按层级分区（layout / skin），行业包与 DB 模板各占一层
  const presetGroups = useMemo(() => {
    const groups: Record<TemplateTier, any[]> = { layout: [], skin: [], pack: [], custom: [] }
    for (const p of filteredPresets) {
      groups[tierOfPreset(p, fullLayoutSlugs)].push(p)
    }
    // 🔴 2026-09-15（用户裁定）：「整站版式模板」区**也要把「默认」列出来**。
    //    为什么注入在这里：layout 的**计数 / 网格 / 筛选**三处都从本 memo 派生
    //    （见下方 tierCount.layout = presetGroups.layout.length）⇒ 只在这里注入，
    //    三处**自动一致**，不会造出「计数 2、卡片 3」这种新的不一致。
    //    身份说明：**默认版式不是独立预设**（12 个预设 slug 里没有 `default`），它就是
    //    `DEFAULT_TEMPLATE_SLUG` 走的那条默认派发分支。故复用该预设对象、只覆盖展示字段，
    //    并打上 `__isDefaultLayout` 标记（renderPresetCard 据此避免同屏出现两个「当前应用」）。
    //    ⚠️ 「配色皮肤」区里**仍然保留**这张卡（用户明确要求两处都能看到）。
    const defaultPreset = filteredPresets.find((p: any) => p.slug === defaultSlug)
    if (defaultPreset) {
      groups.layout.unshift({
        ...defaultPreset,
        name: '默认版式',
        nameEn: 'Default Layout',
        description: `系统默认版式（版式同「${defaultPreset.name}」）—— 不带独立组件树，走前台默认派发分支。`,
        __isDefaultLayout: true,
      })
    }
    return groups
  }, [filteredPresets, fullLayoutSlugs, defaultSlug])

  // 各层级数量（随搜索变化；默认无搜索时即为各自总数）
  const tierCount = useMemo<Record<TemplateTier, number>>(
    () => ({
      layout: presetGroups.layout.length,
      skin: presetGroups.skin.length,
      pack: filteredPacks.length,
      custom: filteredTemplates.length,
    }),
    [presetGroups, filteredPacks, filteredTemplates]
  )
  const totalCount = tierCount.layout + tierCount.skin + tierCount.pack + tierCount.custom

  /** 该层级在当前筛选/搜索下是否需要渲染 */
  const showTier = (tier: TemplateTier) => tierCount[tier] > 0 && (tierFilter === 'all' || tierFilter === tier)

  /** 分区头部：图标 + 标题 + 数量徽章 + 一句话说明 */
  const renderTierHeader = (tier: TemplateTier) => {
    const Icon = TIER_ICON[tier]
    return (
      <>
        <h2 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <Icon size={18} className={TIER_ICON_COLOR[tier]} />
          {TIER_LABEL[tier]}
          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tierCount[tier]}</span>
          {/* 原「内置模板预设」标题下的提示语，保留原意避免丢失说明 */}
          {(tier === 'layout' || tier === 'skin') && (
            <span className="text-xs font-normal text-gray-400">应用后覆盖主题配色，可在「主题配色」中微调</span>
          )}
        </h2>
        <p className="text-xs text-gray-400 mb-3">{TIER_HINT[tier]}</p>
        {/* 配色皮肤的实情：只改颜色/字体，且应用它会顺手把活动模板切到它自己 */}
        {tier === 'skin' && (
          <p className="mb-3 -mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            {SKIN_NOTE}
          </p>
        )}
        {/* 我的模板（副本）的实情：不参与前台渲染 */}
        {tier === 'custom' && (
          <p className="mb-3 -mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            {CUSTOM_NOTE}
          </p>
        )}
      </>
    )
  }

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (t: TemplateItem) => {
    setEditId(t.id)
    setForm({
      name: t.name,
      slug: t.slug,
      version: t.version,
      description: t.description || '',
      screenshot: t.screenshot || '',
      isDefault: t.isDefault,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      setActionMsg('名称和标识为必填项')
      return
    }
    setSaving(true)
    setActionMsg('')
    try {
      const url = editId ? `/api/admin/templates/${editId}` : '/api/admin/templates'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '保存失败')
      setModalOpen(false)
      loadData()
    } catch (e: any) {
      setActionMsg(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const setDefault = async (t: TemplateItem) => {
    const res = await fetch(`/api/admin/templates/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    const result = await res.json()
    if (!res.ok) {
      setError(result.error || '操作失败')
    } else {
      loadData()
    }
  }

  const toggleActive = async (t: TemplateItem) => {
    // 🔴 2026-09-15（用户裁定）：「启用」＝**真正把前台切到该模板**，不再只是登记位。
    //    此前「启用」只改 `templates.isActive` ⇒ 会出现「启用了 A，而 B 仍显示当前应用」
    //    这种**同屏自相矛盾**的状态（用户报障原话）。现在：
    //      · 启用 → 复用 `applyPreset` 的**既有服务端路径**（写 templateSlug + 停用其余行 +
    //        维护登记行），保证「启用」与「当前应用」**永远同行**；
    //      · 停用 → 仍只改登记位（停用某个模板**不该**把前台切到别处）。
    if (!t.isActive) {
      const isPreset = presets.some((p: any) => p.slug === t.slug)
      if (!isPreset) {
        // 诚实失败，而不是"切了但前台没变"：前台按 slug 派发版式，未知 slug 会静默回退默认版式
        setError(
          `「${t.name}」的标识是 ${t.slug}，**不是内置版式预设**，无法把前台切到它 —— ` +
            `前台按 slug 派发版式，未知 slug 会回退到默认版式。要换前台版式，请用上方「整站版式模板」区对应卡片的「应用」按钮。`,
        )
        return
      }
      await applyPreset(t.slug)
      return
    }
    const res = await fetch(`/api/admin/templates/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    const result = await res.json()
    if (!res.ok) setError(result.error || '操作失败')
    else loadData()
  }

  const remove = async (t: TemplateItem) => {
    if (!window.confirm(`确定删除模板「${t.name}」吗？`)) return
    const res = await fetch(`/api/admin/templates/${t.id}`, { method: 'DELETE' })
    const result = await res.json()
    if (!res.ok) {
      setError(result.error || '删除失败')
    } else {
      loadData()
    }
  }

  /** 预设卡（整站版式模板 / 配色皮肤共用；结构、SVG 缩略图与动作按钮保持原样） */
  const renderPresetCard = (p: any) => (
    <div key={p.slug} className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow ${currentSlug === p.slug ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}>
      {/* 当前应用模板徽章。
          ⚠️ 默认版式与「配色皮肤」里的同一预设是**同一个模板**（默认版式不是独立预设），
             故只让「整站版式模板」区那张卡显示「当前应用」；配色皮肤区那张改显中性标记，
             避免同屏出现两个「当前应用」徽章（用户此前报障的正是这类自相矛盾的观感）。 */}
      {currentSlug === p.slug && !(p.slug === defaultSlug && !p.__isDefaultLayout) && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full shadow">
          <CheckCircle2 size={12} /> 当前应用
        </div>
      )}
      {currentSlug === p.slug && p.slug === defaultSlug && !p.__isDefaultLayout && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full shadow">
          即默认版式
        </div>
      )}
      {/* 模板风格缩略示意图 */}
      <div className="relative p-3" style={{ background: p.theme.dark }}>
        <svg viewBox="0 0 200 84" className="w-full h-24 rounded">
          <rect x="0" y="0" width="200" height="14" fill={p.theme.darkLight} />
          <circle cx="12" cy="7" r="3" fill={p.theme.primary} />
          <rect x="30" y="4" width="36" height="6" rx="2" fill={p.theme.accent} />
          <rect x="120" y="4" width="12" height="6" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="136" y="4" width="12" height="6" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="152" y="4" width="12" height="6" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x="0" y="20" width="200" height="34" fill={p.theme.primary} opacity="0.35" />
          <rect x="16" y="28" width="70" height="10" rx="2" fill={p.theme.primary} />
          <rect x="16" y="42" width="52" height="5" rx="2" fill="rgba(255,255,255,0.5)" />
          <rect x="140" y="30" width="42" height="12" rx="3" fill={p.theme.primaryLight} />
          <rect x="0" y="58" width="58" height="22" rx="3" fill={p.theme.primary} opacity="0.18" />
          <rect x="12" y="63" width="30" height="4" rx="2" fill={p.theme.accent} />
          <rect x="71" y="58" width="58" height="22" rx="3" fill={p.theme.primary} opacity="0.18" />
          <rect x="83" y="63" width="30" height="4" rx="2" fill={p.theme.accent} />
          <rect x="142" y="58" width="58" height="22" rx="3" fill={p.theme.primary} opacity="0.18" />
          <rect x="154" y="63" width="30" height="4" rx="2" fill={p.theme.accent} />
        </svg>
        <span className="absolute left-3 top-3 text-white text-[10px] font-medium opacity-90">{p.category} · {p.name}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-800">{p.name}</span>
          <span className="text-xs text-gray-400">{p.nameEn}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: p.theme.primary, color: '#fff' }}>
            主色 {p.theme.primary}
          </span>
          {/* 强调色与主色一样**真实生效**（两者都走 tailwind 的 var(--color-*) 映射）。
              这里刻意不再渲染 style 的「功能标签」—— 那 8 个字段实测全部未接线，
              渲染出来会让人以为预设之间有功能差异（实际只差颜色）。见 template-groups.ts 的长注释。 */}
          <span className="px-1.5 py-0.5 rounded text-xs border border-gray-200 text-gray-600" style={{ background: p.theme.accent }}>
            强调色 {p.theme.accent}
          </span>
          {p.theme.fontFamily && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500 truncate max-w-[12rem]" title={p.theme.fontFamily}>
              字体 {String(p.theme.fontFamily).split(',')[0].replace(/['"]/g, '')}
            </span>
          )}
        </div>
        <button
          onClick={() => savePresetCopy(p)}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 border border-dashed border-gray-300 text-gray-500 px-3 py-1.5 rounded-md hover:bg-gray-50 hover:text-gray-700 text-xs"
        >
          <Copy size={12} /> 存为我的模板
        </button>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => window.open(`/?__template=${p.slug}`, '_blank', 'noopener')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm"
          >
            <Eye size={14} /> 预览
          </button>
          {/* 配色皮肤：主按钮 = 「只应用配色」（只改颜色/字体，不动当前模板）；
              整站版式模板：保持原样，只有一个「应用」（本来就该连版式一起换）。 */}
          {tierOfPreset(p, fullLayoutSlugs) === 'skin' ? (
            <button
              onClick={() => applyColors(p.slug)}
              disabled={applying === p.slug}
              title="只把该皮肤的颜色与字体写入主题配置，不会切换当前模板 —— 可叠加在「整站版式模板」之上"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {applying === p.slug ? '应用中...' : '只应用配色'}
            </button>
          ) : (
            <button
              onClick={() => applyPreset(p.slug)}
              disabled={applying === p.slug}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {applying === p.slug ? '应用中...' : `应用「${p.name}」`}
            </button>
          )}
        </div>
        {/* 配色皮肤的次要动作：连版式一起切成该皮肤本身（= 旧「应用」的行为，保留给确实想切回默认版式的人） */}
        {tierOfPreset(p, fullLayoutSlugs) === 'skin' && (
          <button
            onClick={() => applyPreset(p.slug)}
            disabled={applying === p.slug}
            title="连版式一起切换：把活动模板也切到该皮肤本身"
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 border border-gray-300 text-gray-500 px-3 py-1 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 text-xs"
          >
            <LayoutTemplate size={12} /> 切换为此模板
          </button>
        )}
      </div>
    </div>
  )

  /** 行业包卡 */
  const renderPackCard = (p: any) => (
    <div key={p.slug} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-800">{p.name}</span>
        <span className="text-xs text-gray-400">{p.nameEn}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">模板 {p.templateSlug}</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{p.menu.length} 菜单</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{p.sections.length} 区块</span>
      </div>
      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{p.seo.title}</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => window.open(`/?__template=${p.templateSlug}`, '_blank', 'noopener')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 text-sm"
        >
          <Eye size={14} /> 预览
        </button>
        <button
          onClick={() => applyPack(p.slug)}
          disabled={applyingPack === p.slug}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          {applyingPack === p.slug ? '初始化中...' : `按「${p.name}」初始化`}
        </button>
      </div>
    </div>
  )

  /** DB 模板卡（我的模板） */
  const renderTemplateCard = (t: TemplateItem) => (
    <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
            <LayoutTemplate size={20} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              {t.name}
              {currentSlug === t.slug && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                  <CheckCircle2 size={12} />
                  当前应用
                </span>
              )}
              {t.isDefault && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                  <Star size={12} />
                  默认
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {t.slug} · v{t.version}
            </div>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {t.isActive ? '启用' : '停用'}
        </span>
      </div>

      <p className="text-sm text-gray-500 mt-3 flex-1 line-clamp-2">{t.description || '暂无描述'}</p>

      {t.screenshot && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.screenshot} alt={t.name} className="w-full h-32 object-cover rounded-md border border-gray-100" />
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={() => window.open(`/?__template=${t.slug}`, '_blank', 'noopener')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-blue-600 hover:bg-blue-50 transition-colors"
          title="新窗口预览该模板前台效果"
        >
          <Eye size={13} />
          预览
        </button>
        <button
          onClick={() => openEdit(t)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Pencil size={13} />
          编辑
        </button>
        <button
          onClick={() => exportTemplate(t)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          title="导出为 JSON 文件，可导入到其他站点复用"
        >
          <Download size={13} />
          导出
        </button>
        {!t.isDefault && (
          <button
            onClick={() => setDefault(t)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-amber-600 hover:bg-amber-50 transition-colors"
            title="设为默认：只改登记状态。前台模板由「整站版式模板」决定，此处不影响前台渲染"
          >
            <StarOff size={13} />
            设为默认
          </button>
        )}
        <button
          onClick={() => toggleActive(t)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          title="启用＝把前台切换为此模板并自动停用其余行；停用＝仅改登记位，不影响前台已生效的模板"
        >
          <Power size={13} />
          {t.isActive ? '停用' : '启用'}
        </button>
        {!t.isDefault && (
          <button
            onClick={() => remove(t)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs text-red-600 hover:bg-red-50 transition-colors ml-auto"
          >
            <Trash2 size={13} />
            删除
          </button>
        )}
      </div>
    </div>
  )

  // 「同一时刻只应有一个模板启用」这条不变式的**可见化**（提示条见下方 JSX）。
  // 接口层（PUT / POST / applyPreset）都会维护该不变式，但 2026-09-14 之前的
  // 历史登记行不受其约束 —— 与其让用户对着多个「启用」猜，不如直接点明。
  const activeRows = templates.filter((t) => t.isActive)

  if (loading && templates.length === 0) {
    return <div className="text-gray-500">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <LayoutTemplate size={24} className="text-blue-600" />
            模板管理
          </h1>
          <p className="text-gray-500 mt-1">
            管理站点前端展示模板。<b>启用/停用 / 默认</b>＝登记状态（同一时刻**只应有一个**模板处于「启用」；「启用」＝把前台切换为该模板）；<b className="text-green-600">当前应用</b>＝前台实际生效的模板（由服务端与前台同源判定：预览头 → 站点配置 → 主题配置 → 默认模板）。预设卡与下方登记行用的是**同一个**「当前应用」标识，不会出现两种叫法。
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importTemplate(f);
            e.target.value = '';
          }}
        />
        <button
          onClick={triggerImport}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <Upload size={16} />
          导入模板
        </button>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          新增模板
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}
      {actionMsg && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md text-sm">
          <AlertCircle size={16} />
          {actionMsg}
        </div>
      )}

      {/* 不变式「同一时刻只允许一个模板启用」被违反时**可见**（不静默）。
          接口层已守卫（PUT/POST/applyPreset），但 2026-09-14 之前的历史登记行不在其内。 */}
      {activeRows.length > 1 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            检测到 <b>{activeRows.length}</b> 个模板同时处于「启用」状态：
            {activeRows.map((t) => t.name).join('、')}。
            违反「同一时刻只允许一个模板启用」—— 这通常早于该守卫加入时间的<b>历史登记数据</b>。
            修复方式：对<b>应当启用</b>的那一行点一次「启用」（或先停用再启用），服务端会自动把其余行一并停用。
          </span>
        </div>
      )}

      {/* 工具条：搜索 + 类型筛选（同时作用于所有区块） */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索模板名称 / slug / 描述…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 实话说明：把「哪些配置真的生效」摆在最前面。
            之前卡片上那排「全宽首屏 / 描边卡片 / 实心按钮」等功能标签描述的是**未接线**的配置，
            会让人以为 12 套预设之间有功能差异 —— 实测它们只差颜色。 */}
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-2 leading-relaxed">
          {WIRED_NOTE}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {([{ key: 'all' as TierFilter, label: '全部', count: totalCount }].concat(
            TIER_ORDER.map((tier) => ({ key: tier as TierFilter, label: TIER_LABEL[tier], count: tierCount[tier] }))
          )).map((item) => (
            <button
              key={item.key}
              onClick={() => setTierFilter(item.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm transition-colors ${
                tierFilter === item.key
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
              <span
                className={`text-xs px-1.5 rounded-full ${
                  tierFilter === item.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 整站版式模板（自带组件树与页面派发，应用后整页替换前台版式） */}
      {showTier('layout') && (
        <section>
          {renderTierHeader('layout')}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {presetGroups.layout.map((p) => renderPresetCard(p))}
          </div>
        </section>
      )}

      {/* 配色皮肤（共用同一套前台版式，只换 theme 配色与 style CSS 变量） */}
      {showTier('skin') && (
        <section>
          {renderTierHeader('skin')}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {presetGroups.skin.map((p) => renderPresetCard(p))}
          </div>
        </section>
      )}

      {/* 行业数据包（R2 行业预设数据包） */}
      {showTier('pack') && (
        <section>
          {renderTierHeader('pack')}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPacks.map((p) => renderPackCard(p))}
          </div>
        </section>
      )}

      {/* 我的模板（DB 行：后台新增 / 导入 / 从预设复制保存） */}
      {showTier('custom') && (
        <section>
          {renderTierHeader('custom')}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((t) => renderTemplateCard(t))}
          </div>
        </section>
      )}

      {/* 全部层级在当前筛选/搜索下皆为空时的空态 */}
      {totalCount === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-lg border border-gray-100">
          {query.trim() ? '没有匹配的模板' : '暂无模板，点击右上角「新增模板」创建'}
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editId ? '编辑模板' : '新增模板'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">模板名称 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：默认模板"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">模板标识 slug *</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  disabled={!!editId}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="如：default"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">版本号</label>
                <input
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：1.0.0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">模板描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="模板说明"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">预览图 URL</label>
                <input
                  value={form.screenshot}
                  onChange={(e) => setForm({ ...form, screenshot: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://...（可选）"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded"
                />
                设为默认模板
              </label>
              {actionMsg && (
                <div className="p-2 bg-yellow-50 text-yellow-700 text-sm rounded">{actionMsg}</div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
