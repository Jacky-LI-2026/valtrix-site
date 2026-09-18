/**
 * 访客行为埋点 · 接收上报（sendBeacon）
 * - 热力图：写 data/heatmap.jsonl：{x, y, depth, path, lang, t}
 * - 浏览足迹：事件 {type:'view', targetType:'product'|'news'|..., targetId, href, visitorKey, lang}
 *   写 data/views.jsonl，供「AI 内容推荐」协同过滤使用（受 ai-recommend 插件控制）。
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEAT_FILE = path.join(process.cwd(), "data", "heatmap.jsonl");
const VIEW_FILE = path.join(process.cwd(), "data", "views.jsonl");
let heatQueue: string[] = [];
let viewQueue: string[] = [];

function flush() {
  try {
    fs.mkdirSync(path.dirname(HEAT_FILE), { recursive: true });
    if (heatQueue.length) {
      fs.appendFileSync(HEAT_FILE, heatQueue.join("\n") + "\n");
      heatQueue = [];
    }
    if (viewQueue.length) {
      fs.appendFileSync(VIEW_FILE, viewQueue.join("\n") + "\n");
      viewQueue = [];
    }
  } catch { /* ignore */ }
}
setInterval(flush, 10000);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events: any[] = Array.isArray(body?.events) ? body.events : [];
    if (!events.length) return NextResponse.json({ ok: true });
    for (const e of events) {
      if (e?.type === "view") {
        // 浏览足迹（智能推荐数据源）
        const tid = String(e.targetId || "").slice(0, 200);
        if (!tid) continue;
        viewQueue.push(
          JSON.stringify({
            v: String(e.visitorKey || "anon").slice(0, 64),
            t: String(e.targetType || "product").slice(0, 20),
            id: tid,
            href: String(e.href || "").slice(0, 200),
            lang: String(e.lang || "zh").slice(0, 10),
            ts: Number(e.t) || Date.now(),
          })
        );
        continue;
      }
      const rec = {
        x: Math.max(-1, Math.min(1000, Number(e.x) || -1)),
        y: Math.max(-1, Math.min(1000, Number(e.y) || -1)),
        depth: Math.max(0, Math.min(100, Number(e.depth) || 0)),
        path: String(e.path || "/").slice(0, 120),
        lang: String(e.lang || "zh").slice(0, 10),
        t: Number(e.t) || Date.now(),
      };
      heatQueue.push(JSON.stringify(rec));
    }
    flush();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
