import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { mkdir, readdir, stat, writeFile } from "fs/promises";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "项目备份");
const MAX_SIZE = 1024 * 1024 * 1024; // 1GB
const ALLOWED_EXT = [".dump", ".zip", ".tar.gz", ".sql", ".backup"];

// 上传备份文件到备份目录（与"一键备份"同目录，可被 GET 列表识别、可恢复/下载）
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "未收到文件" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "文件为空" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件超过 1GB 限制" }, { status: 400 });
    }

    // 文件名安全校验
    const rawName = path.basename(file.name || "").replace(/[\\/]/g, "");
    if (!rawName || rawName === "." || rawName === "..") {
      return NextResponse.json({ error: "非法文件名" }, { status: 400 });
    }
    const lower = rawName.toLowerCase();
    if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
      return NextResponse.json({ error: "仅支持 .dump / .zip / .tar.gz / .sql / .backup 格式" }, { status: 400 });
    }

    await mkdir(BACKUP_DIR, { recursive: true });
    const target = path.join(BACKUP_DIR, rawName);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(target, buf);

    // 返回更新后的备份列表
    const entries = await readdir(BACKUP_DIR);
    const backups: any[] = [];
    for (const name of entries) {
      if (!/^(database_\d{8}\.dump|backup_\d{8}\.zip|[^_/\\\\]{1,20}网站_关键备份_[\d_]+\.zip|.+\.(dump|zip|tar\.gz|sql|backup))$/.test(name)) continue;
      const full = path.join(BACKUP_DIR, name);
      try {
        const st = await stat(full);
        if (st.isFile()) backups.push({ name, size: st.size, modified: st.mtime.toISOString() });
      } catch {}
    }
    backups.sort((a, b) => b.name.localeCompare(a.name));

    return NextResponse.json({ success: true, name: rawName, backups });
  } catch (e: any) {
    return NextResponse.json({ error: `上传失败: ${e.message}` }, { status: 500 });
  }
}
