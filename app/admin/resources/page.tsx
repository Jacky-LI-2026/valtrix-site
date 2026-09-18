import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Download, FileText } from 'lucide-react'
import { serializeBigInt } from '@/lib/serialize'
import ContentRowActions from '@/components/admin/ContentRowActions'
import ColumnSettings from '@/components/admin/ColumnSettings'
import { adminListFilter } from '@/lib/tenant/admin-scope'

const RESOURCES_COLUMNS = [
  { key: "name", label: "资源名称" },
  { key: "category", label: "分类" },
  { key: "format", label: "格式" },
  { key: "size", label: "大小" },
  { key: "fileUrl", label: "下载链接" },
  { key: "downloadCount", label: "下载次数" },
  { key: "status", label: "状态" },
];

export const dynamic = 'force-dynamic'

export default function ResourcesAdminPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  const categories = prisma.resourceCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { items: true } },
      items: {
        where: searchParams.type ? undefined : undefined,
        orderBy: { sortOrder: 'asc' },
        take: 100,
      },
    },
  })

  // 简化：直接获取所有分类和资源
  const allCategories = prisma.resourceCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { items: true } },
    },
  })

  const items = prisma.resourceItem.findMany({
    where: adminListFilter(),
    orderBy: { createdAt: 'desc' },
    include: { category: true },
    take: 100,
  })

  return (
    <ResourceList categoriesPromise={allCategories} itemsPromise={items} selectedType={searchParams.type} />
  )
}

async function ResourceList({
  categoriesPromise,
  itemsPromise,
  selectedType,
}: {
  categoriesPromise: Promise<any>
  itemsPromise: Promise<any>
  selectedType?: string
}) {
  const [categories, items] = await Promise.all([categoriesPromise, itemsPromise])
  const serializedCategories = serializeBigInt(categories)
  const serializedItems = serializeBigInt(items)

  const filteredItems = selectedType
    ? serializedItems.filter((item: any) => item.category?.type === selectedType)
    : serializedItems

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">资源管理</h1>
          <p className="text-gray-500 mt-1">共 {filteredItems.length} 个资源文件</p>
        </div>
          <ColumnSettings moduleKey="resources" columns={RESOURCES_COLUMNS} />
        <Link href="/admin/resources/new" className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium">
          <Plus size={16} />
          新增资源
        </Link>
      </div>

      {/* 分类筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/resources"
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              !selectedType ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部 ({serializedItems.length})
          </Link>
          {serializedCategories.map((cat: any) => (
            <Link
              key={cat.id}
              href={`/admin/resources?type=${cat.type}`}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedType === cat.type ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.title} ({cat._count.items})
            </Link>
          ))}
        </div>
      </div>

      {/* 资源列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">资源名称</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">分类</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">格式</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">大小</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">下载链接</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">下载次数</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                  暂无资源数据
                </td>
              </tr>
            ) : (
              filteredItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 max-w-md truncate">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{item.category?.title || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                      {item.format}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{item.size || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {item.fileUrl ? (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                      >
                        <Download size={14} />
                        有链接
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">无链接（灰色）</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{item.downloadCount || 0}</span>
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
                      apiBase="/api/admin/resources"
                      id={item.id.toString()}
                      editHref={`/admin/resources/${item.id}/edit`}
                      confirmMsg="确定删除该资源？删除后不可恢复。"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
