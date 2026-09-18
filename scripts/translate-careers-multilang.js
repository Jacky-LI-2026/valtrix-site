/**
 * 职位（careers）多语言补全脚本
 * - 读取全部 open 职位
 * - 对缺少 Ja/Ko/Ar 的字段进行翻译（MyMemory，zh-CN → ja-JP / ko-KR / ar-SA）
 * - 标量字段逐个翻译；Json 数组字段逐项翻译
 * - 用 Prisma 直写数据库
 *
 * 用法: node scripts/translate-careers-multilang.js [slug]
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const LANG_MAP = {
  Ja: { langPair: 'ja-JP', label: '日文' },
  Ko: { langPair: 'ko-KR', label: '韩文' },
  Ar: { langPair: 'ar-SA', label: '阿拉伯文' },
};

const SCALAR_FIELDS = ['title', 'department', 'location', 'type', 'salary', 'experience', 'education'];
const ARRAY_FIELDS = ['tags', 'description', 'responsibilities', 'requirements', 'benefits'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateMyMemory(text, langPair) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh-CN|${langPair}&de=dev%40zuowentech.com`;
    const res = await fetch(url);
    if (res.status === 429) return null;
    if (!res.ok) return null;
    const data = await res.json();
    let t = data?.responseData?.translatedText || '';
    if (t) {
      t = t.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").trim();
    }
    return t || null;
  } catch (e) {
    return null;
  }
}

async function translateSmart(text, langPair) {
  if (!text || !String(text).trim()) return text;
  for (let attempt = 0; attempt < 3; attempt++) {
    const t = await translateMyMemory(String(text), langPair);
    if (t) return t;
    await sleep(1500);
  }
  return null;
}

async function translateArrayField(arr, langPair) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  const out = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      const t = await translateSmart(item, langPair);
      out.push(t || item);
      await sleep(700);
    } else {
      out.push(item);
    }
  }
  return out;
}

async function main() {
  const targetSlug = process.argv[2] || null;
  const jobs = await prisma.job.findMany({
    where: { ...(targetSlug ? { slug: targetSlug } : {}) },
    orderBy: { sortOrder: 'asc' },
  });
  console.log(`待处理职位: ${jobs.length} 个`);
  if (jobs.length === 0) return;

  for (const job of jobs) {
    console.log(`\n===== ${job.slug} (${job.title}) =====`);
    const update = {};
    for (const [suffix, cfg] of Object.entries(LANG_MAP)) {
      const hasTitle = job[`title${suffix}`] && String(job[`title${suffix}`]).trim();
      if (hasTitle) {
        console.log(`  ${cfg.label} 已有 title，跳过该语种`);
        continue;
      }
      // 标量字段
      for (const f of SCALAR_FIELDS) {
        const t = await translateSmart(job[f], cfg.langPair);
        if (t) update[`${f}${suffix}`] = t;
        await sleep(700);
      }
      // 数组字段
      for (const f of ARRAY_FIELDS) {
        update[`${f}${suffix}`] = await translateArrayField(job[f], cfg.langPair);
      }
      console.log(`  ${cfg.label} 翻译完成`);
    }
    if (Object.keys(update).length > 0) {
      await prisma.job.update({ where: { id: job.id }, data: update });
      console.log(`  ✔ 已保存 ${job.slug}: ${Object.keys(update).length} 个字段`);
    }
  }
  console.log('\n全部完成');
}

main()
  .catch((e) => { console.error('脚本失败:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
