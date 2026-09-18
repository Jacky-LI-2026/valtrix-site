/**
 * AI 知识库 · 批量多语言补全
 * POST /api/admin/ai-knowledge/translate-all
 * 遍历缺任一外语种 content 的条目，逐条将中文 content 翻译为 en/ja/ko/fr/ar 写回（串行节流，复用全局翻译通道）。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { translateServerText } from "@/lib/server/translate-core";
import { throttleTranslate } from "@/lib/translate-utils";

export const dynamic = "force-dynamic";

const LANGS = [
  { field: "contentEn", code: "en", label: "英文" },
  { field: "contentJa", code: "ja", label: "日文" },
  { field: "contentKo", code: "ko", label: "韩文" },
  { field: "contentFr", code: "fr", label: "法文" },
  { field: "contentAr", code: "ar", label: "阿拉伯文" },
] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const limit = Math.min(Number(body?.limit) || 10, 20);
    const offset = Number(body?.offset) || 0;

    // 缺任一外语种的条目
    const missing = await prisma.aiKnowledge.findMany({
      where: {
        OR: LANGS.flatMap((l) => [{ [l.field]: "" }, { [l.field]: null }]),
      },
      select: { id: true, title: true, content: true },
      orderBy: { id: "asc" },
      skip: offset,
      take: limit,
    });

    const results: { id: string; title: string; done: string[] }[] = [];
    for (const item of missing) {
      const src = item.content || "";
      const done: string[] = [];
      const data: any = {};
      for (const l of LANGS) {
        const existing = (item as any)[l.field];
        if (existing) { done.push(l.code); continue; } // 已有该语种跳过
        if (src.trim()) {
          await throttleTranslate(); // 服务端批量串行节流，防 QPS 限流
          const r = await translateServerText(src, l.code);
          if (r.provider !== "fallback" && r.translatedText && r.translatedText.trim() && r.translatedText !== src) {
            data[l.field] = r.translatedText;
            done.push(l.code);
          }
        }
      }
      if (Object.keys(data).length) {
        await prisma.aiKnowledge.update({ where: { id: item.id }, data });
      }
      results.push({ id: String(item.id), title: item.title || "", done });
    }

    const remaining = await prisma.aiKnowledge.count({
      where: { OR: LANGS.flatMap((l) => [{ [l.field]: "" }, { [l.field]: null }]) },
    });

    return NextResponse.json({ ok: true, updated: results.length, remaining, results });
  } catch (e: any) {
    console.error("批量翻译知识库失败:", e);
    return NextResponse.json({ error: e?.message || "批量翻译失败" }, { status: 500 });
  }
}
