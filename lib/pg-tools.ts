// 跨平台 PostgreSQL 工具定位：backup/restore 复用
// - Windows（本机）：项目内嵌入版 _pgsql/extracted/pgsql/bin（.exe）
// - Linux（服务器）：which pg_dump 定位，或系统常见路径
import { existsSync } from 'fs'
import path from 'path'
import { execSync } from 'child_process'

export const isWindows = process.platform === 'win32'

const PG_TOOL_NAMES = ['pg_dump', 'pg_restore', 'psql'] as const
export type PgToolName = (typeof PG_TOOL_NAMES)[number]

const LINUX_CANDIDATES = [
  '/usr/lib/postgresql/18/bin',
  '/usr/lib/postgresql/17/bin',
  '/usr/lib/postgresql/16/bin',
  '/usr/lib/postgresql/15/bin',
  '/usr/lib/postgresql/14/bin',
  '/usr/lib/postgresql/13/bin',
  '/usr/lib/postgresql/12/bin',
  '/usr/bin',
  '/usr/local/bin',
]

// 定位 PostgreSQL bin 目录；找不到返回 ''
export function findPgBin(): string {
  // 1. Windows 本机嵌入版
  if (isWindows) {
    const localBin = path.join(process.cwd(), '_pgsql', 'extracted', 'pgsql', 'bin')
    if (existsSync(path.join(localBin, 'pg_dump.exe'))) return localBin
    // 2. Windows 系统安装版（PATH）
    try {
      const out = execSync('where pg_dump 2>nul', { encoding: 'utf8', windowsHide: true }).trim()
      if (out) return path.dirname(out.split(/\r?\n/)[0])
    } catch (e) { /* ignore */ }
    return localBin // 兜底返回本地路径（即便不存在，让调用报更明确的错）
  }

  // Linux：which 定位
  try {
    const out = execSync('which pg_dump 2>/dev/null || command -v pg_dump 2>/dev/null', { encoding: 'utf8' }).trim()
    if (out) return path.dirname(out.split(/\n/)[0])
  } catch (e) { /* ignore */ }

  // Linux 常见路径
  for (const dir of LINUX_CANDIDATES) {
    if (existsSync(path.join(dir, 'pg_dump'))) return dir
  }
  return ''
}

// 返回 pg 工具的完整可执行路径（Windows 加 .exe）；找不到时直接返回命令名（依赖系统 PATH）
export function pgTool(name: PgToolName): string {
  const bin = findPgBin()
  if (bin) {
    return path.join(bin, isWindows ? `${name}.exe` : name)
  }
  return name
}
