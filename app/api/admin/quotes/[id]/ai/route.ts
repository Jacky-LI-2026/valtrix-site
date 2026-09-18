/**
 * 报价单 · AI 自动报价
 * POST /api/admin/quotes/[id]/ai → 基于询价单 items/options/message 生成 AI 报价草稿（建议单价/交期/条款）
 * 结果存 QuoteRequest.aiQuote（Json），供人工审核后走既有「审核通过→PDF→发邮箱」流程。
 */
import { NextRequest, NextResponse } from "next/server";
import { getBrandName, industryDesc } from '@/lib/brand';
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { callAiText } from "@/lib/ai/gateway";
import { serializeBigInt } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const id = BigInt(params.id);
    const quote = await prisma.quoteRequest.findUnique({ where: { id } });
    if (!quote) return NextResponse.json({ error: "报价单不存在" }, { status: 404 });

    // 站点信息（公司名/域名）
    let siteName = getBrandName();
    let currencyLabel = "人民币 CNY";
    try {
      const sc = await prisma.siteConfig.findUnique({ where: { configKey: "site_config" } });
      const v: any = sc?.configValue;
      const cfg = typeof v === "string" ? JSON.parse(v) : v || {};
      siteName = cfg.siteName || siteName || "本公司";
    } catch { /* ignore */ }

    const items: any[] = Array.isArray((quote as any).items) ? (quote as any).items : [];
    const options: any[] = Array.isArray((quote as any).options) ? (quote as any).options : [];
    const message = quote.message || "";

    const itemsDesc = items.length
      ? items.map((it, i) => `${i + 1}. ${it.name || it.model || "产品"}（型号 ${it.model || "-"}，数量 ${it.qty || 1}，客户目标价 ${it.priceMin ?? "面议"}~${it.priceMax ?? "面议"}）`).join("\n")
      : "（未选产品）";
    const optionsDesc = options.filter((o) => o.checked).map((o) => o.label).join("、") || "无";

    const prompt = `你是${siteName}的资深销售报价专家，负责为${industryDesc("工业设备")}报价。

请根据以下询价单生成一份专业、合理的中文报价草稿：

【客户需求】
${itemsDesc}

【附加需求】${optionsDesc}

【客户补充】${message || "无"}

【要求】
1. 为每个产品给出建议单价（单位：${currencyLabel}），结合行业合理水平，给出 8 折~9.5 折的适当商务优惠空间；
2. 给出每项金额与总价（合计）；
3. 给出交货期（如"合同签订后 45-60 天"）、报价有效期（如"30 天"）、付款条款（如"30% 预付款，70% 发货前付清"）；
4. 附 1-3 条商务备注（质保、培训、安装等，结合附加需求）；
5. 若信息不足，单价用合理估算并注明"估算价"。

只输出 JSON（不要 markdown 代码块），格式：
{"items":[{"model":"型号","name":"名称","qty":数量,"unitPrice":单价数字,"amount":金额数字,"delivery":"交期","note":"备注"}],"total":总价数字,"currency":"CNY","validity":"有效期","payment":"付款条款","notes":"备注文字","lang":"zh"}`;

    const raw = await callAiText(prompt, { maxTokens: 2000, temperature: 0.4 });
    // 解析 JSON（容忍 markdown 包裹）
    let cleaned = raw.replace(/```json|```/g, "").trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1);
    const aiQuote = JSON.parse(cleaned);
    if (!Array.isArray(aiQuote.items)) throw new Error("AI 返回格式异常");

    // 同步写回 items 单价（若询价 items 存在）
    let updatedItems = items;
    if (items.length && aiQuote.items.length === items.length) {
      updatedItems = items.map((it, i) => ({
        ...it,
        unitPrice: aiQuote.items[i]?.unitPrice ?? it.unitPrice ?? null,
        amount: aiQuote.items[i]?.amount ?? null,
        delivery: aiQuote.items[i]?.delivery ?? it.delivery ?? null,
      }));
    }

    const updated = await prisma.quoteRequest.update({
      where: { id },
      data: { aiQuote: aiQuote as any, items: updatedItems as any },
    });
    return NextResponse.json(serializeBigInt({ ok: true, aiQuote, quote: updated }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
