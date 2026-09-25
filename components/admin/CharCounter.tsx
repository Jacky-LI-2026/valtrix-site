'use client'

/**
 * 字数提示（「已用 384 / 上限 500」）
 * ==========================================================================
 * 为什么有（owner 2026-09-20 要求）：此前后台是「保存后才知道超了」——
 *   数据库列有长度上限（`prisma/schema.prisma` 的 `@db.VarChar(n)`），而中文翻成
 *   法文/阿拉伯文常膨胀 3~4 倍（实测 99 字中文 → 384 字法文），很容易撞线。
 *   上限经 `/api/admin/content/[type]/meta` 下发，这里只负责显示：
 *     · ≥90% 琥珀色预警；超限红色 + 显示超出多少；
 *     · 配合输入框的 `maxLength`（硬限制），让用户**输入时**就看得见。
 * 没有上限（Text 列）时不渲染任何东西。
 */
export default function CharCounter({ value, max, className = '' }: { value?: string; max?: number; className?: string }) {
  if (!max) return null
  const n = (value || '').length
  const over = n > max
  const near = !over && n >= Math.floor(max * 0.9)
  const tone = over ? 'text-red-600 font-medium' : near ? 'text-amber-600' : 'text-gray-400'
  return (
    <span className={`text-[11px] tabular-nums ${tone} ${className}`} title={`该字段的数据库上限为 ${max} 字`}>
      已用 {n} / 上限 {max}
      {over ? `（超出 ${n - max}）` : ''}
    </span>
  )
}
