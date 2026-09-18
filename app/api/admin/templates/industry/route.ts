import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INDUSTRY_PACKS, INDUSTRY_PACK_MAP } from "@/lib/templates/industry-packs";
import { auth } from "@/auth";

// GET /api/admin/templates/industry - 行业包列表
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, packs: INDUSTRY_PACKS });
}

// POST /api/admin/templates/industry - 应用行业包（初始化内容骨架）
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { slug } = body;
    const pack = INDUSTRY_PACK_MAP[slug];
    if (!pack) return NextResponse.json({ error: "行业包不存在" }, { status: 400 });

    // 1) 应用推荐模板主题
    const presetRes = await fetch(
      `${req.nextUrl.origin}/api/admin/templates?action=applyPreset`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: pack.templateSlug }) }
    );
    const presetData = await presetRes.json().catch(() => ({}));
    if (!presetRes.ok) console.warn("applyPreset failed:", presetData);

    // 2) 设置首页区块偏好
    await prisma.siteConfig.upsert({
      where: { configKey: "home_sections" },
      create: { configKey: "home_sections", configValue: pack.sections.map((key, i) => ({ key, enabled: true, sortOrder: i })) as any },
      update: { configValue: pack.sections.map((key, i) => ({ key, enabled: true, sortOrder: i })) as any },
    });

    // 3) 设置 SEO（site_config.seo_config）
    await prisma.siteConfig.upsert({
      where: { configKey: "seo_config" },
      create: {
        configKey: "seo_config",
        configValue: {
          title: pack.seo.title,
          description: pack.seo.description,
          keywords: pack.seo.keywords,
        } as any,
      },
      update: {
        configValue: {
          title: pack.seo.title,
          description: pack.seo.description,
          keywords: pack.seo.keywords,
        } as any,
      },
    });

    // 4) 首页轮播默认文案（hero 占位）
    await prisma.siteConfig.upsert({
      where: { configKey: "home_config" },
      create: {
        configKey: "home_config",
        configValue: {
          banners: [{
            title: pack.placeholders.heroTitle,
            subtitle: pack.placeholders.heroSubtitle,
            ctaText: "了解更多",
            link: "/products",
          }],
          features: [],
          stats: [],
          ctaTitle: "开始合作",
          ctaSubtitle: "联系我们获取专属方案",
        } as any,
      },
      update: {},
    });

    return NextResponse.json({
      ok: true,
      slug: pack.slug,
      name: pack.name,
      templateSlug: pack.templateSlug,
      menuItems: pack.menu.length,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `应用行业包失败: ${e.message}` }, { status: 500 });
  }
}
