import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBackupConfig, setBackupConfig, type BackupConfig } from '@/lib/backup-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const cfg = await getBackupConfig()
    return NextResponse.json({ ...cfg })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未授权' }, { status: 401 })
  try {
    const body = await req.json()
    const cfg: BackupConfig = {
      enabled: !!body.enabled,
      intervalDays: Math.max(1, Math.min(365, parseInt(body.intervalDays) || 1)),
      time: /^\d{2}:\d{2}$/.test(String(body.time || '')) ? String(body.time) : '03:00',
      retainCount: Math.max(1, Math.min(100, parseInt(body.retainCount) || 7)),
      lastRunAt: body.lastRunAt || null,
    }
    await setBackupConfig(cfg)
    return NextResponse.json({ success: true, ...cfg })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
