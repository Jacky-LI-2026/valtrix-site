import path from 'path'

// 修复：Next.js 服务端打包后 __dirname 不再指向 geoip-lite 包目录，
// 导致其通过 __dirname 查找数据文件失败（route 返回 404）。
// geoip-lite 支持 GEODATADIR 环境变量覆盖数据目录（绝对路径可覆盖错误基准）。
if (!process.env.GEODATADIR) {
  process.env.GEODATADIR = path.join(process.cwd(), 'node_modules/geoip-lite', 'data')
}
// 在设置 GEODATADIR 之后再加载库，且用 require 确保运行时解析
const geoip = require('geoip-lite') as {
  lookup(ip: string): { country?: string; region?: string; city?: string; timezone?: string } | null
}

// 国家代码 → 中文名（常用）
const COUNTRY_ZH: Record<string, string> = {
  CN: '中国', US: '美国', JP: '日本', KR: '韩国', DE: '德国', FR: '法国',
  GB: '英国', RU: '俄罗斯', CA: '加拿大', AU: '澳大利亚', SG: '新加坡',
  MY: '马来西亚', TH: '泰国', VN: '越南', ID: '印度尼西亚', IN: '印度',
  IT: '意大利', ES: '西班牙', NL: '荷兰', CH: '瑞士', SE: '瑞典', FI: '芬兰',
  NO: '挪威', DK: '丹麦', PL: '波兰', UA: '乌克兰', TR: '土耳其', BR: '巴西',
  MX: '墨西哥', AR: '阿根廷', ZA: '南非', EG: '埃及', SA: '沙特阿拉伯',
  AE: '阿联酋', IL: '以色列', HK: '中国香港', TW: '中国台湾', MO: '中国澳门',
  PH: '菲律宾', PK: '巴基斯坦', BD: '孟加拉国', IR: '伊朗', KZ: '哈萨克斯坦',
  NZ: '新西兰', IE: '爱尔兰', AT: '奥地利', BE: '比利时', PT: '葡萄牙',
  CZ: '捷克', GR: '希腊', HU: '匈牙利', RO: '罗马尼亚', BG: '保加利亚',
  CL: '智利', CO: '哥伦比亚', PE: '秘鲁', NG: '尼日利亚', KE: '肯尼亚',
  // 其他
}

// 中国省级行政区（MaxMind region 码）
const CN_REGION_ZH: Record<string, string> = {
  BJ: '北京', SH: '上海', TJ: '天津', CQ: '重庆',
  GD: '广东', SC: '四川', HN: '湖南', HB: '湖北', HA: '河南', HE: '河北',
  SD: '山东', JS: '江苏', ZJ: '浙江', FJ: '福建', JX: '江西', AH: '安徽',
  SN: '陕西', SX: '山西', GS: '甘肃', NX: '宁夏', QH: '青海', XJ: '新疆',
  XZ: '西藏', YN: '云南', GZ: '贵州', GX: '广西', HI: '海南',
  LN: '辽宁', JL: '吉林', HL: '黑龙江', NM: '内蒙古',
}

// 美国州（部分）
const US_REGION_ZH: Record<string, string> = {
  CA: '加利福尼亚', NY: '纽约', TX: '得克萨斯', FL: '佛罗里达', WA: '华盛顿州',
  IL: '伊利诺伊', MA: '马萨诸塞', NJ: '新泽西', PA: '宾夕法尼亚', GA: '佐治亚',
}

function isPrivateIP(ip: string | null | undefined): boolean {
  if (!ip || ip === 'unknown' || ip === '') return true
  const t = ip.trim()
  // IPv6 或特殊地址
  if (t.includes(':')) {
    if (t === '::1' || t === '::' || t.startsWith('fe80') || t.startsWith('fc') || t.startsWith('fd')) return true
    return false // 其他 IPv6 交给 geoip（基本解析不到）
  }
  const p = t.split('.').map(Number)
  if (p.length !== 4) return true
  if (p[0] === 10) return true
  if (p[0] === 127) return true
  if (p[0] === 0) return true
  if (p[0] === 169 && p[1] === 254) return true
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true
  if (p[0] === 192 && p[1] === 168) return true
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true // CGNAT
  return false
}

export interface GeoInfo {
  country: string // 中文国家名
  countryCode: string
  region: string // 中文省/州
  city: string
  label: string // 完整展示
  isLocal: boolean
}

/**
 * 根据 IP 解析地域信息。
 * 内网/保留 IP 返回 isLocal=true 的本地信息；解析不到返回 null。
 */
export function getGeoInfo(ip: string | null | undefined): GeoInfo | null {
  if (isPrivateIP(ip)) {
    return { country: '本地/内网', countryCode: 'LOCAL', region: '', city: '', label: '本地/内网', isLocal: true }
  }
  try {
    const g = geoip.lookup(ip as string)
    if (!g || !g.country) return null
    const cc = g.country
    const country = COUNTRY_ZH[cc] || cc
    let region = g.region || ''
    if (cc === 'CN' && CN_REGION_ZH[region]) region = CN_REGION_ZH[region]
    else if (cc === 'US' && US_REGION_ZH[region]) region = US_REGION_ZH[region]
    else if (region) region = region.toUpperCase()
    const city = g.city || ''
    const parts = [country, region, city].filter(Boolean)
    return {
      country,
      countryCode: cc,
      region,
      city,
      label: parts.join(' · '),
      isLocal: false,
    }
  } catch {
    return null
  }
}

/**
 * 从请求头中提取真实客户端 IP（支持直连 / Nginx / CDN 反代）。
 * 依次尝试 x-forwarded-for / x-real-ip / cf-connecting-ip / x-client-ip，
 * 取第一个非内网 IP；全部内网或缺失返回 null（调用方决定如何处理）。
 */
export function getClientIp(headers: Headers | Record<string, string | string[] | null | undefined>): string | null {
  const get = (k: string): string | null => {
    const h = headers as any;
    if (typeof h.get === "function") {
      const v = h.get(k);
      return v ? String(v) : null;
    }
    const v = h[k];
    if (v == null) return null;
    return Array.isArray(v) ? (v[0] || null) : String(v);
  };
  const candidates = [
    get("x-forwarded-for"),
    get("x-real-ip"),
    get("cf-connecting-ip"),
    get("x-client-ip"),
  ];
  for (const c of candidates) {
    if (!c) continue;
    const parts = String(c)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (!isPrivateIP(part)) return part;
    }
  }
  return null;
}

/**
 * 一行获取地域信息并返回可写库的字段（ip/country/city）。
 * 解析不到或本地 IP 时返回可落库的兜底值，保证后台永远有显示。
 */
export function getLocationFields(ip: string | null | undefined): { ip: string | null; country: string | null; city: string | null } {
  if (!ip) return { ip: null, country: null, city: null };
  const g = getGeoInfo(ip);
  if (!g) return { ip, country: null, city: null };
  return { ip, country: g.country, city: g.city || g.region || null };
}
