import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
const langCodes: Record<string, string> = {
  en: 'en',
  ja: 'ja',
  ko: 'ko',
  fr: 'fr',
  ar: 'ar',
  de: 'de',
  es: 'es',
  ru: 'ru',
  pt: 'pt',
  it: 'it',
}

// 百度翻译API语言代码映射
const baiduLangCodes: Record<string, string> = {
  en: 'en',
  ja: 'jp',
  ko: 'kor',
  fr: 'fra',
  ar: 'ara',
  de: 'de',
  es: 'spa',
  ru: 'ru',
  pt: 'pt',
  it: 'it',
}

// 目标语言名称映射
const langNames: Record<string, string> = {
  en: '英文',
  ja: '日文',
  ko: '韩文',
  fr: '法文',
  ar: '阿拉伯文',
  de: '德文',
  es: '西班牙文',
  ru: '俄文',
  pt: '葡萄牙文',
  it: '意大利文',
}

// MyMemory语言代码映射
const myMemoryLangCodes: Record<string, string> = {
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  fr: 'fr-FR',
  ar: 'ar-SA',
  de: 'de-DE',
  es: 'es-ES',
  ru: 'ru-RU',
  pt: 'pt-PT',
  it: 'it-IT',
}

// 翻译配置接口
interface TranslateConfig {
  baiduAppId?: string
  baiduAppKey?: string
  baiduEnabled?: boolean
  aliyunAccessKeyId?: string
  aliyunAccessKeySecret?: string
  aliyunEnabled?: boolean
  niuApiKey?: string
  niuEnabled?: boolean
  tencentSecretId?: string
  tencentSecretKey?: string
  tencentEnabled?: boolean
  youdaoAppKey?: string
  youdaoAppSecret?: string
  youdaoEnabled?: boolean
  myMemoryEnabled?: boolean
  priority?: string[]
  // AI 大模型翻译（OpenAI 兼容接口）
  aiEnabled?: boolean
  aiApiKey?: string
  aiBaseUrl?: string
  aiModel?: string
}

// 获取翻译配置
async function getTranslateConfig(): Promise<TranslateConfig> {
  const config: TranslateConfig = {
    baiduAppId: process.env.BAIDU_TRANSLATE_APPID,
    baiduAppKey: process.env.BAIDU_TRANSLATE_KEY,
    baiduEnabled: true,
    niuApiKey: process.env.NIU_API_KEY,
    niuEnabled: true,
    myMemoryEnabled: true,
    aiEnabled: true,
    aiApiKey: process.env.AI_TRANSLATE_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.ARK_API_KEY || '',
    aiBaseUrl: process.env.AI_TRANSLATE_BASE_URL || 'https://api.deepseek.com/v1',
    aiModel: process.env.AI_TRANSLATE_MODEL || 'deepseek-chat',
    // 2026-09-14：移除 aliyun / tencent / baidu ——
    //   · aliyun / tencent 在本项目里只是 TODO 占位实现（直接 return null），永远不可能成功；
    //   · baidu 账户欠费（实测 error_code=54004 Please recharge），排第二只会让每次 AI 失败都白试一轮。
    // 实际可用通道：ai / niu / youdao / mymemory（见 translateServerText 与实测记录）。
    priority: ['ai', 'niu', 'youdao', 'mymemory'],
  }

  try {
    const dbConfig = await prisma.siteConfig.findUnique({
      where: { configKey: 'translate_config' },
    })
    if (dbConfig) {
      // Prisma Json 字段读出来可能是对象，也可能是历史遗留字符串；统一转对象
      const raw = dbConfig.configValue as unknown
      let configData: Record<string, any> = {}
      if (typeof raw === 'string') {
        // 历史遗留可能存了 '[object Object]' 等脏字符串；解析失败按空对象处理
        try { configData = JSON.parse(raw) || {} } catch { configData = {} }
      } else if (raw && typeof raw === 'object') {
        configData = raw as Record<string, any>
      }
      Object.assign(config, configData)
      // 兼容旧配置：优先级列表缺少 AI 通道时自动补到最前（AI 质量优先，未配 Key 会自动跳过）
      if (config.priority && Array.isArray(config.priority)) {
        const p = [...config.priority]
        if (!p.includes('ai')) p.unshift('ai')
        config.priority = p
      }
    }
  } catch (e) {
    console.error('读取翻译配置失败，使用环境变量:', e)
  }

  return config
}

// AI 大模型翻译（OpenAI 兼容接口：豆包 Ark / DeepSeek / OpenAI 等）
async function translateWithAI(text: string, targetLang: string, config: TranslateConfig): Promise<string | null> {
  if (config.aiEnabled === false) {
    console.log('AI 翻译已禁用，跳过')
    return null
  }
  const apiKey = config.aiApiKey
  if (!apiKey) {
    console.log('AI 翻译未配置 API Key，跳过')
    return null
  }
  const baseUrl = (config.aiBaseUrl || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '')
  const model = config.aiModel || 'doubao-1-5-pro-32k-250115'
  const langName = langNames[targetLang] || targetLang

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `你是一名专业的翻译。请把用户提供的内容准确翻译成${langName}。只输出翻译结果，不要任何解释、注释、引号或额外内容，保持原文的换行和段落结构。`,
          },
          { role: 'user', content: text },
        ],
      }),
    })
    if (!res.ok) {
      console.error(`AI 翻译请求失败: ${res.status}`)
      return null
    }
    const data = await res.json()
    const out = data?.choices?.[0]?.message?.content
    if (out && out.trim()) return out.trim()
  } catch (e) {
    console.error('AI 翻译失败:', (e as Error).message)
  }
  return null
}

// 百度翻译API翻译函数
async function translateWithBaidu(text: string, targetLang: string, config: TranslateConfig): Promise<string | null> {
  if (config.baiduEnabled === false) {
    console.log('百度翻译已禁用，跳过')
    return null
  }

  const appid = config.baiduAppId
  const key = config.baiduAppKey

  if (!appid || !key) {
    console.log('百度翻译API未配置，跳过')
    return null
  }

  const baiduLang = baiduLangCodes[targetLang]
  if (!baiduLang) {
    console.log(`百度翻译不支持语言: ${targetLang}`)
    return null
  }

  try {
    const salt = Math.random().toString(36).substring(2, 15)
    const sign = crypto.createHash('md5').update(`${appid}${text}${salt}${key}`).digest('hex')

    const params = new URLSearchParams({
      q: text,
      from: 'zh',
      to: baiduLang,
      appid: appid,
      salt: salt,
      sign: sign,
    })

    const response = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      console.error(`百度翻译API请求失败: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.error_code) {
      console.error(`百度翻译API错误: ${data.error_code} - ${data.error_msg}`)
      return null
    }

    if (data.trans_result && data.trans_result.length > 0) {
      const translatedText = data.trans_result.map((item: any) => item.dst).join('\n')
      console.log(`百度翻译成功: ${translatedText.substring(0, 50)}...`)
      return translatedText
    }

    return null
  } catch (error) {
    console.error('百度翻译API调用失败:', error)
    return null
  }
}

// 小牛翻译API翻译函数
async function translateWithNiu(text: string, targetLang: string, config: TranslateConfig): Promise<string | null> {
  if (config.niuEnabled === false) {
    console.log('小牛翻译已禁用，跳过')
    return null
  }

  const apiKey = config.niuApiKey
  if (!apiKey) {
    console.log('小牛翻译API未配置，跳过')
    return null
  }

  const niuLang = langCodes[targetLang]
  if (!niuLang) {
    console.log(`小牛翻译不支持语言: ${targetLang}`)
    return null
  }

  try {
    const response = await fetch('https://api.niutrans.com/NiuTransServer/translation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'zh',
        to: niuLang,
        apikey: apiKey,
        src_text: text,
      }),
    })

    if (!response.ok) {
      console.error(`小牛翻译API请求失败: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.error_code) {
      console.error(`小牛翻译API错误: ${data.error_code} - ${data.error_msg}`)
      return null
    }

    if (data.tgt_text) {
      console.log(`小牛翻译成功: ${data.tgt_text.substring(0, 50)}...`)
      return data.tgt_text
    }

    return null
  } catch (error) {
    console.error('小牛翻译API调用失败:', error)
    return null
  }
}

// 有道翻译API翻译函数
async function translateWithYoudao(text: string, targetLang: string, config: TranslateConfig): Promise<string | null> {
  if (config.youdaoEnabled === false) {
    console.log('有道翻译已禁用，跳过')
    return null
  }

  const appKey = config.youdaoAppKey
  const appSecret = config.youdaoAppSecret

  if (!appKey || !appSecret) {
    console.log('有道翻译API未配置，跳过')
    return null
  }

  const youdaoLang = langCodes[targetLang]
  if (!youdaoLang) {
    console.log(`有道翻译不支持语言: ${targetLang}`)
    return null
  }

  try {
    const salt = crypto.randomBytes(16).toString('hex')
    const curtime = Math.floor(Date.now() / 1000).toString()
    const signStr = appKey + (text.length > 20 ? text.substring(0, 10) + text.length + text.substring(text.length - 10) : text) + salt + curtime + appSecret
    const sign = crypto.createHash('sha256').update(signStr).digest('hex')

    const params = new URLSearchParams({
      q: text,
      from: 'zh-CHS',
      to: youdaoLang,
      appKey: appKey,
      salt: salt,
      sign: sign,
      signType: 'v3',
      curtime: curtime,
    })

    const response = await fetch('https://openapi.youdao.com/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      console.error(`有道翻译API请求失败: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.errorCode && data.errorCode !== '0') {
      console.error(`有道翻译API错误: ${data.errorCode}`)
      return null
    }

    if (data.translation && data.translation.length > 0) {
      const translatedText = data.translation.join('\n')
      console.log(`有道翻译成功: ${translatedText.substring(0, 50)}...`)
      return translatedText
    }

    return null
  } catch (error) {
    console.error('有道翻译API调用失败:', error)
    return null
  }
}

// MyMemory翻译API翻译函数
async function translateWithMyMemory(text: string, targetLang: string, config: TranslateConfig): Promise<string | null> {
  if (config.myMemoryEnabled === false) {
    console.log('MyMemory翻译已禁用，跳过')
    return null
  }

  const targetLangCode = myMemoryLangCodes[targetLang] || targetLang
  const maxRetries = 3
  const retryDelay = 2000

  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      console.log(`MyMemory翻译尝试 ${retry + 1}/${maxRetries}`)

      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|${targetLangCode}`

      const myMemoryRes = await fetch(myMemoryUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (myMemoryRes.status === 429) {
        console.log(`MyMemory返回429错误，等待${retryDelay}ms后重试...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }

      if (myMemoryRes.ok) {
        const myMemoryData = await myMemoryRes.json()
        const translatedText = myMemoryData.responseData?.translatedText || ''

        if (translatedText && translatedText.trim() !== '') {
          const cleanedText = translatedText
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .trim()

          console.log(`MyMemory翻译成功: ${cleanedText.substring(0, 50)}...`)
          return cleanedText
        }
      }
    } catch (e) {
      console.error('MyMemory翻译失败:', e)
    }
  }

  return null
}

// 阿里翻译API翻译函数（占位，需要完整实现）
async function translateWithAliyun(text: string, targetLang: string, config: TranslateConfig): Promise<string | null> {
  if (config.aliyunEnabled === false) {
    console.log('阿里翻译已禁用，跳过')
    return null
  }
  // TODO: 实现阿里翻译API
  console.log('阿里翻译API尚未实现，跳过')
  return null
}

// 腾讯翻译API翻译函数（占位，需要完整实现）
async function translateWithTencent(text: string, targetLang: string, config: TranslateConfig): Promise<string | null> {
  if (config.tencentEnabled === false) {
    console.log('腾讯翻译已禁用，跳过')
    return null
  }
  // TODO: 实现腾讯翻译API
  console.log('腾讯翻译API尚未实现，跳过')
  return null
}

// 将英文文本的每个单词首字母大写（用于标题类内容）
function capitalizeEnglishTitle(text: string): string {
  if (!text) return text
  // 只处理英文文本（包含英文字母）
  if (!/[a-zA-Z]/.test(text)) return text
  // 将每个单词的首字母大写
  let result = text.replace(/\b\w/g, (char) => char.toUpperCase())
  // 修正所有格：World'S → World's（撇号后的字母不算新词）
  result = result.replace(/'([A-Z])/g, (m, c) => `'${c.toLowerCase()}`)
  return result
}

// 检测是否为富文本HTML内容
function isHtmlContent(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text)
}

// 提取HTML中的纯文本（用于翻译）
function extractTextFromHtml(html: string): string {
  // 移除HTML标签，保留文本内容
  return html.replace(/<[^>]*>/g, '').trim()
}

// 按段落分割HTML内容，保留每个段落的标签和样式
function splitHtmlByParagraphs(html: string): Array<{ tag: string; style: string; content: string }> {
  const paragraphs: Array<{ tag: string; style: string; content: string }> = []
  
  try {
    // 匹配<p>、<div>、<h1>-<h6>等块级元素
    const blockRegex = /<(p|div|h[1-6]|li|blockquote|pre)([^>]*)>([\s\S]*?)<\/\1>/gi
    let match
    let lastIndex = 0
    const maxIterations = 100 // 防止无限循环
    let iterations = 0
    
    while ((match = blockRegex.exec(html)) !== null && iterations < maxIterations) {
      iterations++
      
      // 防止零长度匹配导致的无限循环
      if (match.index === blockRegex.lastIndex) {
        blockRegex.lastIndex++
        continue
      }
      
      const tag = match[1].toLowerCase()
      const attrs = match[2] || ''
      const content = match[3] || ''
      
      // 提取style属性
      const styleMatch = attrs.match(/style\s*=\s*["']([^"']*)["']/i)
      const style = styleMatch ? styleMatch[1] : ''
      
      paragraphs.push({ tag, style, content })
      lastIndex = blockRegex.lastIndex
    }
  } catch (e) {
    console.error('分割HTML段落失败:', e)
  }
  
  // 如果没有匹配到块级元素，将整个内容作为一个段落
  if (paragraphs.length === 0 && html.trim()) {
    paragraphs.push({ tag: 'p', style: '', content: html })
  }
  
  return paragraphs
}

// 保护HTML标签，避免被翻译服务破坏
function protectHtmlTags(html: string): { text: string; tags: string[] } {
  const tags: string[] = [];
  // 匹配所有HTML标签（包括开标签、闭标签、自闭合标签）
  let protectedText = html.replace(/<[^>]+>/g, (match) => {
    const index = tags.length;
    tags.push(match);
    return `__HTML_TAG_${index}__`;
  });
  return { text: protectedText, tags };
}

// 恢复HTML标签
function restoreHtmlTags(text: string, tags: string[]): string {
  let restoredText = text;
  // 翻译服务（如MyMemory）可能会改写占位符格式：
  // 原始: __HTML_TAG_0__  → 可能变成 __ HTML _ TAG _ 0 __ / _ _ HTML_TAG _ 1 _ _
  // 甚至合并相邻占位符的下划线边界，导致无法用固定模式匹配
  // 因此使用宽松正则分两遍匹配各种变体
  const startsWithP = /^\s*<p[\s>]/i.test(text);
  let replaced = 0;

  // 第一遍：匹配带下划线边界的完整占位符
  restoredText = restoredText.replace(/_+[\s_]*HTML[\s_]*TAG[\s_]*(\d+)[\s_]*_+/gi, (match, numStr) => {
    const idx = parseInt(numStr, 10);
    replaced++;
    // 文本开头已有 <p>（翻译服务可能额外添加）时，跳过 TAG_0 避免双 <p>
    if (idx === 0 && startsWithP && replaced === 1) return '';
    return idx >= 0 && idx < tags.length ? tags[idx] : '';
  });

  // 第二遍：匹配被第一遍遗漏的无下划线边界占位符（相邻占位符共享下划线时）
  restoredText = restoredText.replace(/HTML[\s_]*TAG[\s_]*(\d+)/gi, (match, numStr) => {
    const idx = parseInt(numStr, 10);
    if (idx === 0 && startsWithP) return '';
    return idx >= 0 && idx < tags.length ? tags[idx] : '';
  });

  // 清理占位符周边残留的孤立下划线和多余空白
  restoredText = restoredText.replace(/_{1,3}/g, ' ');
  restoredText = restoredText.replace(/ {2,}/g, ' ');
  restoredText = restoredText.replace(/\s+</g, '<');
  restoredText = restoredText.replace(/>\s+/g, '>');
  return restoredText;
}

// 为阿拉伯文等 RTL 语言的 <p> 添加 dir="rtl" 与右对齐样式
function applyRtlToParagraphs(html: string, targetLang: string): string {
  const rtlLangs = ['ar', 'he', 'fa', 'ur'];
  if (!rtlLangs.includes(targetLang)) return html;
  return html.replace(/<p\b([^>]*)>/g, (match, attrs) => {
    if (attrs.includes('dir=')) return match;
    if (attrs.includes('style=')) {
      return match.replace(/style="([^"]*)"/, `style="$1; text-align: right; direction: rtl;"`);
    }
    return `<p${attrs} style="text-align: right; direction: rtl;">`;
  });
}

// 翻译富文本内容，保留HTML标签和排版格式
async function translateHtmlContent(
  html: string,
  targetLang: string,
  translateFn: (text: string, targetLang: string) => Promise<string | null>
): Promise<string | null> {
  try {
    console.log('开始富文本翻译，内容长度:', html.length);
    
    // 方法1：保护HTML标签，只翻译文本内容
    const { text: protectedText, tags } = protectHtmlTags(html);
    console.log(`保护了 ${tags.length} 个HTML标签`);
    
    // 翻译保护后的文本
    const translatedProtectedText = await translateFn(protectedText, targetLang);
    
    if (!translatedProtectedText) {
      console.log('翻译服务返回空，降级到下一个服务');
      return null; // 返回 null，让 priority 循环尝试下一个翻译服务，而不是返回原文
    }
    
    // 恢复HTML标签
    let result = restoreHtmlTags(translatedProtectedText, tags);
    
    // 对于从右到左书写的语言（阿拉伯文、希伯来文等），添加dir="rtl"属性
    result = applyRtlToParagraphs(result, targetLang);
    
    console.log('富文本翻译完成，结果长度:', result.length);
    return result;
  } catch (error) {
    console.error('富文本翻译失败，回退到普通翻译:', error);
    return await translateFn(html, targetLang);
  }
}

export interface TranslateServerResult {
  translatedText: string;
  note: string;
  provider: string;
}

export async function translateServerText(
  text: string,
  targetLang: string = 'en',
  capitalize: boolean = false
): Promise<TranslateServerResult> {
  const targetLangName = langNames[targetLang] || targetLang
  const config = await getTranslateConfig()
  const priority = config.priority || ['ai', 'niu', 'youdao', 'mymemory']

  const translators: Record<string, (text: string, targetLang: string, config: TranslateConfig) => Promise<string | null>> = {
    ai: translateWithAI,
    baidu: translateWithBaidu,
    aliyun: translateWithAliyun,
    niu: translateWithNiu,
    tencent: translateWithTencent,
    youdao: translateWithYoudao,
    mymemory: translateWithMyMemory,
  }

  for (const provider of priority) {
    const translator = translators[provider]
    if (!translator) continue

    const isHtml = isHtmlContent(text)

    let translatedText: string | null
    if (isHtml) {
      if (provider === 'ai') {
        translatedText = await translateWithAI(text, targetLang, config)
        if (translatedText) translatedText = applyRtlToParagraphs(translatedText, targetLang)
      } else {
        const translateWrapper = async (t: string, lang: string): Promise<string | null> => {
          return await translator(t, lang, config)
        }
        translatedText = await translateHtmlContent(text, targetLang, translateWrapper)
      }
    } else {
      translatedText = await translator(text, targetLang, config)
    }

    if (translatedText) {
      const finalText =
        capitalize && targetLang === 'en' && !isHtml ? capitalizeEnglishTitle(translatedText) : translatedText
      return {
        translatedText: finalText,
        note: '使用' + provider + '翻译为' + targetLangName + (isHtml ? '（已保留富文本格式）' : ''),
        provider,
      }
    }
  }

  return {
    translatedText: text,
    note: '翻译服务暂时不可用，已返回原文。',
    provider: 'fallback',
  }
}
