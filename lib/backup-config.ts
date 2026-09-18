import { prisma } from '@/lib/prisma'

// 定时自动备份配置（site_config.backup_config）
export interface BackupConfig {
  enabled: boolean
  intervalDays: number
  time: string // "HH:MM" 每日执行时间点
  retainCount: number
  lastRunAt: string | null
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: false,
  intervalDays: 1,
  time: '03:00',
  retainCount: 7,
  lastRunAt: null,
}

export async function getBackupConfig(): Promise<BackupConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { configKey: 'backup_config' },
    })
    if (row && row.configValue) {
      const raw = row.configValue as unknown
      const v =
        typeof raw === 'string'
          ? JSON.parse(raw)
          : (raw as Record<string, any>) || {}
      return { ...DEFAULT_BACKUP_CONFIG, ...v }
    }
  } catch (e) {
    console.error('读取定时备份配置失败:', e)
  }
  return { ...DEFAULT_BACKUP_CONFIG }
}

export async function setBackupConfig(cfg: BackupConfig): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { configKey: 'backup_config' },
    update: { configValue: JSON.stringify(cfg), updatedAt: new Date() },
    create: { configKey: 'backup_config', configValue: JSON.stringify(cfg), remark: '定时自动备份配置', updatedAt: new Date() },
  })
}
