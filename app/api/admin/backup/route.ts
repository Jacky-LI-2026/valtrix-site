import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { serializeBigInt } from '@/lib/serialize'
import { getBackupConfig, setBackupConfig } from '@/lib/backup-config'
import { recordOperation } from '@/lib/operation-log'

export const runtime = 'nodejs'

// 需要备份的模型列表（使用 Prisma 客户端 camelCase 模型名）
const MODELS = [
  'user', 'role', 'permission', 'userRole', 'rolePermission',
  'productTab', 'productCategory', 'product', 'productSpec',
  'siteConfig', 'themeConfig', 'menu', 'language',
  'operationLog', 'systemVersion', 'systemUpdateLog',
  'newsCategory', 'news', 'newsCollectionSource',
  'resourceCategory', 'resourceItem',
  'industry', 'aboutSection', 'job',
  'aIConfig', 'collectionLog', 'autoCollectionTask',
  'service', 'sEOConfig', 'contactMessage', 'homeConfig',
  'verificationCode', 'downloadRecord', 'server',
  'analyticsVisitor', 'analyticsPageView', 'analyticsEvent',
]

// 执行一次数据库备份，返回文件名（未登录时 username 传空避免记录操作日志失败）
async function runBackup(username: string): Promise<string> {
  const backupDir = path.join(process.cwd(), 'backups')
  if (!existsSync(backupDir)) {
    await mkdir(backupDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `backup-${timestamp}.json`
  const filePath = path.join(backupDir, fileName)

  // 导出所有模型数据
  const backup: Record<string, any> = {
    metadata: {
      createdAt: new Date().toISOString(),
      version: '1.0',
      models: MODELS,
    },
    data: {},
  }

  for (const model of MODELS) {
    try {
      // @ts-ignore - 动态访问Prisma模型
      const modelData = await prisma[model]?.findMany?.()
      if (modelData) {
        backup.data[model] = serializeBigInt(modelData)
      }
    } catch (e) {
      console.warn(`备份模型 ${model} 失败:`, e)
    }
  }

  await writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8')

  // 记录操作日志
  if (username) {
    await recordOperation({ module: 'system', action: 'export', target: fileName, detail: JSON.stringify({ type: 'database_backup' }) })
  }

  return fileName
}

// 按保留份数清理旧备份
async function cleanupBackups(retainCount: number): Promise<number> {
  const backupDir = path.join(process.cwd(), 'backups')
  if (!existsSync(backupDir)) return 0
  const files = (await readdir(backupDir))
    .filter((f) => f.endsWith('.json') && f.startsWith('backup-'))
    .sort()
  const toRemove = files.length - retainCount
  let removed = 0
  for (let i = 0; i < toRemove; i++) {
    try {
      await unlink(path.join(backupDir, files[i]))
      removed++
    } catch (e) {
      console.warn('清理旧备份失败:', files[i], e)
    }
  }
  return removed
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    // 懒执行：检查定时备份是否到点
    let autoBackup: string | null = null
    let autoCleanup = 0
    try {
      const cfg = await getBackupConfig()
      if (cfg.enabled) {
        const now = new Date()
        const last = cfg.lastRunAt ? new Date(cfg.lastRunAt) : null
        const intervalMs = Math.max(1, cfg.intervalDays) * 24 * 3600 * 1000
        let due = false
        if (!last) {
          due = true
        } else if (now.getTime() - last.getTime() >= intervalMs) {
          const [h, m] = (cfg.time || '03:00').split(':').map(Number)
          const todayAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0)
          due = now >= todayAt
        }
        if (due) {
          autoBackup = await runBackup(session.user?.name || '')
          await setBackupConfig({ ...cfg, lastRunAt: now.toISOString() })
          autoCleanup = await cleanupBackups(cfg.retainCount)
        }
      }
    } catch (e) {
      console.error('定时备份检查失败:', e)
    }

    // 列出备份文件
    const backupDir = path.join(process.cwd(), 'backups')
    if (!existsSync(backupDir)) {
      await mkdir(backupDir, { recursive: true })
    }
    const files = await readdir(backupDir)
    const backups = files
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        name: f,
        size: 0,
        createdAt: f.replace('backup-', '').replace('.json', ''),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return NextResponse.json({ backups, autoBackup, autoCleanup })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const fileName = await runBackup(session.user?.name || '')

    return NextResponse.json({
      success: true,
      fileName,
      message: '数据库备份成功',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const fileName = searchParams.get('file')

    if (!fileName) {
      return NextResponse.json({ error: '未指定文件名' }, { status: 400 })
    }

    // 安全检查：防止路径遍历
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ error: '非法文件名' }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'backups', fileName)
    await unlink(filePath)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
