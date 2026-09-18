"use client";

import { useState, useEffect } from "react";
import { Save, Globe, Phone, Mail, MapPin, FileText, Link2, Plus, Trash2 } from "lucide-react";
import UrlUploadInput from "@/components/admin/UrlUploadInput";

export default function SiteConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [translatingAddr, setTranslatingAddr] = useState<number | null>(null);
  const [translatingSocial, setTranslatingSocial] = useState<number | null>(null);
  const [amapPreview, setAmapPreview] = useState(false);
  const [form, setForm] = useState({
    siteName: "",
    siteNameEn: "",
    siteDescription: "",
    siteKeywords: "",
    logo: "",
    phone: "",
    email: "",
    address: "",
    addresses: [] as string[],
    addressesEn: [] as string[],
    addressesJa: [] as string[],
    addressesKo: [] as string[],
    addressesFr: [] as string[],
    addressesAr: [] as string[],
    addressMaps: [] as { enabled: boolean; lat: string; lng: string; zoom?: number; name?: { zh: string; en: string } }[],
    icp: "",
    wechat: "",
    weibo: "",
    linkedin: "",
    youtube: "",
    socials: [] as any[],
    copyright: "",
    amapKey: "",
    amapSecurityCode: "",
    amapLatitude: "",
    amapLongitude: "",
    amapZoom: "",
    amapMarkerTitle: "",
    aboutValues: [] as any[],
    careersBenefits: [] as any[],
    siteDomain: "",
    siteDomainRemark: "",
    notifyEmail: "",
    recruitEmails: "",
    showTemplatePreviewMenu: true,
    autoQuoteReply: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  // 解析内容数组（价值观/福利卡片，兼容 JSON 字符串格式）
  const parseContentArray = (val: any): any[] => {
    if (Array.isArray(val)) return val
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed
      } catch (e) { /* 忽略 */ }
    }
    return []
  }

  // 解析可能为字符串的数组（兼容 JSON 字符串格式）
  const parseArray = (val: any): string[] => {
    if (Array.isArray(val)) return val.map((v: any) => String(v || ""))
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed.map((v: any) => String(v || ""))
      } catch (e) { /* 忽略 */ }
    }
    return []
  }

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/site-config");
      const data = await res.json();
      if (!data.error) {
        const addresses = parseArray(data.addresses)
        const addressesEn = parseArray(data.addressesEn)
        const addressesJa = parseArray(data.addressesJa)
        const addressesKo = parseArray(data.addressesKo)
        const addressesFr = parseArray(data.addressesFr)
        const addressesAr = parseArray(data.addressesAr)
        // 没有多地址数据时，用单地址字段兜底
        const addrList = addresses.length > 0 ? addresses : (data.address ? [data.address] : [])
        const addrEnList = addressesEn.length > 0 ? addressesEn : (data.addressEn ? [data.addressEn] : [])
        const addrJaList = addressesJa.length > 0 ? addressesJa : []
        const addrKoList = addressesKo.length > 0 ? addressesKo : []
        const addrFrList = addressesFr.length > 0 ? addressesFr : []
        const addrArList = addressesAr.length > 0 ? addressesAr : []
        let rawMaps: any[] = Array.isArray(data.addressMaps) ? data.addressMaps : []
        if (typeof data.addressMaps === 'string') {
          try { rawMaps = JSON.parse(data.addressMaps) } catch (e) { rawMaps = [] }
        }
        const addrMaps = addrList.map((_, i) => {
          const m = rawMaps[i]
          const nm = m && (m as any).name
          return m && typeof m === 'object'
            ? { enabled: !!m.enabled, lat: String(m.lat || ''), lng: String(m.lng || ''), zoom: m.zoom != null ? Number(m.zoom) : 15, name: nm && typeof nm === 'object' ? { zh: String(nm.zh || ''), en: String(nm.en || '') } : (typeof nm === 'string' ? { zh: nm, en: '' } : { zh: '', en: '' }) }
            : { enabled: false, lat: '', lng: '', zoom: 15, name: { zh: '', en: '' } }
        })
        setForm({
          siteName: data.siteName || "",
          siteNameEn: data.siteNameEn || "",
          siteDescription: data.siteDescription || "",
          siteKeywords: data.siteKeywords || "",
          logo: data.logo || "",
          phone: data.phone || "",
          email: data.email || "",
          address: addrList[0] || "",
          addresses: addrList,
          addressesEn: addrEnList,
          addressesJa: addrJaList,
          addressesKo: addrKoList,
          addressesFr: addrFrList,
          addressesAr: addrArList,
          addressMaps: addrMaps,
          icp: data.icp || "",
          wechat: data.wechat || "",
          weibo: data.weibo || "",
          linkedin: data.linkedin || "",
          youtube: data.youtube || "",
          socials: Array.isArray(data.socials) ? data.socials : [],
          copyright: data.copyright || "",
          amapKey: data.amapKey || "",
          amapSecurityCode: data.amapSecurityCode || "",
          amapLatitude: data.amapLatitude || "",
          amapLongitude: data.amapLongitude || "",
          amapZoom: data.amapZoom || "",
          amapMarkerTitle: data.amapMarkerTitle || "",
          aboutValues: parseContentArray(data.aboutValues),
          careersBenefits: parseContentArray(data.careersBenefits),
          siteDomain: data.siteDomain || "",
          siteDomainRemark: data.siteDomainRemark || "",
          notifyEmail: data.notifyEmail || "",
          recruitEmails: data.recruitEmails || "",
          showTemplatePreviewMenu: data.showTemplatePreviewMenu !== false,
          autoQuoteReply: data.autoQuoteReply !== false,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value } as any));
  };

  // 多地址编辑
  const updateAddress = (index: number, field: "addresses" | "addressesEn" | "addressesJa" | "addressesKo" | "addressesFr" | "addressesAr", value: string) => {
    setForm((prev) => {
      const list = [...prev[field]]
      list[index] = value
      return { ...prev, [field]: list }
    })
  }
  const addAddress = () => {
    setForm((prev) => ({ ...prev, addresses: [...prev.addresses, ""], addressesEn: [...prev.addressesEn, ""], addressesJa: [...prev.addressesJa, ""], addressesKo: [...prev.addressesKo, ""], addressesFr: [...prev.addressesFr, ""], addressesAr: [...prev.addressesAr, ""], addressMaps: [...prev.addressMaps, { enabled: false, lat: "", lng: "", zoom: 15, name: { zh: "", en: "" } }] }))
  }
  const removeAddress = (index: number) => {
    setForm((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
      addressesEn: prev.addressesEn.filter((_, i) => i !== index),
      addressesJa: prev.addressesJa.filter((_, i) => i !== index),
      addressesKo: prev.addressesKo.filter((_, i) => i !== index),
      addressesFr: prev.addressesFr.filter((_, i) => i !== index),
      addressesAr: prev.addressesAr.filter((_, i) => i !== index),
      addressMaps: prev.addressMaps.filter((_, i) => i !== index),
    }))
  }

  // 一键翻译地址（中文 -> 其他5语种）
  const translateAddress = async (index: number) => {
    const zhText = form.addresses[index];
    if (!zhText || !zhText.trim()) {
      setMessage("请先填写中文地址");
      return;
    }
    setTranslatingAddr(index);
    setMessage("正在翻译地址...");
    try {
      const targets = [
        { field: "addressesEn", lang: "en" },
        { field: "addressesJa", lang: "ja" },
        { field: "addressesKo", lang: "ko" },
        { field: "addressesFr", lang: "fr" },
        { field: "addressesAr", lang: "ar" },
      ];
      for (const t of targets) {
        const res = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: zhText, from: "zh", targetLang: t.lang }),
        });
        const data = await res.json();
        if (data.translatedText) {
          updateAddress(index, t.field as any, data.translatedText);
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      setMessage("地址翻译完成");
    } catch (err) {
      setMessage("翻译失败，请重试");
    } finally {
      setTranslatingAddr(null);
    }
  }

  // 一键翻译社交名称（中文 -> 其他5语种）
  const translateSocialName = async (index: number) => {
    const zhText = (form.socials[index]?.name?.zh || "").trim();
    if (!zhText) {
      setMessage("请先填写该社交媒体项的中文名称");
      return;
    }
    setTranslatingSocial(index);
    setMessage("正在翻译名称...");
    try {
      const targets = ["en", "ja", "ko", "fr", "ar"];
      for (const lang of targets) {
        const res = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: zhText, from: "zh", targetLang: lang }),
        });
        const data = await res.json();
        if (data.translatedText) {
          updateSocialName(index, lang, data.translatedText);
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      setMessage("名称翻译完成");
    } catch (err) {
      setMessage("翻译失败，请重试");
    } finally {
      setTranslatingSocial(null);
    }
  };

  // 单地址地图配置更新
  const updateAddressMap = (index: number, field: "enabled" | "lat" | "lng" | "zoom", value: any) => {
    setForm((prev) => {
      const list: { enabled: boolean; lat: string; lng: string; zoom?: number; name?: { zh: string; en: string } }[] = prev.addressMaps.map((m: any) => ({ ...m }))
      if (!list[index]) list[index] = { enabled: false, lat: "", lng: "", zoom: 15, name: { zh: "", en: "" } }
      const item = list[index]
      if (item) (item as any)[field] = value
      return { ...prev, addressMaps: list }
    })
  }

  // 地址名称编辑（多语言对象）
  const updateAddressName = (index: number, lang: string, value: string) => {
    setForm((prev) => {
      const list = prev.addressMaps.map((m: any) => ({ ...m }))
      if (!list[index]) list[index] = { enabled: false, lat: "", lng: "", zoom: 15, name: { zh: "", en: "" } }
      const item = list[index]
      if (item) {
        const cur = item.name && typeof item.name === "object" ? item.name : {}
        item.name = { zh: String(cur.zh || ""), en: String(cur.en || ""), [lang]: value }
      }
      return { ...prev, addressMaps: list }
    })
  }

  // ===== 社交媒体（可自定义，最多 7 个，多语言名称）=====
  const addSocial = () => {
    setForm((prev) => {
      const list = prev.socials || [];
      if (list.length >= 7) return prev;
      return { ...prev, socials: [...list, { id: "s-" + Date.now(), type: "wechat", name: { zh: "", en: "" }, url: "", qrCode: "", enabled: true }] };
    });
  };
  const updateSocial = (index: number, field: string, value: any) => {
    setForm((prev) => {
      const list = (prev.socials || []).map((x: any) => ({ ...x, name: { ...(x.name || {}) } }));
      if (!list[index]) list[index] = { id: "s-" + Date.now(), type: "wechat", name: {}, url: "", qrCode: "", enabled: true };
      if (field === "name") list[index].name = value || {};
      else (list[index] as any)[field] = value;
      return { ...prev, socials: list };
    });
  };
  const updateSocialName = (index: number, lang: string, val: string) => {
    setForm((prev) => {
      const list = (prev.socials || []).map((x: any) => ({ ...x, name: { ...(x.name || {}) } }));
      if (!list[index]) list[index] = { id: "s-" + Date.now(), type: "wechat", name: {}, url: "", qrCode: "", enabled: true };
      list[index].name[lang] = val;
      return { ...prev, socials: list };
    });
  };
  const removeSocial = (index: number) => {
    setForm((prev) => ({ ...prev, socials: (prev.socials || []).filter((_: any, i: number) => i !== index) }));
  };

  // 免费地图定位（OpenStreetMap Nominatim，无需 API Key）
  const geocodeAddress = async (index: number) => {
    const addr = form.addresses[index]
    if (!addr || !addr.trim()) { setMessage("请先填写中文地址再定位"); return }
    setTranslatingAddr(index)
    setMessage("正在定位地址...")
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`, {
        headers: { "Accept-Language": "zh-CN", "User-Agent": "site-admin-geocoder" },
        signal: AbortSignal.timeout(15000),
      })
      const data = await res.json()
      if (data && data[0] && data[0].lat && data[0].lon) {
        updateAddressMap(index, "lat", data[0].lat)
        updateAddressMap(index, "lng", data[0].lon)
        setMessage("定位成功，已自动填充经纬度")
      } else {
        setMessage("未找到该地址，请手动填写经纬度")
      }
    } catch (e) {
      setMessage("定位失败，请手动填写经纬度")
    } finally {
      setTranslatingAddr(null)
    }
  }

  // 内容卡片编辑（价值观/福利）
  const LANGS = [
    { key: "zh", label: "中文" },
    { key: "en", label: "英文" },
    { key: "ja", label: "日文" },
    { key: "ko", label: "韩文" },
    { key: "fr", label: "法文" },
    { key: "ar", label: "阿拉伯文" },
  ];
  const updateContentItem = (field: "aboutValues" | "careersBenefits", index: number, lang: string, key: "title" | "desc" | "icon", value: string) => {
    setForm((prev) => {
      const list = [...prev[field]];
      if (!list[index]) list[index] = { icon: "", title: {}, desc: {} };
      if (key === "icon") {
        list[index].icon = value;
      } else {
        list[index][key] = { ...list[index][key], [lang]: value };
      }
      return { ...prev, [field]: list };
    });
  };
  const addContentItem = (field: "aboutValues" | "careersBenefits") => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], { icon: "", title: { zh: "", en: "", ja: "", ko: "", fr: "", ar: "" }, desc: { zh: "", en: "", ja: "", ko: "", fr: "", ar: "" } }] }));
  };
  const removeContentItem = (field: "aboutValues" | "careersBenefits", index: number) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    // 域名格式校验（每行一个）
    const domainLines = (form.siteDomain || "").split(/[\r\n,，;；]/).map((d) => d.trim()).filter(Boolean);
    const domainRe = /^(?:\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    for (const d of domainLines) {
      if (d.toLowerCase() !== "localhost" && !domainRe.test(d)) {
        setSaving(false);
        setMessage("域名格式错误：" + d + "。每行一个域名，如 www.valvetrix.com 或 *.valvetrix.com");
        return;
      }
    }
    try {
      // 清理空地址，主地址取第一个
      const addresses = form.addresses.filter((a) => a.trim())
      const addressesEn = form.addressesEn.map((a) => a.trim())
      const addressesJa = form.addressesJa.map((a) => a.trim())
      const addressesKo = form.addressesKo.map((a) => a.trim())
      const addressesFr = form.addressesFr.map((a) => a.trim())
      const addressesAr = form.addressesAr.map((a) => a.trim())
      const payload = {
        ...form,
        addresses,
        addressesEn,
        addressesJa,
        addressesKo,
        addressesFr,
        addressesAr,
        address: addresses[0] || "",
        addressMaps: form.addressMaps,
        socials: form.socials,
        aboutValues: form.aboutValues,
        careersBenefits: form.careersBenefits,
        showTemplatePreviewMenu: form.showTemplatePreviewMenu,
      }
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("站点配置保存成功，前台已同步更新");
      } else {
        setMessage("保存失败: " + (data.error || "未知错误"));
      }
    } catch (error) {
      setMessage("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">加载中...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-gray-900">站点配置</h1>
        <p className="text-gray-500 mt-1">配置网站基本信息、联系方式、社交媒体等全局设置</p>
      </div>

      {message && (
        <div className={`p-3 rounded-md text-sm ${
          message.includes("失败") || message.includes("错误")
            ? "bg-red-50 border border-red-200 text-red-700"
            : "bg-green-50 border border-green-200 text-green-700"
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe size={16} className="text-red-600" />
            基本信息
          </h3>
          <div className="mb-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5">
            <div>
              <div className="text-sm font-medium text-gray-800">前台显示「模板展示」入口</div>
              <div className="text-xs text-gray-500 mt-0.5">关闭后前台导航不再显示模板预览菜单（模板管理后台不受影响）</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.showTemplatePreviewMenu} onChange={(e) => setForm((prev) => ({ ...prev, showTemplatePreviewMenu: e.target.checked }))} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">网站名称 *</label>
              <input type="text" value={form.siteName} onChange={(e) => handleChange("siteName", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">网站英文名</label>
              <input type="text" value={form.siteNameEn} onChange={(e) => handleChange("siteNameEn", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">网站描述</label>
              <textarea rows={2} value={form.siteDescription} onChange={(e) => handleChange("siteDescription", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">网站关键词（逗号分隔）</label>
              <input type="text" value={form.siteKeywords} onChange={(e) => handleChange("siteKeywords", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
            </div>
            <div className="md:col-span-2">
              <UrlUploadInput
                value={form.logo}
                onChange={(url) => handleChange("logo", url)}
                label="Logo（支持上传图片或输入URL）"
                placeholder="点击上传或输入图片URL，如 /images/logo.png"
                accept="image/*"
                showPreview={true}
              />
            </div>
          </div>
        </div>

        {/* 域名信息（与商业授权关联） */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe size={16} className="text-red-600" />
            域名信息（与商业授权关联）
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">站点域名</label>
              <textarea rows={3} value={form.siteDomain}
                onChange={(e) => handleChange("siteDomain", e.target.value)}
                placeholder={"每行一个域名，格式要求：\nwww.valvetrix.com\nvalvetrix.com\n*.valvetrix.com（通配子域名）"}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-mono" />
              <p className="text-xs text-gray-400 mt-1">用于商业授权域名校验与匹配。每行一个域名，支持 *. 通配子域名；站点名称与域名将显示在授权管理页与授权码比对。</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">备注</label>
              <textarea rows={2} value={form.siteDomainRemark}
                onChange={(e) => handleChange("siteDomainRemark", e.target.value)}
                placeholder="备注说明（选填）：如主域名、备用域名、授权关联说明等"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
              <p className="text-xs text-gray-400 mt-1">备注为纯文本，无格式限制；用于记录该域名用途与授权绑定说明。</p>
            </div>
          </div>
        </div>

        {/* 通知设置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-red-600 rounded" />
            通知设置
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">管理员通知邮箱</label>
              <input
                type="email"
                value={form.notifyEmail}
                onChange={(e) => handleChange("notifyEmail", e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
              <p className="text-xs text-gray-400 mt-1">新留言、资料下载留资时向该邮箱发送通知邮件；留空则发送到 SMTP 账号邮箱。需先在「系统设置 → SMTP 邮件」配置发信服务。</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">简历接收邮箱（支持多个，用英文逗号分隔）</label>
              <input
                type="text"
                value={form.recruitEmails}
                onChange={(e) => handleChange("recruitEmails", e.target.value)}
                placeholder="hr@valtrix.com, recruit@valtrix.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
              <p className="text-xs text-gray-400 mt-1">前台「加入我们/招聘职位」的投递按钮会将简历同时发送到这些邮箱；留空则使用「联系邮箱」。</p>
            </div>
          </div>
        </div>

        {/* 联系方式 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone size={16} className="text-red-600" />
            联系方式
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Phone size={12} /> 联系电话
              </label>
              <input type="text" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Mail size={12} /> 联系邮箱
              </label>
              <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <MapPin size={12} /> 公司地址（支持多个，第一行为主地址）
              </label>
              <div className="space-y-2">
                {form.addresses.map((addr, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={(form.addressMaps[index] as any)?.name?.zh || ""}
                          onChange={(e) => updateAddressName(index, "zh", e.target.value)}
                          placeholder="名称（如：总部地址 / 研发中心）"
                          className="text-xs font-medium text-gray-700 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none w-40"
                        />
                        <button
                          type="button"
                          onClick={() => translateAddress(index)}
                          disabled={translatingAddr === index}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                          title="将中文地址一键翻译为其他语种"
                        >
                          <Globe size={12} />
                          {translatingAddr === index ? "翻译中..." : "一键翻译"}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAddress(index)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除该地址"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={(form.addressMaps[index] as any)?.name?.ja || ""}
                        onChange={(e) => updateAddressName(index, "ja", e.target.value)}
                        placeholder="名称（日文）"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={(form.addressMaps[index] as any)?.name?.ko || ""}
                        onChange={(e) => updateAddressName(index, "ko", e.target.value)}
                        placeholder="名称（韩文）"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={(form.addressMaps[index] as any)?.name?.fr || ""}
                        onChange={(e) => updateAddressName(index, "fr", e.target.value)}
                        placeholder="名称（法文）"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={(form.addressMaps[index] as any)?.name?.ar || ""}
                        onChange={(e) => updateAddressName(index, "ar", e.target.value)}
                        placeholder="名称（阿拉伯文）"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={(form.addressMaps[index] as any)?.name?.en || ""}
                        onChange={(e) => updateAddressName(index, "en", e.target.value)}
                        placeholder="名称（英文）"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={addr}
                        onChange={(e) => updateAddress(index, "addresses", e.target.value)}
                        placeholder="中文地址"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={form.addressesEn[index] || ""}
                        onChange={(e) => updateAddress(index, "addressesEn", e.target.value)}
                        placeholder="英文地址"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={form.addressesJa[index] || ""}
                        onChange={(e) => updateAddress(index, "addressesJa", e.target.value)}
                        placeholder="日文地址"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={form.addressesKo[index] || ""}
                        onChange={(e) => updateAddress(index, "addressesKo", e.target.value)}
                        placeholder="韩文地址"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={form.addressesFr[index] || ""}
                        onChange={(e) => updateAddress(index, "addressesFr", e.target.value)}
                        placeholder="法文地址"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        value={form.addressesAr[index] || ""}
                        onChange={(e) => updateAddress(index, "addressesAr", e.target.value)}
                        placeholder="阿拉伯文地址"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="border-t border-gray-100 pt-2 mt-2 flex items-start gap-4 flex-wrap">
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!form.addressMaps[index]?.enabled}
                          onChange={(e) => updateAddressMap(index, "enabled", e.target.checked)}
                          className="accent-red-600"
                        />
                        为这个地址生成在线地图
                      </label>
                      {form.addressMaps[index]?.enabled && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={form.addressMaps[index]?.lat || ""}
                            onChange={(e) => updateAddressMap(index, "lat", e.target.value)}
                            placeholder="纬度"
                            className="w-28 px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-red-500 focus:border-transparent outline-none"
                          />
                          <input
                            type="text"
                            value={form.addressMaps[index]?.lng || ""}
                            onChange={(e) => updateAddressMap(index, "lng", e.target.value)}
                            placeholder="经度"
                            className="w-28 px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-red-500 focus:border-transparent outline-none"
                          />
                          <input
                            type="number"
                            value={form.addressMaps[index]?.zoom ?? 15}
                            onChange={(e) => updateAddressMap(index, "zoom", parseInt(e.target.value) || 15)}
                            placeholder="缩放"
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-red-500 focus:border-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => geocodeAddress(index)}
                            disabled={translatingAddr === index}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium"
                          >
                            <MapPin size={12} />
                            {translatingAddr === index ? "定位中..." : "从地址定位（免费）"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAddress}
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  <Plus size={16} /> 添加地址
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 社交媒体 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Link2 size={16} className="text-red-600" />
            社交媒体链接
          </h3>
          <div className="space-y-3">
          <div className="text-xs text-gray-400 leading-relaxed">自定义社交媒体与二维码（最多 7 个）。上传二维码图片后，前台页脚“关注我们”区域显示真实二维码；未上传二维码但填了主页链接时，点击名称跳转链接。名称支持 6 语种。</div>
          {(form.socials || []).map((item: any, idx: number) => (
            <div key={item.id || idx} className="border border-gray-200 rounded-md p-3 space-y-2 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" className="accent-red-600" checked={item.enabled !== false}
                      onChange={(e) => updateSocial(idx, "enabled", e.target.checked)} />
                    显示
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => translateSocialName(idx)} disabled={translatingSocial === idx}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed">
                    {translatingSocial === idx ? "翻译中..." : "一键翻译名称"}
                  </button>
                  <button type="button" onClick={() => removeSocial(idx)}
                    className="p-1 text-gray-400 hover:text-red-600" title="删除">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {["zh", "en", "ja", "ko", "fr", "ar"].map((lg) => (
                  <div key={lg}>
                    <label className="block text-[10px] text-gray-400 mb-0.5">{lg.toUpperCase()}</label>
                    <input type="text" value={item.name?.[lg] || ""}
                      onChange={(e) => updateSocialName(idx, lg, e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500 outline-none"
                      placeholder="名称" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">主页链接（可选）</label>
                  <input type="text" value={item.url || ""} onChange={(e) => updateSocial(idx, "url", e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="如 https://weibo.com/xxx" />
                </div>
                <UrlUploadInput
                  value={item.qrCode || ""}
                  onChange={(url) => updateSocial(idx, "qrCode", url)}
                  label="二维码图片（前台“关注我们”区显示）"
                  accept="image/*"
                  showPreview={true}
                  className="w-full"
                />
              </div>
            </div>
          ))}
          <button type="button" onClick={addSocial} disabled={(form.socials || []).length >= 7}
            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed">
            <Plus size={16} />
            添加社交媒体（{(form.socials || []).length}/7）
          </button>
        </div>
        </div>

        {/* 备案与版权（已统一到白标设置） */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-red-600" />
            备案与版权
          </h3>
          <p className="text-xs text-gray-400">
            备案号与版权已统一到「品牌 OEM 配置」管理（
            <a href="/admin/settings/oem" className="text-red-600 hover:text-red-700">前往设置</a>
            ），此处不再单独配置。
          </p>
        </div>

        {/* 页面内容配置 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-red-600" />
            页面内容配置（多语言）
          </h3>

          {/* 关于页 - 核心价值观 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-700">关于页 - 核心价值观</h4>
              <p className="text-xs text-gray-400 mt-1">提示：本区块数据前台暂不展示；关于页核心价值观请在「关于管理 → 企业文化」板块的“核心价值观 / 统计项”中编辑。</p>
              <button type="button" onClick={() => addContentItem("aboutValues")}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                <Plus size={14} /> 添加
              </button>
            </div>
            <div className="space-y-3">
              {form.aboutValues.map((item: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">价值观 {index + 1}</span>
                    <button type="button" onClick={() => removeContentItem("aboutValues", index)}
                      className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                  <input type="text" placeholder="图标名称（如 Target/Eye/Heart/Award）" value={item.icon || ""}
                    onChange={(e) => updateContentItem("aboutValues", index, "zh", "icon", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {LANGS.map((lang) => (
                      <input key={lang.key} type="text" placeholder={`${lang.label}标题`}
                        value={item.title?.[lang.key] || ""}
                        onChange={(e) => updateContentItem("aboutValues", index, lang.key, "title", e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {LANGS.map((lang) => (
                      <textarea key={lang.key} placeholder={`${lang.label}描述`} rows={2}
                        value={item.desc?.[lang.key] || ""}
                        onChange={(e) => updateContentItem("aboutValues", index, lang.key, "desc", e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none" />
                    ))}
                  </div>
                </div>
              ))}
              {form.aboutValues.length === 0 && <p className="text-xs text-gray-400">暂无数据，点击“添加”创建</p>}
            </div>
          </div>

          {/* 招聘页 - 福利待遇 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-700">招聘页 - 福利待遇</h4>
              <button type="button" onClick={() => addContentItem("careersBenefits")}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                <Plus size={14} /> 添加
              </button>
            </div>
            <div className="space-y-3">
              {form.careersBenefits.map((item: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">福利 {index + 1}</span>
                    <button type="button" onClick={() => removeContentItem("careersBenefits", index)}
                      className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                  <input type="text" placeholder="图标名称（如 GraduationCap/Heart/TrendingUp/Users）" value={item.icon || ""}
                    onChange={(e) => updateContentItem("careersBenefits", index, "zh", "icon", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {LANGS.map((lang) => (
                      <input key={lang.key} type="text" placeholder={`${lang.label}标题`}
                        value={item.title?.[lang.key] || ""}
                        onChange={(e) => updateContentItem("careersBenefits", index, lang.key, "title", e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {LANGS.map((lang) => (
                      <textarea key={lang.key} placeholder={`${lang.label}描述`} rows={2}
                        value={item.desc?.[lang.key] || ""}
                        onChange={(e) => updateContentItem("careersBenefits", index, lang.key, "desc", e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none" />
                    ))}
                  </div>
                </div>
              ))}
              {form.careersBenefits.length === 0 && <p className="text-xs text-gray-400">暂无数据，点击“添加”创建</p>}
            </div>
          </div>
        </div>

        {/* 高德地图配置 */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={16} className="text-red-600" />
            高德地图配置
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">高德地图API Key</label>
              <input
                type="text"
                value={form.amapKey}
                onChange={e => handleChange('amapKey', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="请输入高德地图Web端API Key"
              />
              <p className="text-xs text-gray-400 mt-1">
                前往 <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">高德开放平台</a> 申请 Web端(JS API) Key
              </p>
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 leading-relaxed">
                <b>常见错误自查：</b><br />
                ① Key 必须是「<b>Web端(JS API)</b>」类型（创建 Key 时“服务平台”选 Web端(JS API)），不能是“Web服务”类型；<br />
                ② 安全密钥填的是「<b>Key 详情页里的 JS API 安全密钥</b>」，不是 Web 服务的签名密钥（两者不同）；<br />
                ③ 务必在 Key 的「<b>域名白名单</b>」中加入本站域名（含 IP 或正式域名）；<br />
                ④ 前端加载失败时地图区域会显示具体错误码与排查指引。
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">高德地图安全密钥（securityJsCode）</label>
              <input
                type="text"
                value={form.amapSecurityCode}
                onChange={e => handleChange('amapSecurityCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="请输入高德JS API安全密钥（Key详情页获取）"
              />
              <p className="text-xs text-gray-400 mt-1">
                高德 JS API 2.0 强制要求安全密钥，未配置将无法加载（报 INVALID_USER_SCODE）。在 控制台 → 应用管理 → 对应 Key 的「安全设置」中查看/设置，并务必把本站域名加入「域名白名单」。
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">纬度</label>
              <input
                type="text"
                value={form.amapLatitude}
                onChange={e => handleChange('amapLatitude', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="如：39.9042"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">经度</label>
              <input
                type="text"
                value={form.amapLongitude}
                onChange={e => handleChange('amapLongitude', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="如：116.4074"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">缩放级别</label>
              <input
                type="text"
                value={form.amapZoom}
                onChange={e => handleChange('amapZoom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="如：15"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">标记点标题</label>
              <input
                type="text"
                value={form.amapMarkerTitle}
                onChange={e => handleChange('amapMarkerTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="如：VALTRIX"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            提示：不配置 API Key 时，联系页地图将使用「高德定位图（免 Key 内嵌）」——国内可直接访问、带中文标注，可点击跳转高德导航；配置 Web端(JS API) Key 后升级为完整交互地图（可缩放拖动）。使用高德完整地图需同时填写 API Key 与安全密钥，并在高德控制台将本站域名加入 JS API 域名白名单。经纬度可在上方地址列表中勾选「为这个地址生成在线地图」并通过「从地址定位」自动填充。
            多地址可在上方每个地址勾选「为这个地址生成在线地图」并填写经纬度（可用「从地址定位」免费自动填充）。
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setAmapPreview(!amapPreview)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-600 hover:bg-gray-100"
            >
              <MapPin size={14} className="text-red-500" />
              {amapPreview ? "收起地图预览" : "测试地图（按当前配置预览）"}
            </button>
            {amapPreview && (
              <div className="mt-2">
                {!form.amapKey && (
                  <p className="text-xs text-amber-600 mb-1">
                    当前未填写 Web端(JS API) Key，预览为免 Key 高德定位图；填写 Key 并保存后可交互（需同时填安全密钥 + 域名白名单）。
                  </p>
                )}
                <iframe
                  title="高德地图预览"
                  src={`https://uri.amap.com/marker?position=${form.amapLongitude || "116.4074"},${form.amapLatitude || "39.9042"}&name=${encodeURIComponent(form.amapMarkerTitle || form.siteName || "位置")}&src=uriapi&coordinate=gaode`}
                  width="100%"
                  height="260"
                  style={{ border: 0, borderRadius: 8 }}
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>

        {/* 系统功能开关 */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-red-600" />
            询价自动报价
          </h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.autoQuoteReply}
              onChange={e => handleChange('autoQuoteReply', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              开启后，客户提交询价将<b>自动生成报价单 PDF 并发送到客户邮箱</b>（含产品明细、预计总价、附加需求）。
              <span className="block text-xs text-gray-400 mt-1">关闭后仅通知管理员，由管理员在「报价询价单」中审核后手动发送。需要已配置 SMTP 邮件服务。</span>
            </span>
          </label>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            <Save size={16} />
            {saving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </form>
    </div>
  );
}
