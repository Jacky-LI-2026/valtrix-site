// 注册 UNILOK 精密工业风模板到 templates 表
// 用法: node scripts/_seed_unilok_template.js
const { PrismaClient } = require('../lib/generated/prisma');
const p = new PrismaClient();

async function main() {
  const slug = 'unilok-industrial';
  const existing = await p.template.findUnique({ where: { slug } });
  if (existing) {
    console.log(`模板已存在: ${existing.name} (${slug}), id=${existing.id.toString()}`);
    // 确保 isActive=true
    if (!existing.isActive) {
      await p.template.update({ where: { id: existing.id }, data: { isActive: true } });
      console.log('已启用该模板');
    }
  } else {
    const t = await p.template.create({
      data: {
        name: 'UNILOK 精密工业风',
        slug,
        version: '1.0.0',
        description: '深蓝主色+橙红点缀，模仿韩国 UNILOK 阀门企业官网风格。全宽 Hero 轮播、大字标题、L 形角标、线框图标能力卡片、产品参数表。',
        isDefault: false,
        isActive: true,
        sortOrder: 11,
        config: {
          category: '工业',
          theme: { primary: '#0F3460', primaryLight: '#1A4B8C', primaryDark: '#0A2540', accent: '#E84C22', dark: '#1A1A2E' },
          style: { radius: 'sharp', shadow: 'soft', spacing: 'spacious', hero: 'full', header: 'solid', card: 'bordered', cta: 'solid' },
        },
      },
    });
    console.log(`模板已创建: ${t.name} (${slug}), id=${t.id.toString()}`);
  }

  // 检查当前 themeConfig 的 templateSlug
  const tc = await p.themeConfig.findFirst({ orderBy: { id: 'asc' }, select: { id: true, templateSlug: true, primary: true } });
  console.log(`当前 themeConfig: templateSlug=${tc?.templateSlug || '(未设置)'}, primary=${tc?.primary}`);
  console.log('提示: 在后台「模板管理」或「主题配色」中应用该模板即可切换前台渲染。');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
