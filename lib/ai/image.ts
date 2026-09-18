/**
 * AI 图像生成（AI Image）
 * =====================================================
 * 文本到图像：
 *  - Pollinations（默认，免费、无需 key）：https://image.pollinations.ai/prompt/{prompt}
 *  - SiliconFlow（可选，需 key）：POST https://api.siliconflow.cn/v1/images/generations
 * 配置存 site_config.ai_global_config：imageProvider = 'pollinations' | 'siliconflow'；imageKey
 */
import { PrismaClient } from '@/lib/generated/prisma';
import { getAiGlobalConfig } from "@/lib/ai/gateway";

const prisma = new PrismaClient();

export interface AiImageOptions {
  width?: number;
  height?: number;
  provider?: string;
  key?: string;
}

/** 生成 AI 图片，返回图片 Buffer（或 null） */
export async function generateAiImage(prompt: string, opts: AiImageOptions = {}): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!prompt || !prompt.trim()) return null;
  let cfg: any;
  try { cfg = await getAiGlobalConfig(); } catch { cfg = {}; }
  const provider = opts.provider || cfg.imageProvider || "pollinations";
  const width = opts.width || 1280;
  const height = opts.height || 720;

  if (provider === "siliconflow") {
    const key = opts.key || cfg.imageKey || cfg.siliconflowKey || "";
    if (!key) throw new Error("SiliconFlow 需要配置 API Key");
    const r = await fetch("https://api.siliconflow.cn/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: cfg.imageModel || "black-forest-labs/FLUX.1-schnell",
        prompt,
        image_size: `${width}x${height}`,
        batch_size: 1,
        num_inference_steps: 20,
      }),
    });
    if (!r.ok) throw new Error(`SiliconFlow 生成失败：${r.status}`);
    const d = await r.json();
    const b64 = d?.data?.[0]?.b64_json;
    if (!b64) throw new Error("SiliconFlow 未返回图片");
    return { buffer: Buffer.from(b64, "base64"), contentType: "image/png" };
  }

  // Pollinations（默认）
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&model=flux&seed=${Math.floor(Math.random() * 100000)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`Pollinations 生成失败：${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) throw new Error("Pollinations 返回图片为空");
    return { buffer: buf, contentType: r.headers.get("content-type") || "image/jpeg" };
  } finally {
    clearTimeout(timer);
  }
}

/** 保存图片到 public/uploads/ai，返回相对路径 /uploads/ai/xxx.jpg */
export async function saveAiImage(buffer: Buffer, contentType: string): Promise<string> {
  const fs = require("fs");
  const path = require("path");
  const dir = path.join(process.cwd(), "public", "uploads", "ai");
  fs.mkdirSync(dir, { recursive: true });
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const name = `ai-${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`;
  const file = path.join(dir, name);
  fs.writeFileSync(file, buffer);
  return `/uploads/ai/${name}`;
}
