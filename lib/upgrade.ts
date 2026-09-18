import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export interface UpgradeManifest {
  version: string
  releaseNotes: string
  files: string[]
  migration?: string
  createdAt: string
}

export interface UpgradeResult {
  success: boolean
  version?: string
  message: string
  backupFile?: string
  error?: string
}

// 升级时跳过的目录/文件（不覆盖）
const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  '.env',
  '.env.local',
  'backups',
  'public/uploads',
  '.next',
  'dev_server.log',
  'scripts',
]

/**
 * 校验升级包 manifest
 */
export function validateManifest(manifest: any): manifest is UpgradeManifest {
  if (!manifest || typeof manifest !== 'object') return false
  if (!manifest.version || typeof manifest.version !== 'string') return false
  if (!manifest.files || !Array.isArray(manifest.files)) return false
  return true
}

/**
 * 自动备份当前版本（数据库 + 关键文件）
 */
export async function backupBeforeUpgrade(version: string): Promise<string> {
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupName = `pre-upgrade-${version}-${timestamp}.json`
  const backupPath = path.join(backupDir, backupName)

  // 备份数据库所有表
  const MODELS = [
    'user', 'role', 'permission', 'userRole', 'rolePermission',
    'productTab', 'productCategory', 'product', 'productSpec',
    'siteConfig', 'themeConfig', 'menu', 'language',
    'operationLog', 'systemVersion', 'systemUpdateLog',
    'newsCategory', 'news', 'resourceCategory', 'resourceItem',
    'industry', 'aboutSection', 'job', 'service', 'contactMessage',
    'homeConfig', 'sEOConfig', 'aIConfig', 'verificationCode',
    'downloadRecord', 'server', 'analyticsVisitor', 'analyticsPageView',
    'analyticsEvent', 'newsCollectionSource', 'collectionLog',
    'autoCollectionTask',
  ]

  const backup: Record<string, any> = {
    metadata: { createdAt: new Date().toISOString(), version, type: 'pre-upgrade' },
    data: {},
  }

  for (const model of MODELS) {
    try {
      // @ts-ignore
      const data = await prisma[model]?.findMany?.()
      if (data) backup.data[model] = serializeBigInt(data)
    } catch (e) {
      console.warn(`备份表 ${model} 失败:`, e)
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8')
  return backupName
}

/**
 * 执行升级：覆盖文件 + 数据库迁移 + 更新版本记录
 */
export async function executeUpgrade(
  extractDir: string,
  manifest: UpgradeManifest,
  username: string
): Promise<UpgradeResult> {
  const projectRoot = process.cwd()

  try {
    // 1. 自动备份
    const backupFile = await backupBeforeUpgrade(manifest.version)

    // 2. 覆盖文件（按 manifest 中的文件列表）
    let copiedCount = 0
    for (const relPath of manifest.files) {
      // 安全检查：防止路径遍历
      if (relPath.includes('..') || path.isAbsolute(relPath)) continue

      // 跳过受保护目录
      const shouldSkip = SKIP_PATTERNS.some(p => relPath.startsWith(p) || relPath.includes(`/${p}/`))
      if (shouldSkip) continue

      const srcPath = path.join(extractDir, relPath)
      const destPath = path.join(projectRoot, relPath)

      if (!fs.existsSync(srcPath)) continue

      // 确保目标目录存在
      const destDir = path.dirname(destPath)
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

      fs.copyFileSync(srcPath, destPath)
      copiedCount++
    }

    // 3. 执行数据库迁移（如果有）
    let migrationResult = ''
    if (manifest.migration) {
      const migrationPath = path.join(extractDir, manifest.migration)
      if (fs.existsSync(migrationPath)) {
        try {
          const { stdout, stderr } = await execAsync(`node "${migrationPath}"`, { cwd: projectRoot, timeout: 60000 })
          migrationResult = stdout || stderr
        } catch (e: any) {
          migrationResult = `迁移执行警告: ${e.message}`
        }
      }
    }

    // 4. 更新当前版本记录
    const oldCurrent = await prisma.systemVersion.findFirst({ where: { isCurrent: true } })
    if (oldCurrent) {
      await prisma.systemVersion.update({
        where: { id: oldCurrent.id },
        data: { isCurrent: false },
      })
    }

    await prisma.systemVersion.create({
      data: {
        version: manifest.version,
        releaseDate: new Date(),
        environment: process.env.NODE_ENV || 'development',
        notes: manifest.releaseNotes || '',
        isCurrent: true,
      },
    })

    // 5. 记录升级日志
    await prisma.systemUpdateLog.create({
      data: {
        version: manifest.version,
        changeType: 'feature',
        title: `系统升级到 v${manifest.version}`,
        description: `升级成功，覆盖 ${copiedCount} 个文件${migrationResult ? '，已执行数据库迁移' : ''}。备份文件：${backupFile}`,
        module: 'system',
      },
    })

    return {
      success: true,
      version: manifest.version,
      message: `升级成功！已覆盖 ${copiedCount} 个文件${migrationResult ? '，执行了数据库迁移' : ''}。备份文件：${backupFile}。请重启服务使改动生效。`,
      backupFile,
    }
  } catch (error: any) {
    // 记录失败日志
    await prisma.systemUpdateLog.create({
      data: {
        version: manifest.version,
        changeType: 'bugfix',
        title: `系统升级 v${manifest.version} 失败`,
        description: error.message,
        module: 'system',
      },
    }).catch(() => {})

    return {
      success: false,
      message: '升级失败',
      error: error.message,
    }
  }
}
