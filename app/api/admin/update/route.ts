import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { applyUpdateZip, verifyZipMd5 } from "@/lib/server/update-applier";

export const dynamic = "force-dynamic";

const PROJECT_ROOT = process.cwd();
const DL_DIR = path.join(PROJECT_ROOT, "tmp", "update-downloads");

async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return null;
}

function getUpdateServerUrl(): string {
  return process.env.UPDATE_SERVER_URL || "";
}

/** GET /api/admin/update —— 检查更新：本地版本 + 远程可用版本 */
export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  const serverUrl = getUpdateServerUrl();
  const localVersion = (() => {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
      return pkg.version || "0.0.0";
    } catch {
      return "0.0.0";
    }
  })();

  const result: any = { localVersion, configured: !!serverUrl, updates: [], error: null };
  if (!serverUrl) {
    result.error = "未配置 UPDATE_SERVER_URL（在 .env 中设置远程更新服务器地址后可在线检查更新）";
    return NextResponse.json(result);
  }

  try {
    const res = await fetch(serverUrl.replace(/\/+$/, "") + "/api/version/latest", {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    result.updates = Array.isArray(data) ? data : Array.isArray(data?.updates) ? data.updates : [];
    result.serverUrl = serverUrl;
  } catch (e: any) {
    result.error = "连接更新服务器失败：" + (e?.message || "未知错误");
  }
  return NextResponse.json(result);
}

function parseVer(v: string): number[] {
  return String(v || "").split(".").map((n) => parseInt(n, 10) || 0);
}

/** POST /api/admin/update —— 下载 / 应用 / 上传升级包 */
export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  const contentType = req.headers.get("content-type") || "";

  // —— 上传升级包（multipart）——
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file");
      const expectMd5 = String(formData.get("md5") || "");
      if (!file || typeof file === "string") {
        return NextResponse.json({ ok: false, error: "未收到升级包文件" }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length === 0) return NextResponse.json({ ok: false, error: "升级包为空" }, { status: 400 });
      if (buf.length > 300 * 1024 * 1024) {
        return NextResponse.json({ ok: false, error: "升级包超过 300MB 限制" }, { status: 400 });
      }
      fs.mkdirSync(DL_DIR, { recursive: true });
      const safeName = String(file.name || "upload.zip").replace(/[^\w.\-]/g, "_");
      const zipPath = path.join(DL_DIR, "upload-" + Date.now() + "-" + safeName);
      fs.writeFileSync(zipPath, buf);
      if (expectMd5 && !verifyZipMd5(zipPath, expectMd5)) {
        fs.rmSync(zipPath, { force: true });
        return NextResponse.json({ ok: false, error: "文件校验失败（MD5 不匹配），请重新下载后上传" }, { status: 400 });
      }
      // 直接应用
      const r = applyUpdateZip(zipPath, PROJECT_ROOT);
      fs.rmSync(zipPath, { force: true });
      return NextResponse.json(r);
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: "上传处理失败：" + (e?.message || "") }, { status: 500 });
    }
  }

  // —— JSON 指令 ——
  try {
    const body = await req.json();
    const action = String(body.action || "");

    // 下载远程更新包
    if (action === "download") {
      const serverUrl = getUpdateServerUrl();
      if (!serverUrl) return NextResponse.json({ ok: false, error: "未配置 UPDATE_SERVER_URL" }, { status: 400 });
      const version = String(body.version || "");
      const file = String(body.file || "");
      if (!version || !file) return NextResponse.json({ ok: false, error: "缺少版本或文件名" }, { status: 400 });
      const base = serverUrl.replace(/\/+$/, "");
      const dlRes = await fetch(`${base}/downloads/${encodeURIComponent(file)}`, { signal: AbortSignal.timeout(300000) });
      if (!dlRes.ok) return NextResponse.json({ ok: false, error: "下载失败：HTTP " + dlRes.status }, { status: 400 });
      const buf = Buffer.from(await dlRes.arrayBuffer());
      fs.mkdirSync(DL_DIR, { recursive: true });
      const zipPath = path.join(DL_DIR, "remote-" + version + "-" + file.replace(/[^\w.\-]/g, "_"));
      fs.writeFileSync(zipPath, buf);
      const md5 = body.md5 ? await verifyZipMd5(zipPath, String(body.md5)) : true;
      if (!md5) {
        fs.rmSync(zipPath, { force: true });
        return NextResponse.json({ ok: false, error: "下载文件校验失败（MD5 不匹配）" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, file: path.basename(zipPath), size: buf.length, downloaded: true });
    }

    // 应用已下载的更新包
    if (action === "apply") {
      const filename = String(body.file || "");
      const zipPath = filename && !filename.includes("/") && !filename.includes("\\")
        ? path.join(DL_DIR, filename)
        : "";
      if (!zipPath || !fs.existsSync(zipPath)) {
        return NextResponse.json({ ok: false, error: "未找到已下载的更新包，请先下载或上传" }, { status: 400 });
      }
      const r = applyUpdateZip(zipPath, PROJECT_ROOT);
      if (r.ok) fs.rmSync(zipPath, { force: true });
      return NextResponse.json(r);
    }

    return NextResponse.json({ ok: false, error: "未知操作：" + action }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "请求处理失败：" + (e?.message || "") }, { status: 500 });
  }
}
