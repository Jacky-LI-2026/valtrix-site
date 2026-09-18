// 将对象中的 BigInt 转为字符串，解决 JSON.stringify 序列化问题
export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return String(obj) as unknown as T
  // Date 对象直接返回（JSON.stringify 会自动序列化为ISO字符串）
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(item => serializeBigInt(item)) as unknown as T
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigInt(value)
    }
    return result as T
  }
  return obj
}
