/**
 * 社媒「一键发布」渠道目录 + 适配器
 * ==========================================================================
 * 分三类，这个分类很重要（决定了"能不能真发出去"）：
 *
 *  ① `webhook` —— **零门槛、开箱可用**：企业微信 / 钉钉 / 飞书 群机器人、Slack / Discord
 *     / 自定义 Webhook。只要在对应平台建一个机器人拿到 Webhook URL 就行，不需要开发者资质。
 *  ② `token` —— 有开放发文接口、但需要**你自己申请开发者应用**拿到凭据：
 *     Telegram（Bot Token）、微博（access_token）、Facebook 主页（Page Token）、
 *     LinkedIn（OAuth Token）、X/Twitter（Bearer Token）。
 *  ③ `manual` —— 平台**不开放第三方发文接口**（小红书 / 抖音 / 视频号 / B站 / 知乎 / 公众号）：
 *     插件负责把文案生成好（按平台字数与话题标签微调），你一键复制后去平台粘贴发布。
 *     ⚠️ 这类不做"假装发布"——接口如实返回 `manual:true`，UI 给出复制 + 打开发布页。
 *
 * 依赖：只用 Node 内置 fetch，不引第三方 SDK（G5：通用能力走统一入口，避免引入维护负担）。
 */

export type ChannelKind = "webhook" | "token" | "manual";

export interface ChannelField {
  key: string;
  label: string;
  placeholder?: string;
  /** 密钥型：UI 用密码框展示 */
  secret?: boolean;
  hint?: string;
}

export interface ChannelDef {
  id: string;
  /** 平台名（展示用） */
  platform: string;
  label: string;
  region: "cn" | "intl";
  kind: ChannelKind;
  fields: ChannelField[];
  /** manual 渠道：平台发布入口 */
  manualUrl?: string;
  /** manual 渠道：正文字数上限（用于生成合适的文案） */
  maxLength?: number;
  hint?: string;
}

export const CHANNELS: ChannelDef[] = [
  // ===== ① 零门槛：群机器人 / Webhook =====
  {
    id: "wecom",
    platform: "企业微信",
    label: "企业微信群机器人",
    region: "cn",
    kind: "webhook",
    fields: [{ key: "webhook", label: "机器人 Webhook URL", placeholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…", secret: true }],
    hint: "企业微信群 → 添加群机器人 → 复制 Webhook 地址",
  },
  {
    id: "dingtalk",
    platform: "钉钉",
    label: "钉钉群机器人",
    region: "cn",
    kind: "webhook",
    fields: [{ key: "webhook", label: "机器人 Webhook URL", placeholder: "https://oapi.dingtalk.com/robot/send?access_token=…", secret: true }],
    hint: "钉钉群 → 群设置 → 智能群助手 → 添加机器人（自定义）",
  },
  {
    id: "feishu",
    platform: "飞书",
    label: "飞书群机器人",
    region: "cn",
    kind: "webhook",
    fields: [{ key: "webhook", label: "机器人 Webhook URL", placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/…", secret: true }],
  },
  {
    id: "slack",
    platform: "Slack",
    label: "Slack Incoming Webhook",
    region: "intl",
    kind: "webhook",
    fields: [{ key: "webhook", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/…", secret: true }],
  },
  {
    id: "discord",
    platform: "Discord",
    label: "Discord Webhook",
    region: "intl",
    kind: "webhook",
    fields: [{ key: "webhook", label: "Webhook URL", placeholder: "https://discord.com/api/webhooks/…", secret: true }],
  },
  {
    id: "custom-webhook",
    platform: "自定义",
    label: "自定义 Webhook（JSON POST）",
    region: "intl",
    kind: "webhook",
    fields: [
      { key: "webhook", label: "Webhook URL", secret: true },
      { key: "token", label: "可选：Authorization 头", placeholder: "Bearer xxx", secret: true },
    ],
    hint: "会 POST {title, description, url, image, platform, content_type} 到你的地址（可对接 Zapier / Make / n8n / Buffer）",
  },

  // ===== ② 需要开发者凭据 =====
  {
    id: "telegram",
    platform: "Telegram",
    label: "Telegram 频道/群",
    region: "intl",
    kind: "token",
    fields: [
      { key: "botToken", label: "Bot Token", placeholder: "123456:ABC-DEF…", secret: true },
      { key: "chatId", label: "Chat ID", placeholder: "@your_channel 或 -1001234567890" },
    ],
    hint: "找 @BotFather 建 Bot 拿 Token；把 Bot 拉进频道设为管理员",
  },
  {
    id: "weibo",
    platform: "微博",
    label: "微博（开放平台）",
    region: "cn",
    kind: "token",
    fields: [{ key: "accessToken", label: "Access Token", secret: true, hint: "微博开放平台 → 我的应用 → 授权拿 token（有效期有限，需定期刷新）" }],
  },
  {
    id: "facebook-page",
    platform: "Facebook",
    label: "Facebook 主页",
    region: "intl",
    kind: "token",
    fields: [
      { key: "pageId", label: "Page ID" },
      { key: "accessToken", label: "Page Access Token", secret: true },
    ],
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    label: "LinkedIn（个人或公司主页）",
    region: "intl",
    kind: "token",
    fields: [
      { key: "accessToken", label: "OAuth Access Token", secret: true },
      { key: "author", label: "Author URN", placeholder: "urn:li:person:xxxx 或 urn:li:organization:123" },
    ],
    hint: "需要 LinkedIn 开发者应用并申请 w_member_social / w_organization_social 权限",
  },
  {
    id: "x",
    platform: "X / Twitter",
    label: "X（Twitter）",
    region: "intl",
    kind: "token",
    fields: [{ key: "accessToken", label: "User Access Token（OAuth2 user token）", secret: true }],
    hint: "需 X 开发者账号（免费额度有限：发帖数量受套餐限制）",
  },
  {
    id: "instagram",
    platform: "Instagram",
    label: "Instagram（Ins / IG）",
    region: "intl",
    kind: "token",
    fields: [
      { key: "igUserId", label: "Instagram 商业账号 ID（IG User ID）" },
      { key: "accessToken", label: "Access Token（FB 长期令牌）", secret: true },
    ],
    hint:
      "需 Instagram 专业号（商业/创作者）+ 绑定 Facebook 主页，用 Graph API 两步发布（先建 media 容器再 publish）。" +
      "⚠️ 该接口**只接受公网 JPG/PNG**：本站图片是 webp 时会自动转「手动发布」并给出文案（可在 IG App/网页粘贴）。",
  },

  // ===== ③ 无开放发文接口 → 生成文案 + 手动发布 =====
  { id: "mp-wechat", platform: "微信公众号", label: "微信公众号", region: "cn", kind: "manual", fields: [], manualUrl: "https://mp.weixin.qq.com/", maxLength: 20000 },
  { id: "xiaohongshu", platform: "小红书", label: "小红书", region: "cn", kind: "manual", fields: [], manualUrl: "https://creator.xiaohongshu.com/publish/publish", maxLength: 1000 },
  { id: "douyin", platform: "抖音", label: "抖音", region: "cn", kind: "manual", fields: [], manualUrl: "https://creator.douyin.com/creator-micro/content/upload", maxLength: 1000 },
  { id: "bilibili", platform: "B站", label: "哔哩哔哩（专栏）", region: "cn", kind: "manual", fields: [], manualUrl: "https://member.bilibili.com/platform/upload/text/edit", maxLength: 1000 },
  { id: "zhihu", platform: "知乎", label: "知乎", region: "cn", kind: "manual", fields: [], manualUrl: "https://zhuanlan.zhihu.com/write", maxLength: 5000 },
  { id: "video-account", platform: "视频号", label: "微信视频号", region: "cn", kind: "manual", fields: [], manualUrl: "https://channels.weixin.qq.com/", maxLength: 1000 },
];

export const getChannel = (id: string) => CHANNELS.find((c) => c.id === id);

/** 待发布的文案（由内容解析层生成，渠道适配器只负责"怎么送出去"） */
export interface OutgoingMessage {
  title: string;
  description: string;
  url: string;
  image?: string;
  /** 内容类型（product / service / news） */
  contentType: string;
  /** 站点品牌名（用于文案前缀） */
  brand?: string;
}

export interface DispatchResult {
  ok: boolean;
  /** 需要人工去平台发布（manual 渠道） */
  manual?: boolean;
  message: string;
  /** manual 渠道返回给 UI 的成品文案 */
  text?: string;
}

const jsonPost = async (url: string, body: unknown, headers: Record<string, string> = {}) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text: text.slice(0, 400) };
};

/** 通用文案（webhook/telegram 等文本型渠道共用） */
export function plainText(m: OutgoingMessage, platform: string) {
  const head = platform === "微博" && m.brand ? `【${m.brand}】` : "";
  return `${head}${m.title}\n\n${m.description}\n\n${m.url}`.trim();
}

/** 手动渠道：按平台字数上限裁好文案（小红书/抖音这类超长会被截断） */
function manualText(m: OutgoingMessage, max?: number) {
  const body = `${m.title}\n\n${m.description}\n\n${m.url}`;
  if (!max || body.length <= max) return body;
  const room = Math.max(0, max - m.url.length - 4);
  return `${body.slice(0, room)}…\n\n${m.url}`;
}

/**
 * 真正把一条消息送到目标渠道。
 * ⚠️ 失败必须**如实返回**（含平台原文错误），禁止静默成功 —— 发布记录里要能看出到底发生了什么。
 */
export async function dispatch(
  channel: ChannelDef,
  config: Record<string, string>,
  m: OutgoingMessage
): Promise<DispatchResult> {
  const need = (k: string, label: string) => {
    const v = String(config[k] || "").trim();
    if (!v) throw new Error(`缺少「${label}」，请先在渠道配置里填写`);
    return v;
  };

  try {
    if (channel.kind === "manual") {
      return { ok: true, manual: true, message: `请在 ${channel.platform} 粘贴发布（已生成文案）`, text: manualText(m, channel.maxLength) };
    }

    // ---- 群机器人 / Webhook ----
    if (channel.id === "wecom") {
      const url = need("webhook", "Webhook URL");
      const r = await jsonPost(url, {
        msgtype: "news",
        news: { articles: [{ title: m.title, description: m.description.slice(0, 200), url: m.url, picurl: m.image || undefined }] },
      });
      return r.ok ? { ok: true, message: "已发送到企业微信" } : { ok: false, message: `企业微信返回 ${r.status}：${r.text}` };
    }
    if (channel.id === "dingtalk") {
      const url = need("webhook", "Webhook URL");
      const r = await jsonPost(url, {
        msgtype: "link",
        link: { title: m.title, text: m.description.slice(0, 200), messageUrl: m.url, picUrl: m.image || undefined },
      });
      const bad = r.ok && /"errcode":\s*(?!0)/.test(r.text);
      return r.ok && !bad ? { ok: true, message: "已发送到钉钉" } : { ok: false, message: `钉钉返回 ${r.status}：${r.text}` };
    }
    if (channel.id === "feishu") {
      const url = need("webhook", "Webhook URL");
      const r = await jsonPost(url, { msg_type: "text", content: { text: plainText(m, "飞书") } });
      const bad = /"code":\s*(?!0)/.test(r.text);
      return r.ok && !bad ? { ok: true, message: "已发送到飞书" } : { ok: false, message: `飞书返回 ${r.status}：${r.text}` };
    }
    if (channel.id === "slack") {
      const url = need("webhook", "Webhook URL");
      const r = await jsonPost(url, {
        text: m.title,
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: `*<${m.url}|${m.title}>*\n${m.description}` } },
          ...(m.image ? [{ type: "image", image_url: m.image, alt_text: m.title }] : []),
        ],
      });
      return r.ok ? { ok: true, message: "已发送到 Slack" } : { ok: false, message: `Slack 返回 ${r.status}：${r.text}` };
    }
    if (channel.id === "discord") {
      const url = need("webhook", "Webhook URL");
      const r = await jsonPost(url, {
        content: `**${m.title}**\n${m.description}\n${m.url}`,
        embeds: [{ title: m.title, description: m.description.slice(0, 300), url: m.url, image: m.image ? { url: m.image } : undefined }],
      });
      return r.ok ? { ok: true, message: "已发送到 Discord" } : { ok: false, message: `Discord 返回 ${r.status}：${r.text}` };
    }
    if (channel.id === "custom-webhook") {
      const url = need("webhook", "Webhook URL");
      const headers: Record<string, string> = {};
      const token = String(config.token || "").trim();
      if (token) headers.authorization = token;
      const r = await jsonPost(url, { title: m.title, description: m.description, url: m.url, image: m.image || "", platform: channel.platform, content_type: m.contentType }, headers);
      return r.ok ? { ok: true, message: "已发送到自定义 Webhook" } : { ok: false, message: `Webhook 返回 ${r.status}：${r.text}` };
    }

    // ---- 需要 token 的平台 ----
    if (channel.id === "telegram") {
      const token = need("botToken", "Bot Token");
      const chatId = need("chatId", "Chat ID");
      const r = await jsonPost(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: plainText(m, "Telegram"),
        disable_web_page_preview: false,
      });
      return r.ok ? { ok: true, message: "已发送到 Telegram" } : { ok: false, message: `Telegram 返回 ${r.status}：${r.text}` };
    }
    if (channel.id === "weibo") {
      const token = need("accessToken", "Access Token");
      const form = new URLSearchParams({ access_token: token, status: plainText(m, "微博") });
      const res = await fetch("https://api.weibo.com/2/statuses/share.json", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const text = (await res.text()).slice(0, 300);
      return res.ok ? { ok: true, message: "已发布到微博" } : { ok: false, message: `微博返回 ${res.status}：${text}` };
    }
    if (channel.id === "facebook-page") {
      const pageId = need("pageId", "Page ID");
      const token = need("accessToken", "Page Access Token");
      const form = new URLSearchParams({ message: `${m.title}\n\n${m.description}`, link: m.url, access_token: token });
      const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/feed`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const text = (await res.text()).slice(0, 300);
      return res.ok ? { ok: true, message: "已发布到 Facebook 主页" } : { ok: false, message: `Facebook 返回 ${res.status}：${text}` };
    }
    if (channel.id === "linkedin") {
      const token = need("accessToken", "Access Token");
      const author = need("author", "Author URN");
      const r = await jsonPost(
        "https://api.linkedin.com/v2/ugcPosts",
        {
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: `${m.title}\n\n${m.description}` },
              shareMediaCategory: "ARTICLE",
              media: [{ status: "READY", originalUrl: m.url, title: { text: m.title }, description: { text: m.description.slice(0, 200) } }],
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        },
        { "X-Restli-Protocol-Version": "2.0.0", authorization: `Bearer ${token}` }
      );
      return r.ok ? { ok: true, message: "已发布到 LinkedIn" } : { ok: false, message: `LinkedIn 返回 ${r.status}：${r.text}` };
    }
    if (channel.id === "x") {
      const token = need("accessToken", "Access Token");
      const body = `${m.title}\n${m.description.slice(0, 180)}\n${m.url}`.slice(0, 275);
      const r = await jsonPost("https://api.x.com/2/tweets", { text: body }, { authorization: `Bearer ${token}` });
      return r.ok ? { ok: true, message: "已发布到 X" } : { ok: false, message: `X 返回 ${r.status}：${r.text}` };
    }
    /**
     * Instagram（Ins / IG）—— Graph API 两步式：① 建 media 容器 ② media_publish。
     * 🔴 硬约束：`image_url` **必须是公网可访问的 JPG/PNG**（webp 一律被拒）。
     *   而本站图片统一是 `.webp` ⇒ 这种情况**如实转手动**（生成文案 + 打开 IG），
     *   绝不假装发成功（owner 要求可追溯）。
     */
    if (channel.id === "instagram") {
      const igUserId = need("igUserId", "IG User ID");
      const token = need("accessToken", "Access Token");
      const img = String(m.image || "");
      const isJpgOrPng = /\.(jpe?g|png)(\?|$)/i.test(img);
      if (!img || !/^https?:\/\//i.test(img) || !isJpgOrPng) {
        return {
          ok: true,
          manual: true,
          message: img
            ? `Instagram 只接受公网 JPG/PNG 图片（当前是 ${img.split(".").pop()?.slice(0, 6) || "无图"}）⇒ 已转为手动发布`
            : "该内容没有图片 ⇒ Instagram 必须有图，已转为手动发布",
          text: manualText(m, 2200),
        };
      }
      const caption = `${m.title}\n\n${m.description}\n\n${m.url}`.slice(0, 2200);
      const create = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ image_url: img, caption, access_token: token }).toString(),
      });
      const createdText = (await create.text()).slice(0, 400);
      if (!create.ok) return { ok: false, message: `Instagram 建容器失败 ${create.status}：${createdText}` };
      let creationId = "";
      try {
        creationId = String(JSON.parse(createdText)?.id || "");
      } catch {
        creationId = "";
      }
      if (!creationId) {
        return { ok: false, message: `Instagram 建容器未返回 creation_id：${createdText}` };
      }
      const pub = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media_publish`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ creation_id: creationId, access_token: token }).toString(),
      });
      const pubText = (await pub.text()).slice(0, 400);
      return pub.ok ? { ok: true, message: "已发布到 Instagram" } : { ok: false, message: `Instagram 发布失败 ${pub.status}：${pubText}` };
    }

    return { ok: false, message: `渠道 ${channel.id} 尚未实现` };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}
