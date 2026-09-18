import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { recordOperation } from '@/lib/operation-log'
import { getAdminSiteId } from '@/lib/tenant/admin-scope'
import { setSiteConfigValue } from '@/lib/tenant/site-config'
import { getContactEmail, getBrandName, getBrandNameEn } from '@/lib/brand';

// 默认站点配置项
const DEFAULT_CONFIG: Record<string, any> = {
  siteName: getBrandName(),
  siteNameEn: getBrandNameEn(),
  siteDescription: String(process.env.NEXT_PUBLIC_SITE_DESCRIPTION || ''),
  siteKeywords: String(process.env.NEXT_PUBLIC_SITE_KEYWORDS || ''),
  logo: '',
  phone: '010-8888-8888',
  email: getContactEmail(),
  address: '北京市朝阳区xxx路xxx号',
  addresses: [] as string[],
  addressesEn: [] as string[],
  addressesJa: [] as string[],
  addressesKo: [] as string[],
  addressesFr: [] as string[],
  addressesAr: [] as string[],
  addressMaps: [] as any[],
  icp: '京ICP备xxxxxxxx号',
  // 商城对公收款账户 {bankName, accountName, accountNo, branch, remark}
  shop_bank_info: null as any,
  wechat: '',
  weibo: '',
  linkedin: '',
  youtube: '',
  socials: [] as any[],
  copyright: getBrandName() ? `© ${new Date().getFullYear()} ${getBrandName()} 版权所有` : "",
  // 高德地图配置
  amapKey: '',
  amapSecurityCode: '',
  amapLatitude: '39.9042',
  amapLongitude: '116.4074',
  amapZoom: '15',
  amapMarkerTitle: getBrandName(),
  // 页面内容配置（多语言）
  aboutValues: [] as any[],
  careersBenefits: [] as any[],
  // 域名信息（与商业授权关联）
  siteDomain: '',
  siteDomainRemark: '',
  // 管理员通知邮箱（新留言/下载留资邮件通知收件人）
  notifyEmail: '',
  // 简历接收邮箱（多个，逗号分隔）
  recruitEmails: '',
  // 页面头部背景配置（按路径索引）
  page_hero_config: {} as Record<string, any>,
  // 前台「模板展示」入口开关（默认开启）
  showTemplatePreviewMenu: true,
  // 询价自动报价回执（提交询价后自动生成报价单 PDF 发客户邮箱；默认开启）
  autoQuoteReply: true,
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const configs = await prisma.siteConfig.findMany()
    const result = { ...DEFAULT_CONFIG }
    configs.forEach((c: any) => {
      if (c.configValue !== null && c.configValue !== undefined) {
        try {
          // 数组直接返回，对象转 JSON 字符串
          result[c.configKey] = Array.isArray(c.configValue)
            ? c.configValue
            : typeof c.configValue === 'object'
              ? JSON.stringify(c.configValue)
              : c.configValue
        } catch (e) {
          result[c.configKey] = String(c.configValue)
        }
      }
    })

    // 联系方式字段优先从 contact_info 读取（前台实际消费该配置，真实数据源）
    // 避免用 DEFAULT_CONFIG 占位值覆盖真实联系信息
    try {
      const contactInfo = await prisma.siteConfig.findUnique({
        where: { configKey: 'contact_info' },
      })
      const ci = contactInfo?.configValue
      if (ci && typeof ci === 'object' && !Array.isArray(ci)) {
        const info = ci as Record<string, any>
        ;['logo', 'phone', 'email', 'address', 'addressEn', 'recruitEmails'].forEach((k) => {
          if (info[k] !== undefined && info[k] !== null && info[k] !== '') result[k] = info[k]
        })
        if (Array.isArray(info.addresses)) result.addresses = info.addresses
        if (Array.isArray(info.addressesEn)) result.addressesEn = info.addressesEn
        if (Array.isArray(info.addressesJa)) result.addressesJa = info.addressesJa
        if (Array.isArray(info.addressesKo)) result.addressesKo = info.addressesKo
        if (Array.isArray(info.addressesFr)) result.addressesFr = info.addressesFr
        if (Array.isArray(info.addressesAr)) result.addressesAr = info.addressesAr
        if (Array.isArray(info.addressMaps)) result.addressMaps = info.addressMaps
        if (Array.isArray(info.socials)) result.socials = info.socials
        ;['amapKey', 'amapSecurityCode', 'amapLatitude', 'amapLongitude', 'amapZoom', 'amapMarkerTitle'].forEach((k) => {
          if (info[k] !== undefined && info[k] !== null && info[k] !== '') result[k] = info[k]
        })
        // contact_info 没有多地址配置时，清空独立配置可能残留的 addresses，统一回退单地址
        if (!Array.isArray(info.addresses)) result.addresses = []
        if (!Array.isArray(info.addressesEn)) result.addressesEn = []
        if (!Array.isArray(info.addressesJa)) result.addressesJa = []
        if (!Array.isArray(info.addressesKo)) result.addressesKo = []
        if (!Array.isArray(info.addressesFr)) result.addressesFr = []
        if (!Array.isArray(info.addressesAr)) result.addressesAr = []
      }
    } catch (e) {
      console.warn('读取 contact_info 失败:', e)
    }

    // 站点级覆盖合并（后台站点视角非全局时，覆盖全局配置）
    const viewSiteId = getAdminSiteId()
    if (viewSiteId) {
      const overrides = await prisma.siteConfigOverride.findMany({
        where: { siteId: BigInt(viewSiteId) },
      })
      overrides.forEach((c: any) => {
        if (c.configValue !== null && c.configValue !== undefined) {
          try {
            result[c.configKey] = Array.isArray(c.configValue)
              ? c.configValue
              : typeof c.configValue === 'object'
                ? JSON.stringify(c.configValue)
                : c.configValue
            // 站点级 contact_info 覆盖同样解构为扁平字段（与全局 contact_info 行为一致）
            if (c.configKey === 'contact_info') {
              const info = typeof c.configValue === 'object'
                ? c.configValue
                : typeof c.configValue === 'string'
                  ? JSON.parse(c.configValue)
                  : null
              if (info && typeof info === 'object' && !Array.isArray(info)) {
                ;['logo', 'phone', 'email', 'address', 'addressEn', 'recruitEmails'].forEach((k) => {
                  if (info[k] !== undefined && info[k] !== null && info[k] !== '') result[k] = info[k]
                })
                ;['addresses', 'addressesEn', 'addressesJa', 'addressesKo', 'addressesFr', 'addressesAr', 'addressMaps', 'socials'].forEach((k) => {
                  if (Array.isArray(info[k])) result[k] = info[k]
                })
                ;['amapKey', 'amapSecurityCode', 'amapLatitude', 'amapLongitude', 'amapZoom', 'amapMarkerTitle'].forEach((k) => {
                  if (info[k] !== undefined && info[k] !== null && info[k] !== '') result[k] = info[k]
                })
              }
            }
          } catch (e) {
            result[c.configKey] = String(c.configValue)
          }
        }
      })
    }

    return NextResponse.json(serializeBigInt(result))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const body = await req.json()
    // 目标站点维度：后台站点视角非全局时写入站点级覆盖
    const targetSiteId = getAdminSiteId()
    const scope = targetSiteId ? BigInt(targetSiteId) : null

    // 批量更新配置
    for (const [key, value] of Object.entries(body)) {
      if (key in DEFAULT_CONFIG || key.startsWith('custom_')) {
        if (scope) {
          await setSiteConfigValue(key, value as any, scope)
        } else {
          const existing = await prisma.siteConfig.findUnique({
            where: { configKey: key },
          })
          if (existing) {
            await prisma.siteConfig.update({
              where: { configKey: key },
              data: { configValue: value as any },
            })
          } else {
            await prisma.siteConfig.create({
              data: { configKey: key, configValue: value as any },
            })
          }
        }
      }
    }

    // 同步联系信息到 contact_info（前台读取该配置）
    // 支持字段：logo/phone/email/address/addresses/addressEn/addressesEn
    if (
      'logo' in body || 'phone' in body || 'email' in body ||
      'address' in body || 'addresses' in body || 'addressEn' in body || 'addressesEn' in body || 'addressesJa' in body || 'addressesKo' in body || 'addressesFr' in body || 'addressesAr' in body || 'addressMaps' in body || 'socials' in body || 'siteDomain' in body || 'siteDomainRemark' in body || 'amapKey' in body || 'amapSecurityCode' in body || 'amapLatitude' in body || 'amapLongitude' in body || 'amapZoom' in body || 'amapMarkerTitle' in body || 'recruitEmails' in body
    ) {
      const contactConfig = await prisma.siteConfig.findUnique({
        where: { configKey: 'contact_info' },
      })
      let contactInfo: Record<string, any> = {}
      if (contactConfig?.configValue && typeof contactConfig.configValue === 'object' && !Array.isArray(contactConfig.configValue)) {
        contactInfo = { ...(contactConfig.configValue as Record<string, any>) }
      } else if (contactConfig?.configValue && typeof contactConfig.configValue === 'string') {
        try { contactInfo = JSON.parse(contactConfig.configValue) } catch (e) { contactInfo = {} }
      }

      const syncFields = ['logo', 'phone', 'email', 'address', 'addressEn']
      syncFields.forEach((f) => {
        if (f in body) contactInfo[f] = body[f]
      })
      // 多地址（数组）同步
      if ('addresses' in body) contactInfo.addresses = body.addresses
      if ('addressesEn' in body) contactInfo.addressesEn = body.addressesEn
      if ('addressesJa' in body) contactInfo.addressesJa = body.addressesJa
      if ('addressesKo' in body) contactInfo.addressesKo = body.addressesKo
      if ('addressesFr' in body) contactInfo.addressesFr = body.addressesFr
      if ('addressesAr' in body) contactInfo.addressesAr = body.addressesAr
      if ('addressMaps' in body) contactInfo.addressMaps = body.addressMaps
      if ('socials' in body) contactInfo.socials = body.socials
      if ('siteDomain' in body) contactInfo.siteDomain = body.siteDomain
      if ('siteDomainRemark' in body) contactInfo.siteDomainRemark = body.siteDomainRemark
      if ('amapKey' in body) contactInfo.amapKey = body.amapKey
      if ('amapSecurityCode' in body) contactInfo.amapSecurityCode = body.amapSecurityCode
      if ('amapLatitude' in body) contactInfo.amapLatitude = body.amapLatitude
      if ('amapLongitude' in body) contactInfo.amapLongitude = body.amapLongitude
      if ('amapZoom' in body) contactInfo.amapZoom = body.amapZoom
      if ('amapMarkerTitle' in body) contactInfo.amapMarkerTitle = body.amapMarkerTitle
      if ('recruitEmails' in body) contactInfo.recruitEmails = body.recruitEmails

      // 主地址（第一个）同步到单地址字段
      const addrArr = Array.isArray(body.addresses) ? body.addresses.filter(Boolean) : []
      if (addrArr.length > 0) {
        contactInfo.address = addrArr[0]
        const addrEnArr = Array.isArray(body.addressesEn) ? body.addressesEn.filter(Boolean) : []
        if (addrEnArr.length > 0) contactInfo.addressEn = addrEnArr[0]
      }

      if (scope) {
        await setSiteConfigValue('contact_info', contactInfo as any, scope)
      } else {
        await prisma.siteConfig.upsert({
          where: { configKey: 'contact_info' },
          update: { configValue: contactInfo as any },
          create: { configKey: 'contact_info', configValue: contactInfo as any },
        })
      }
    }

    // 记录操作日志
    await recordOperation({ module: 'settings', action: 'update', target: '站点配置' })

    return NextResponse.json({ success: true, message: '站点配置已保存' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
