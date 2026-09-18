import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import ContentRowActions from '@/components/admin/ContentRowActions'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ColumnSettings from '@/components/admin/ColumnSettings'

const ABOUT_COLUMNS = [
  { key: "name", label: "板块名称" },
  { key: "subtitle", label: "副标题" },
  { key: "blockCount", label: "内容块数" },
  { key: "status", label: "状态" },
];

export const dynamic = 'force-dynamic'

export default async function AboutAdminPage() {
  const sections = await prisma.aboutSection.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  const serialized = serializeBigInt(sections)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">关于我们管理</h1>
          <p className="text-gray-500 mt-1">共 {serialized.length} 个板块</p>
        </div>
          <ColumnSettings moduleKey="about" columns={ABOUT_COLUMNS} />
        <Link href="/admin/about/new" className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium">
          <Plus size={16} />
          新增板块
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">板块名称</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">副标题</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">内容块数</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {serialized.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{item.title}</span>
                    <span className="text-xs text-gray-400">({item.titleEn})</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500 max-w-xs truncate block">{item.subtitle}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{Array.isArray(item.content) ? item.content.length : 0}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.status === 'published' ? '已发布' : '草稿'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ContentRowActions
                    apiBase="/api/admin/about"
                    id={item.id.toString()}
                    editHref={`/admin/about/${item.id}/edit`}
                    confirmMsg="确定删除该内容？删除后不可恢复。"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
