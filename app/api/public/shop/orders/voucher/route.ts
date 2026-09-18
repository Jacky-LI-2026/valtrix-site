import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/public/shop/orders/voucher — 上传对公转账/线下付款凭证（multipart: file + orderNo + email）
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orderNo = String(formData.get("orderNo") || "").trim();
    const email = String(formData.get("email") || "").trim();

    if (!file) return NextResponse.json({ ok: false, error: "请选择凭证文件" }, { status: 400 });
    if (!orderNo) return NextResponse.json({ ok: false, error: "缺少订单号" }, { status: 400 });

    const order = await prisma.shopOrder.findUnique({ where: { orderNo } });
    if (!order) return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });
    // 🔒 2026-09-15 修复（越权/未授权写入）：原写法是
    //      `if (email && order.email !== email) { …403 }`
    //    —— **省略 `email` 参数时整段校验被跳过**。而本接口下方会把订单
    //    直接写成 `payStatus: "paid"`（未付款 → 已付款）。
    //    ⇒ 只要知道/猜到 `orderNo`，无需任何凭据即可篡改订单支付状态并落盘文件。
    //    现改为：`email` 必填，且必须与订单预留邮箱一致（忽略大小写与首尾空格）。
    if (!email) {
      return NextResponse.json({ ok: false, error: "请填写下单时使用的邮箱" }, { status: 400 });
    }
    if (!order.email || order.email.trim().toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "邮箱与订单预留邮箱不一致" }, { status: 403 });
    }

    // 仅允许图片凭证
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "凭证仅支持 JPG/PNG/WebP/PDF" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "凭证文件不能超过 10MB" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "vouchers");
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const ext = file.type === "application/pdf" ? ".pdf" : ".webp";
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${orderNo}-${Date.now()}${ext}`;
    await writeFile(path.join(uploadDir, fileName), buffer);

    const url = `/uploads/vouchers/${fileName}`;
    await prisma.shopOrder.update({
      where: { orderNo },
      data: { payVoucher: url, payStatus: "paid" }, // 已上传凭证 → paid（后台确认后才 confirmed）
    });

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "上传失败" }, { status: 500 });
  }
}
