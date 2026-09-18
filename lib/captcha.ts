import crypto from 'crypto'

// 内存存储验证码：captchaId -> { answer, expiresAt }
// 生产环境建议用 Redis，这里用 Map 带过期清理
export const captchaStore = new Map<string, { answer: string; expiresAt: number }>()

// 定期清理过期验证码（每5分钟）
setInterval(() => {
  const now = Date.now()
  Array.from(captchaStore.entries()).forEach(([key, val]) => {
    if (val.expiresAt < now) captchaStore.delete(key)
  })
}, 5 * 60 * 1000)

export function getCaptchaAnswer(captchaId: string): string | null {
  const record = captchaStore.get(captchaId)
  if (!record) return null
  if (record.expiresAt < Date.now()) {
    captchaStore.delete(captchaId)
    return null
  }
  return record.answer
}

export function consumeCaptcha(captchaId: string): string | null {
  const answer = getCaptchaAnswer(captchaId)
  if (answer !== null) captchaStore.delete(captchaId)
  return answer
}

export function createCaptcha(): { captchaId: string; question: string; expiresIn: number } {
  // 生成数学验证码：a + b 或 a - b（结果为正整数）
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  const ops = ['+', '-', '×'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]

  let answer: number
  let question: string
  if (op === '+') {
    answer = a + b
    question = `${a} + ${b}`
  } else if (op === '-') {
    // 保证结果为正
    const max = Math.max(a, b)
    const min = Math.min(a, b)
    answer = max - min
    question = `${max} - ${min}`
  } else {
    answer = a * b
    question = `${a} × ${b}`
  }

  const captchaId = crypto.randomUUID()
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5分钟过期
  captchaStore.set(captchaId, { answer: String(answer), expiresAt })

  return { captchaId, question, expiresIn: 300 }
}
