import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
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
    const data = await readFile(filePath)

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
