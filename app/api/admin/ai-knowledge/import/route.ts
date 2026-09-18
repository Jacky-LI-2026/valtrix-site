import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";
import { getAiCredential } from "@/lib/company-verify";
import { execSync } from "child_process";

export const runtime = "nodejs";


/** 纯 Node zip 条目读取器（docx 是 zip，不依赖 unzip/tar，跨平台可用） */
function readZipEntry(buf: Buffer, name: string): string | null {
  const sig = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf[i] === sig[0] && buf[i + 1] === sig[1] && buf[i + 2] === sig[2] && buf[i + 3] === sig[3]) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const cdCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  let p = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const entryName = buf.toString("utf8", p + 46, p + 46 + nameLen);
    if (entryName === name) {
      const lhNameLen = buf.readUInt16LE(localOffset + 26);
      const lhExtraLen = buf.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
      const data = buf.subarray(dataStart, dataStart + compSize);
      if (method === 0) return data.toString("utf8");
      if (method === 8) return require("zlib").inflateRawSync(data).toString("utf8");
      return null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/** 从文件内容中提取纯文本 */
function extractText(filename: string, buf: Buffer): string {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (ext === "txt" || ext === "md" || ext === "markdown") {
    return buf.toString("utf8");
  }
  if (ext === "html" || ext === "htm") {
    let s = buf.toString("utf8");
    s = s.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
    s = s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"');
    return s.replace(/\s+/g, " ").trim();
  }
  if (ext === "docx") {
    const xml = readZipEntry(buf, "word/document.xml");
    if (!xml) throw new Error("docx 解析失败：不是有效的 Word 文档");
    const cleaned = xml.replace(/<w:tab[^>]*\/>/gi, "\t").replace(/<w:br[^>]*\/>/gi, "\n").replace(/<\/w:p>/gi, "\n");
    const text = cleaned.replace(/<[^>]+>/g, "");
    return text
      .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
      .replace(/\u00a0/gi, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  if (ext === "pdf") {
    const tmp = `/tmp/_kb_${Date.now()}_${Math.floor(Math.random() * 100000)}.pdf`;
    require("fs").writeFileSync(tmp, buf);
    try {
      const out = execSync(`pdftotext -enc UTF-8 "${tmp}" - 2>/dev/null`, { maxBuffer: 50 * 1024 * 1024 }).toString("utf8");
      require("fs").unlinkSync(tmp);
      return out.replace(/\n{3,}/g, "\n\n").trim();
    } catch (e: any) {
      try { require("fs").unlinkSync(tmp); } catch {}
      throw new Error("PDF 解析失败（服务器未安装 pdftotext）。请将 PDF 转为 txt/docx 后上传，或安装 poppler-utils。");
    }
  }
  throw new Error("不支持的文件类型：" + (ext || "未知") + "。支持 txt / md / docx / pdf / html");
}

/** 文本分段（每段约 1600 字，最多 8 段） */
function chunkText(text: string, size = 1600, max = 8): string[] {
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length && chunks.length < max) {
    let end = Math.min(start + size, cleaned.length);
    if (end < cleaned.length) {
      const cut = cleaned.lastIndexOf("\n", end);
      if (cut > start + size * 0.6) end = cut;
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    start = end;
  }
  return chunks;
}

const QA_PROMPT = [
  "你是企业官网 AI 智能客服知识库的整理助手。根据用户提供的资料片段，提炼出客户最可能询问的问题和准确简明的答案。",
  "要求：",
  "1. 生成 2-5 个问答对；",
  "2. 问题要口语化、贴近真实客户咨询（如：你们的产品怎么样？报价多少？怎么联系？）；",
  "3. 答案必须基于资料内容，准确、简洁，80-200 字，不编造资料中没有的信息；",
  "4. 只输出 JSON 数组，不要输出任何其他文字，格式：[{\"q\":\"问题1\",\"a\":\"答案1\"},{\"q\":\"问题2\",\"a\":\"答案2\"}]",
].join("\n");

function parseQa(content: string): { q: string; a: string }[] {
  let text = (content || "").trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (!arrMatch) return [];
  try {
    const arr = JSON.parse(arrMatch[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((it) => it && typeof it === "object" && (it.q || it.question) && (it.a || it.answer))
      .map((it) => ({ q: String(it.q || it.question || "").trim(), a: String(it.a || it.answer || "").trim() }))
      .filter((it) => it.q && it.a);
  } catch {
    return [];
  }
}

/** 调 DeepSeek 生成某片段的问答对 */
async function generateQaForChunk(chunk: string, credential: { key: string; baseUrl: string; model: string }): Promise<{ q: string; a: string }[]> {
  const res = await fetch(`${credential.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${credential.key}` },
    body: JSON.stringify({
      model: credential.model,
      messages: [
        { role: "system", content: QA_PROMPT },
        { role: "user", content: chunk },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`AI 服务返回 ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return parseQa(content);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "请选择要上传的文件" }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "文件不能超过 20MB" }, { status: 400 });
    const category = String(form.get("category") || "文档导入").slice(0, 100);

    const buf = Buffer.from(await file.arrayBuffer());
    let text = "";
    try {
      text = extractText(file.name, buf);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "文件解析失败" }, { status: 400 });
    }
    if (text.length < 40) return NextResponse.json({ error: "文件内容过短，无法分析生成问答" }, { status: 400 });

    const credential = await getAiCredential();
    if (!credential.key) return NextResponse.json({ error: "未配置 AI 服务（请在 AI 智能客服或翻译配置中填写 API Key）" }, { status: 400 });

    const chunks = chunkText(text);
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const pairs = await generateQaForChunk(chunks[i], credential);
        for (const p of pairs) {
          const dup = await prisma.aiKnowledge.findFirst({ where: { title: p.q } });
          if (dup) continue;
          await prisma.aiKnowledge.create({
            data: {
              title: p.q,
              content: p.a,
              category,
              source: "auto",
              status: "published",
              sortOrder: 0,
            },
          });
          imported++;
        }
      } catch (e: any) {
        errors.push(`第 ${i + 1} 段生成失败：${e?.message || "未知错误"}`);
      }
    }

    const latest = await prisma.aiKnowledge.findMany({ orderBy: { id: "desc" }, take: imported });
    return NextResponse.json({ ok: true, imported, errors, added: serializeBigInt(latest) });
  } catch (error: any) {
    console.error("AI 知识库导入失败:", error);
    return NextResponse.json({ error: error?.message || "导入失败" }, { status: 500 });
  }
}
