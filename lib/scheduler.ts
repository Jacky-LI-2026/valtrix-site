import cron from 'node-cron'
import { industryDesc } from '@/lib/brand'
import { prisma } from './prisma'

let isInitialized = false

// 初始化定时任务
export function initScheduler() {
  if (isInitialized) return
  isInitialized = true

  console.log('[Scheduler] 定时任务调度器已启动')

  // 每分钟检查一次采集任务
  cron.schedule('* * * * *', async () => {
    try {
      await checkCollectionTasks()
      await checkAutoCollectionTasks()
    } catch (error) {
      console.error('[Scheduler] 采集任务检查失败:', error)
    }
  })

  // 每 5 分钟检查商城订单销售跟进超时（2 小时无回应自动轮转给下一个销售）
  cron.schedule('*/5 * * * *', async () => {
    try {
      const { escalateOverdueOrders } = await import('./server/sales-assign')
      const n = await escalateOverdueOrders()
      if (n > 0) console.log(`[Scheduler] 订单跟进轮转完成：${n} 单已转给下一位销售`)
    } catch (error) {
      console.error('[Scheduler] 订单跟进轮转检查失败:', error)
    }
  })
  console.log('[Scheduler] 订单跟进轮转任务已注册（每5分钟检查）')
}

// 检查并执行采集源任务
async function checkCollectionTasks() {
  const now = new Date()
  const sources = await prisma.newsCollectionSource.findMany({
    where: { enabled: true },
  })

  for (const source of sources) {
    const shouldRun = shouldRunCollection(source, now)
    if (shouldRun) {
      console.log(`[Scheduler] 执行采集源任务: ${source.name}`)
      try {
        await prisma.newsCollectionSource.update({
          where: { id: source.id },
          data: { lastFetched: now, lastStatus: 'success' },
        })
        console.log(`[Scheduler] 采集源任务完成: ${source.name}`)
      } catch (error: any) {
        await prisma.newsCollectionSource.update({
          where: { id: source.id },
          data: { lastFetched: now, lastStatus: 'failed', lastError: error.message },
        })
        console.error(`[Scheduler] 采集源任务失败: ${source.name}`, error)
      }
    }
  }
}

// 检查并执行自动采集任务
async function checkAutoCollectionTasks() {
  const now = new Date()
  const tasks = await prisma.autoCollectionTask.findMany({
    where: { enabled: true },
  })

  for (const task of tasks) {
    const shouldRun = shouldRunAutoTask(task, now)
    if (shouldRun) {
      console.log(`[Scheduler] 执行自动采集任务: ${task.name}`)
      try {
        // 执行AI采集（调用大模型生成新闻）
        await executeAutoCollectionTask(task)
        await prisma.autoCollectionTask.update({
          where: { id: task.id },
          data: { lastRunAt: now, lastStatus: 'success' },
        })
        console.log(`[Scheduler] 自动采集任务完成: ${task.name}`)
      } catch (error: any) {
        await prisma.autoCollectionTask.update({
          where: { id: task.id },
          data: { lastRunAt: now, lastStatus: 'failed' },
        })
        console.error(`[Scheduler] 自动采集任务失败: ${task.name}`, error)
      }
    }
  }
}

// 执行自动采集任务
async function executeAutoCollectionTask(task: any) {
  // 构建prompt生成行业新闻（包含标题、摘要、图片建议、正文）
  const prompt = `请作为专业的行业新闻编辑，围绕"${task.keyword}"这个主题，撰写一篇关于${industryDesc("本行业")}的新闻文章。要求：
1. 标题吸引人，不超过30字
2. 摘要100-150字
3. 正文800-1200字，分3-5个段落
4. 内容专业、客观，符合行业新闻风格
5. 提供一张与内容相关的配图建议描述

请以JSON格式返回：{"title":"标题","summary":"摘要","content":"正文内容（HTML格式）","imageSuggestion":"配图建议"}`

  // 这里简化处理，实际应调用大模型API
  // 由于scheduler运行在服务器端，可以直接调用大模型API
  console.log(`[Scheduler] 自动采集任务prompt已构建: ${task.keyword}`)

  // 统一走 AI 网关（lib/ai/gateway.ts callAiText，读 site_config.ai_global_config，
  // 密钥三级回退；此前误读 ai_config 表导致自动采集永远"大模型未配置"跳过）
  const { callAiText } = await import("@/lib/ai/gateway")

  try {
    const result = await callAiText(prompt, { system: "你是一个专业的行业新闻编辑。", maxTokens: 1600 })

    // 解析JSON结果
    let newsData: any = {}
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) newsData = JSON.parse(jsonMatch[0])
    } catch (e) {
      newsData = { title: task.keyword + '行业新闻', summary: result.slice(0, 150), content: result }
    }

    // 如果自动发布，创建新闻
    if (task.autoPublish) {
      await prisma.news.create({
        data: {
          title: newsData.title || task.keyword + '行业新闻',
          titleEn: '',
          slug: `ai-${Date.now()}`,
          categoryId: task.categoryId || null,
          summary: newsData.summary || '',
          content: newsData.content || result,
          coverImage: task.defaultImage || '',
          author: 'AI自动采集',
          source: 'AI生成',
          sourceUrl: '',
          tags: [task.keyword],
          isFeatured: false,
          isTop: false,
          status: 'published',
          publishedAt: new Date(),
        },
      })
      console.log(`[Scheduler] 自动采集新闻已发布: ${newsData.title}`)
    }
  } catch (error: any) {
    console.error('[Scheduler] 大模型调用失败:', error.message)
    throw error
  }
}

// 判断采集源是否需要执行
function shouldRunCollection(source: any, now: Date): boolean {
  const intervalMs = (source.intervalMin || 60) * 60 * 1000
  if (!source.lastFetched) return true
  const lastFetched = new Date(source.lastFetched)
  const elapsed = now.getTime() - lastFetched.getTime()
  return elapsed >= intervalMs
}

// 判断自动采集任务是否需要执行
function shouldRunAutoTask(task: any, now: Date): boolean {
  if (!task.lastRunAt) return true

  const lastRun = new Date(task.lastRunAt)
  const elapsed = now.getTime() - lastRun.getTime()

  switch (task.frequency) {
    case 'hourly':
      return elapsed >= 60 * 60 * 1000 // 1小时
    case 'daily':
      return elapsed >= 24 * 60 * 60 * 1000 // 24小时
    case 'weekly':
      return elapsed >= 7 * 24 * 60 * 60 * 1000 // 7天
    default:
      return elapsed >= 24 * 60 * 60 * 1000
  }
}
