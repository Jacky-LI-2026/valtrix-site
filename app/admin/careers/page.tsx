import { prisma } from '@/lib/prisma'
import { serializeBigInt } from '@/lib/serialize'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ContentRowActions from '@/components/admin/ContentRowActions'
import ColumnSettings from '@/components/admin/ColumnSettings'
import { adminListFilter } from '@/lib/tenant/admin-scope'

const CAREERS_COLUMNS = [
  { key: "title", label: "职位名称" },
  { key: "department", label: "部门" },
  { key: "location", label: "地点" },
  { key: "type", label: "类型" },
  { key: "salary", label: "薪资" },
  { key: "experience", label: "经验" },
  { key: "status", label: "状态" },
];

export const dynamic = 'force-dynamic'

export default async function CareersAdminPage({
  searchParams,
}: {
  searchParams: { department?: string }
}) {
  const jobs = await prisma.job.findMany({
    where: adminListFilter(),
    orderBy: { sortOrder: 'asc' },
  })

  const serialized = serializeBigInt(jobs)
  const departments = Array.from(new Set(serialized.map((j: any) => j.department)))

  const filtered = searchParams.department
    ? serialized.filter((j: any) => j.department === searchParams.department)
    : serialized

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">招聘管理</h1>
          <p className="text-gray-500 mt-1">共 {filtered.length} 个职位</p>
        </div>
          <ColumnSettings moduleKey="careers" columns={CAREERS_COLUMNS} />
        <Link href="/admin/careers/new" className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium">
          <Plus size={16} />
          新增职位
        </Link>
      </div>

      {/* 部门筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/careers"
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              !searchParams.department ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部 ({serialized.length})
          </Link>
          {departments.map((dept: string) => (
            <Link
              key={dept}
              href={`/admin/careers?department=${dept}`}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                searchParams.department === dept ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {dept}
            </Link>
          ))}
        </div>
      </div>

      {/* 职位列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">职位名称</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">部门</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">地点</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">薪资</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">经验</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900">{item.title}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{item.department}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{item.location}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{item.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{item.salary || '-'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{item.experience || '-'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    item.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.status === 'open' ? '招聘中' : '已关闭'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ContentRowActions
                    apiBase="/api/admin/careers"
                    id={item.id.toString()}
                    editHref={`/admin/careers/${item.id}/edit`}
                    previewHref={item.slug ? `/careers/${item.slug}` : undefined}
                    confirmMsg="确定删除该职位？删除后不可恢复。"
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

