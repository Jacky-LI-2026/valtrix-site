/**
 * EDM 订阅者自动收集（统一入口）
 * 询盘/留言/考察预约/下载留资等留资提交时，把邮箱自动纳入邮件营销订阅者，
 * 供后台「EDM 邮件营销」群发使用。已存在则保持原状态（不退订状态），active 时补充 group/source/name。
 */
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function ensureEmailSubscriber(
  email: string,
  group: string,
  source: string,
  name?: string
): Promise<void> {
  const e = String(email || "").trim().toLowerCase();
  if (!e || e.length > 100 || !EMAIL_RE.test(e)) return;
  try {
    const existing = await prisma.emailSubscriber.findUnique({ where: { email: e } });
    if (existing) {
      if (existing.status === "active") {
        await prisma.emailSubscriber.update({
          where: { email: e },
          data: {
            group: existing.group || group,
            source: existing.source || source,
            name: existing.name || (name ? String(name).slice(0, 100) : undefined),
          },
        });
      }
      return;
    }
    await prisma.emailSubscriber.create({
      data: {
        email: e,
        group: String(group).slice(0, 50),
        source: String(source).slice(0, 100),
        name: name ? String(name).slice(0, 100) : null,
        status: "active",
      },
    });
  } catch (err) {
    // 静默失败，不影响留资主流程
    console.error("[email-subscriber]", err);
  }
}
