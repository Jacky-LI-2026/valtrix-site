/**
 * 社媒一键发布（后台接口）
 * ==========================================================================
 * GET  ?type=product|service|news  → 该类型的内容列表（供勾选）
 * GET  （无 type）                 → { channels(定义), state(配置), log(记录) }
 * POST { action: "save-channels", channels }
 * POST { action: "publish", items:[{type,id}], channels:[id], customText? }
 * POST { action: "text", items:[{type,id}] }  只生成文案（UI 预览/复制用）
 *
 * 权限：`/api/admin/social-publish` 在 middleware 的 API_PERMISSION 里收口
 *   → 需 `social-publish:config`（与页面权限同码）。
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteBaseUrl } from "@/lib/site-url";
import { getBrandName } from "@/lib/brand";
import { CHANNELS, getChannel, dispatch, type OutgoingMessage } from "@/lib/social/channels";
import { getSocialState, saveSocialState, appendSocialLog, type SocialLogEntry } from "@/lib/social/store";
import { isPluginEnabled } from "@/lib/plugins/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TypeKey = "product" | "service" | "news";

/** 内容类型 → 取数口径（标题字段 / 摘要字段 / 详情页路径） */
/**
 * 内容类型 → 取数口径。
 * ⚠️ 字段名必须**按各模型实际情况**写（踩过：Product 没有 `image`、Service 没有 `name`/`image`，
 *    写错 Prisma 会直接抛错，而前台只看到"没有内容"——把"报错"伪装成"空"）。
 *    实测口径：Product(title=name, summary=subtitle, image=coverImage｜images[])；
 *             Service(title=title, summary=subtitle, **无图片字段**)；News(title/summary/coverImage)。
 */
const SOURCES: Record<
  TypeKey,
  { model: string; name: string; summary: string; image?: string; imageList?: string; path: (row: any) => string }
> = {
  product: {
    model: "product",
    name: "name",
    summary: "subtitle",
    image: "coverImage",
    imageList: "images",
    path: (r) => `/products/${encodeURIComponent(r?.category?.tab?.slug || r?.tab?.slug || "growth")}/${r.slug}`,
  },
  service: { model: "service", name: "title", summary: "subtitle", path: (r) => `/services/${r.slug}` },
  news: { model: "news", name: "title", summary: "summary", image: "coverImage", path: (r) => `/news/${r.slug}` },
};

const pick = (row: any, base: string, locale = "zh") => {
  const suffix = locale === "zh" ? "" : locale.charAt(0).toUpperCase() + locale.slice(1);
  return String(row?.[base + suffix] || row?.[base] || "").trim();
};

async function loadContent(type: TypeKey, limit = 100) {
  const src = SOURCES[type];
  /**
   * ⚠️ `id` 必须显式 select —— Prisma 用了 `select` 就**只返回列出的字段**。
   *    踩过：漏了 id ⇒ 每行 `String(r.id)` 都是 `"undefined"` ⇒ 前端所有行的 key 相同
   *    （勾一个全勾上），且发布时按 id 查不到内容。
   */
  const rowSel: any = { id: true, slug: true, status: true, [src.name]: true, [src.summary]: true };
  if (src.image) rowSel[src.image] = true;
  if (src.imageList) rowSel[src.imageList] = true;
  if (type === "product") rowSel.category = { select: { tab: { select: { slug: true } } } };
  const rows: any[] = await (prisma as any)[src.model].findMany({
    where: { status: type === "news" ? "published" : "published" },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: rowSel,
  });
  const baseUrl = getSiteBaseUrl();
  return rows.map((r) => {
    const summary = pick(r, src.summary);
    // 图片：优先封面；没有封面时退到图集第一条（产品图集是 [{url}] 结构）
    let image = src.image ? String(r[src.image] || "") : "";
    if (!image && src.imageList && Array.isArray(r[src.imageList]) && r[src.imageList].length > 0) {
      const first = r[src.imageList][0];
      image = typeof first === "string" ? first : String(first?.url || "");
    }
    return {
      // 兜底：万一某类型没有 id（或为空）就用 slug 当标识（发布接口本来就同时支持 id / slug 两种查找）
      id: r.id !== undefined && r.id !== null ? String(r.id) : String(r.slug),
      slug: r.slug,
      title: pick(r, src.name),
      summary: summary.slice(0, 200),
      image,
      url: baseUrl + src.path(r),
    };
  });
}

/** 把库里的内容组装成「待发送文案」 */
async function buildMessage(type: TypeKey, id: string): Promise<OutgoingMessage | null> {
  const src = SOURCES[type];
  const row: any = await (prisma as any)[src.model].findFirst({
    where: { OR: [{ id: (() => { try { return BigInt(id); } catch { return BigInt(-1); } })() }, { slug: id }] },
    ...(type === "product" ? { include: { category: { select: { tab: { select: { slug: true } } } } } } : {}),
  });
  if (!row) return null;
  return {
    title: pick(row, src.name),
    description: pick(row, src.summary).slice(0, 300),
    url: getSiteBaseUrl() + src.path(row),
    image: src.image ? String(row[src.image] || "") : "",
    contentType: type,
    brand: getBrandName(),
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as TypeKey | null;

  if (type) {
    if (!(type in SOURCES)) return NextResponse.json({ error: "未知类型" }, { status: 400 });
    try {
      return NextResponse.json({ ok: true, type, list: await loadContent(type) });
    } catch (e: any) {
      // 必须让"读取失败"有别于"确实没有内容"：把真实原因回给前端（此前写错字段 → 抛错 → 前台显示"没有内容"）
      console.error(`[social-publish] 读取 ${type} 内容失败:`, e?.message);
      return NextResponse.json(
        { ok: false, type, list: [], error: e?.message || "读取内容失败" },
        { status: 500 }
      );
    }
  }

  const [state, enabled] = await Promise.all([getSocialState(), isPluginEnabled("social-publish")]);
  return NextResponse.json({
    ok: true,
    enabled,
    /** 渠道定义里不含任何密钥；密钥只在 state.channels[].config 里（仅本权限可见） */
    channels: CHANNELS,
    state,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  // 保存渠道配置
  if (action === "save-channels") {
    const incoming = body?.channels && typeof body.channels === "object" ? body.channels : null;
    if (!incoming) return NextResponse.json({ ok: false, error: "缺少 channels" }, { status: 400 });
    const state = await getSocialState();
    const next: Record<string, any> = { ...state.channels };
    for (const [id, v] of Object.entries<any>(incoming)) {
      if (!getChannel(id)) continue; // 只接受目录里存在的渠道
      const prev = next[id]?.config || {};
      const cfg: Record<string, string> = { ...prev };
      // 空字符串 = 不改（避免"看着像清空、其实是把密钥抹掉"）；显式传 null 才是清空
      for (const [k, val] of Object.entries<any>(v?.config || {})) {
        if (val === null) delete cfg[k];
        else if (String(val).trim() !== "") cfg[k] = String(val).trim();
      }
      next[id] = { enabled: !!v?.enabled, config: cfg };
    }
    await saveSocialState({ channels: next, log: state.log });
    return NextResponse.json({ ok: true, channels: next });
  }

  // 只生成文案（预览/复制）
  if (action === "text") {
    const items = Array.isArray(body?.items) ? body.items : [];
    const out: any[] = [];
    for (const it of items) {
      const msg = await buildMessage(it?.type, String(it?.id ?? ""));
      if (msg) out.push({ type: it.type, id: String(it.id), text: `${msg.title}\n\n${msg.description}\n\n${msg.url}` });
    }
    return NextResponse.json({ ok: true, items: out });
  }

  // 一键发布
  if (action === "publish") {
    if (!(await isPluginEnabled("social-publish"))) {
      return NextResponse.json({ ok: false, error: "插件未启用：请到「能力市场 → 社媒一键发布」启用后再试" }, { status: 400 });
    }
    const items = Array.isArray(body?.items) ? body.items : [];
    const channelIds: string[] = Array.isArray(body?.channels) ? body.channels.map(String) : [];
    if (!items.length) return NextResponse.json({ ok: false, error: "请先选择要发布的内容" }, { status: 400 });
    if (!channelIds.length) return NextResponse.json({ ok: false, error: "请先选择发布渠道" }, { status: 400 });

    const state = await getSocialState();
    const results: any[] = [];
    const logs: SocialLogEntry[] = [];

    for (const it of items) {
      const msg = await buildMessage(it?.type, String(it?.id ?? ""));
      if (!msg) continue;
      for (const cid of channelIds) {
        const ch = getChannel(cid);
        if (!ch) continue;
        const st = state.channels[cid] || { enabled: false, config: {} };
        const r = st.enabled
          ? await dispatch(ch, st.config || {}, msg)
          : { ok: false, message: "该渠道未启用（请到「渠道配置」打开开关）" };
        results.push({ type: it.type, id: String(it.id), channel: cid, platform: ch.platform, ...r });
        logs.push({
          at: new Date().toISOString(),
          channel: cid,
          platform: ch.platform,
          contentType: String(it.type),
          contentId: String(it.id),
          title: msg.title,
          ok: !!r.ok,
          manual: !!(r as any).manual,
          message: r.message,
        });
      }
    }
    await appendSocialLog(logs);
    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({ ok: true, results, summary: { total: results.length, ok: okCount, fail: results.length - okCount } });
  }

  return NextResponse.json({ ok: false, error: `未知 action：${action}` }, { status: 400 });
}
