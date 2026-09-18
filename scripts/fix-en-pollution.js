/**
 * 修复被污染的 En 字段（"[翻译结果] xxx" → 正确英文翻译）
 * 用 MyMemory 重新翻译 zh → en
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateEn(text) {
  if (!text) return null;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|en-US&de=dev%40zuowentech.com`;
    const res = await fetch(url);
    if (res.status === 429) return null;
    if (!res.ok) return null;
    const data = await res.json();
    let t = data?.responseData?.translatedText || '';
    if (t) t = t.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
    return t || null;
  } catch (e) { return null; }
}

async function main() {
  // 1. jewelry industry
  const jewelry = await prisma.industry.findUnique({ where: { slug: 'jewelry' } });
  if (jewelry) {
    const update = {};
    const nameT = await translateEn(jewelry.name);
    if (nameT) update.nameEn = nameT;
    await sleep(800);
    const tagT = await translateEn(jewelry.tagline);
    if (tagT) update.taglineEn = tagT;
    await sleep(800);
    if (Object.keys(update).length) {
      await prisma.industry.update({ where: { id: jewelry.id }, data: update });
      console.log('jewelry 已修复:', JSON.stringify(update));
    }
  }
  // 2. equipment-rd-engineer job
  const job = await prisma.job.findUnique({ where: { slug: 'equipment-rd-engineer' } });
  if (job) {
    const t = await translateEn(job.title);
    if (t) {
      await prisma.job.update({ where: { id: job.id }, data: { titleEn: t } });
      console.log('equipment-rd-engineer 已修复: titleEn =', t);
    }
  }
  console.log('修复完成');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
