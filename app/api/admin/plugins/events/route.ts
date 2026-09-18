/**
 * 插件事件总线 · 状态查看
 * GET /api/admin/plugins/events → 事件定义 + 当前已订阅事件
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listEvents } from "@/lib/plugins/events";
import { PLUGIN_EVENTS } from "@/lib/plugins/boot";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  // 确保内置能力与事件订阅已注册（幂等）
  try {
    const { ensurePlugins } = await import("@/lib/plugins/ensure");
    ensurePlugins();
  } catch { /* ignore */ }
  const eventDocs: Record<string, string> = {
    "content.published": "内容发布/更新 → SEO 推送、自动翻译等",
    "content.deleted": "内容删除 → 清理缓存/索引",
    "lead.submitted": "商机产生（留资/询价/预约/表单）→ SMTP 通知",
    "file.uploaded": "媒体上传 → 图片压缩/缩略图",
    "system.startup": "服务启动 → 插件初始化",
  };
  return NextResponse.json({
    defined: PLUGIN_EVENTS,
    subscribed: listEvents(),
    docs: eventDocs,
  });
}
