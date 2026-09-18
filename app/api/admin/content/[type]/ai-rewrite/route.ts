/**
 * 通用内容 · AI 批量重写标题
 * POST {ids: string[], field?: string} → 对每个条目 titleField 用 AI 重写（更吸引人的标题）
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getContentType } from "@/lib/content-types/registry";
import { getDynamicType } from "@/lib/content-types/dynamic";
import { contentService } from "@/lib/content-types/service";
import { callAiText } from "@/lib/ai/gateway";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const type = params.type;
    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length) return NextResponse.json({ error: "未选择条目" }, { status: 400 });

    // 确定标题字段（静态类型用 registry titleField；动态类型固定 title）
    const cfg = getContentType(type);
    const dyn = await getDynamicType(type).catch(() => null);
    const titleField = cfg?.titleField || dyn?.titleField || "title";

    const results: { id: string; ok: boolean; title?: string; error?: string }[] = [];
    for (const id of ids) {
      try {
        const item = await contentService.getById(type, id);
        if (!item) { results.push({ id, ok: false, error: "条目不存在" }); continue; }
        const oldTitle = String(item[titleField] || "");
        if (!oldTitle.trim()) { results.push({ id, ok: false, error: "标题为空" }); continue; }
        const rewritten = await callAiText(
          `你是资深内容编辑。请把以下标题改写得更吸引人、更专业、更适合搜索引擎与用户点击（保留核心信息，30字以内，只输出新标题，不要引号、编号或解释）：\n\n${oldTitle}`
        );
        if (!rewritten) { results.push({ id, ok: false, error: "AI 无返回" }); continue; }
        const clean = rewritten.replace(/^["'“”]+|["'“”]+$/g, "").trim();
        await contentService.update(type, id, { [titleField]: clean });
        results.push({ id, ok: true, title: clean });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message || String(e) });
      }
    }
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
