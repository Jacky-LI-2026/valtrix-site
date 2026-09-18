import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { serializeBigInt } from '@/lib/serialize'
import { validateManifest, executeUpgrade } from '@/lib/upgrade'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const runtime = 'nodejs'

// 远程更新服务器地址（可在 .env 中配置 UPDATE_SERVER_URL）
const UPDATE_SERVER_URL = process.env.UPDATE_SERVER_URL || ''

// 获取系统版本信息和更新日志
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const current = await prisma.systemVersion.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: 'desc' },
    })

    const logs = await prisma.systemUpdateLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      current: serializeBigInt(current),
      logs: serializeBigInt(logs),
      updateServerUrl: UPDATE_SERVER_URL ? '已配置' : '未配置',
    })
  } catch (error) {
    console.error('获取系统版本失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 检查更新 / 上传升级包 / 在线升级
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''

    // 文件上传升级（multipart/form-data）
    if (contentType.includes('multipart/form-data')) {
      return await handleUploadUpgrade(req, session.user.name || 'admin')
    }

    // JSON 请求
    const body = await req.json()
    const { action } = body

    if (action === 'check') {
      return await handleCheck()
    }

    if (action === 'online') {
      return await handleOnlineUpgrade(body, session.user.name || 'admin')
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 })
  } catch (error: any) {
    console.error('系统升级操作失败:', error)
    return NextResponse.json({ error: error.message || '操作失败' }, { status: 500 })
  }
}

// 检查更新
async function handleCheck() {
  const current = await prisma.systemVersion.findFirst({
    where: { isCurrent: true },
  })

  // 如果配置了远程更新服务器，尝试远程检查
  if (UPDATE_SERVER_URL) {
    try {
      const res = await fetch(`${UPDATE_SERVER_URL}/api/version/latest`, {
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const remote = await res.json()
        const hasUpdate = compareVersions(remote.version, current?.version || '1.0.0') > 0

        await prisma.systemUpdateLog.create({
          data: {
            version: current?.version || '1.0.0',
            changeType: 'improvement',
            title: hasUpdate ? `发现新版本 v${remote.version}` : '检查更新完成',
            description: hasUpdate ? `当前 v${current?.version}，最新 v${remote.version}` : '当前已是最新版本',
            module: 'system',
          },
        })

        return NextResponse.json({
          hasUpdate,
          latestVersion: remote.version,
          currentVersion: current?.version,
          releaseNotes: remote.releaseNotes,
          downloadUrl: remote.downloadUrl,
          message: hasUpdate ? `发现新版本 v${remote.version}` : '当前已是最新版本',
        })
      }
    } catch (e) {
      console.warn('远程检查更新失败，使用本地检查:', e)
    }
  }

  // 本地检查（无远程服务器时）
  await prisma.systemUpdateLog.create({
    data: {
      version: current?.version || '1.0.0',
      changeType: 'improvement',
      title: '检查更新完成',
      description: UPDATE_SERVER_URL ? '远程检查失败，当前版本未知' : '当前已是最新版本',
      module: 'system',
    },
  })

  return NextResponse.json({
    hasUpdate: false,
    latestVersion: current?.version || '1.0.0',
    message: UPDATE_SERVER_URL ? '无法连接更新服务器' : '当前已是最新版本（未配置远程更新服务器）',
  })
}

// 上传升级包升级
async function handleUploadUpgrade(req: NextRequest, username: string) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: '未选择升级包文件' }, { status: 400 })
  }

  if (!file.name.endsWith('.zip')) {
    return NextResponse.json({ error: '升级包必须是 .zip 格式' }, { status: 400 })
  }

  // 保存到临时目录
  const tempDir = path.join(process.cwd(), 'backups', 'temp-upgrade')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

  const zipPath = path.join(tempDir, `upgrade-${Date.now()}.zip`)
  const extractDir = path.join(tempDir, `extract-${Date.now()}`)

  try {
    // 保存 zip
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(zipPath, buffer)

    // 解压
    fs.mkdirSync(extractDir, { recursive: true })
    await extractZip(zipPath, extractDir)

    // 查找 manifest.json
    const manifestPath = findManifest(extractDir)
    if (!manifestPath) {
      return NextResponse.json({ error: '升级包中未找到 manifest.json' }, { status: 400 })
    }

    const manifest = readManifest(manifestPath)
    if (!validateManifest(manifest)) {
      return NextResponse.json({ error: 'manifest.json 格式不正确，需要 version 和 files 字段' }, { status: 400 })
    }

    // manifest 所在目录作为升级包根目录
    const packageRoot = path.dirname(manifestPath)

    // 执行升级（需要切换到包根目录，因为 manifest 中的文件路径是相对包根的）
    const result = await executeUpgradeWithRoot(packageRoot, manifest, username)

    // 清理临时文件
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch (e) { /* ignore */ }

    return NextResponse.json(result)
  } catch (error: any) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch (e) { /* ignore */ }
    return NextResponse.json({ error: `升级失败: ${error.message}` }, { status: 500 })
  }
}

// 在线升级（从远程下载升级包）
async function handleOnlineUpgrade(body: any, username: string) {
  const { downloadUrl, version } = body

  if (!downloadUrl) {
    return NextResponse.json({ error: '缺少下载地址' }, { status: 400 })
  }

  const tempDir = path.join(process.cwd(), 'backups', 'temp-upgrade')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

  const zipPath = path.join(tempDir, `online-${Date.now()}.zip`)
  const extractDir = path.join(tempDir, `extract-${Date.now()}`)

  try {
    // 下载升级包
    const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(120000) })
    if (!res.ok) throw new Error(`下载失败: HTTP ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(zipPath, buffer)

    // 解压
    fs.mkdirSync(extractDir, { recursive: true })
    await extractZip(zipPath, extractDir)

    // 查找 manifest
    const manifestPath = findManifest(extractDir)
    if (!manifestPath) throw new Error('升级包中未找到 manifest.json')

    const manifest = readManifest(manifestPath)
    if (!validateManifest(manifest)) throw new Error('manifest.json 格式不正确')

    const packageRoot = path.dirname(manifestPath)
    const result = await executeUpgradeWithRoot(packageRoot, manifest, username)

    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch (e) { /* ignore */ }

    return NextResponse.json(result)
  } catch (error: any) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }) } catch (e) { /* ignore */ }
    return NextResponse.json({ error: `在线升级失败: ${error.message}` }, { status: 500 })
  }
}

// 跨平台解压 zip（unzip 优先，回退 python3/python，兼容 Windows PowerShell 反斜杠路径）
async function extractZip(zipPath: string, destDir: string) {
  // 1) unzip
  try {
    await execAsync(`unzip -o "${zipPath}" -d "${destDir}"`, { timeout: 60000 })
    return
  } catch (e) { /* 尝试其他方式 */ }

  // 2) python3 / python zipfile
  const py = (cmd: string) => execAsync(cmd, { timeout: 60000 })
  try {
    await py(`python3 -c "import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "${zipPath}" "${destDir}"`)
  } catch (e) {
    await py(`python -c "import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "${zipPath}" "${destDir}"`)
  }

  // 3) 兼容 Windows 反斜杠路径条目（文件名含 \ 时重建目录）
  try {
    await py(`python3 -c "import os,sys;root=sys.argv[1];[os.renames(os.path.join(r,n),os.path.join(r,n.replace(chr(92),chr(47)))) for r,ds,fs in os.walk(root) for n in fs if chr(92) in n]" "${destDir}"`)
  } catch (e) { /* 忽略 */ }
}

/**
 * 读取升级包 manifest.json（兼容 UTF-8 BOM，PowerShell Set-Content 等工具常写入 BOM）
 */
function readManifest(manifestPath: string): any {
  let raw = fs.readFileSync(manifestPath, 'utf-8')
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
  return JSON.parse(raw)
}

// 在目录中递归查找 manifest.json
function findManifest(dir: string): string | null {
  const direct = path.join(dir, 'manifest.json')
  if (fs.existsSync(direct)) return direct

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const found = findManifest(path.join(dir, entry.name))
      if (found) return found
    }
  }
  return null
}

// 使用指定根目录执行升级
async function executeUpgradeWithRoot(packageRoot: string, manifest: any, username: string) {
  // 临时修改 executeUpgrade 的 extractDir 为 packageRoot
  // 由于 executeUpgrade 内部用 extractDir 拼接路径，这里直接调用并传入 packageRoot
  const { executeUpgrade } = await import('@/lib/upgrade')
  return await executeUpgrade(packageRoot, manifest, username)
}

// 版本号比较：返回正数表示 a > b
function compareVersions(a: string, b: string): number {
  const partsA = a.replace(/^v/, '').split('.').map(Number)
  const partsB = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}
