import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TEMPLATE_PRESETS, DEFAULT_TEMPLATE_SLUG, FULL_LAYOUT_SLUGS, presetToThemeConfig } from "@/lib/templates/presets";
// 🔴 「当前应用」的唯一判定入口（与前台同源）。详见下方 ?mode=presets 分支的说明。
import { getActiveTemplateSlug } from "@/lib/templates/get-active-template";
import { auth } from "@/auth";

// BigInt序列化辅助函数
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  return obj;
}

// GET /api/admin/templates - 模板列表（?mode=presets 返回内置预设）
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  if (req.nextUrl.searchParams.get("mode") === "presets") {
    // 🔴 2026-09-15：「当前应用」必须与**前台**同源判定，后台只负责显示结论。
    //    此前后台页自己读 /api/admin/theme（只查 theme_config），取不到就兜底写死 'default'；
    //    而前台走 get-active-template.ts 的 4 级链、兜底是 DEFAULT_TEMPLATE_SLUG。
    //    实测左文站：后台显示「当前应用 = default」，前台实际渲染 t2-industrial —— 两处打架。
    //    现统一由唯一的模板判定入口 getActiveTemplateSlug() 下发（G5：通用能力走统一入口）。
    let activeTemplateSlug: string = DEFAULT_TEMPLATE_SLUG;
    try {
      activeTemplateSlug = await getActiveTemplateSlug();
    } catch (e: any) {
      console.error("[templates] 解析当前应用模板失败，回退默认模板:", e?.message);
    }
    return NextResponse.json({
      ok: true,
      presets: TEMPLATE_PRESETS,
      defaultSlug: DEFAULT_TEMPLATE_SLUG,
      fullLayoutSlugs: FULL_LAYOUT_SLUGS,
      activeTemplateSlug,
    });
  }
  try {
    const templates = await prisma.template.findMany({
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(serializeBigInt(templates));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "获取模板列表失败" }, { status: 500 });
  }
}

// POST /api/admin/templates - 新增模板；?action=applyPreset 应用内置预设
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    // 应用预设模板（一键切换主题）
    if (req.nextUrl.searchParams.get("action") === "applyPreset") {
      const body = await req.json();
      const { slug } = body;
      const preset = TEMPLATE_PRESETS.find((t) => t.slug === slug);
      if (!preset) return NextResponse.json({ error: "预设模板不存在" }, { status: 400 });

      // 1) 应用主题到 ThemeConfig
      const themeData = {
        primary: preset.theme.primary,
        primaryLight: preset.theme.primaryLight,
        primaryDark: preset.theme.primaryDark,
        accent: preset.theme.accent,
        dark: preset.theme.dark,
        darkLight: preset.theme.darkLight,
        fontFamily: preset.theme.fontFamily,
        templateSlug: preset.slug,
        remark: `模板「${preset.name}」(${preset.slug}) 应用`,
      };
      const existingTheme = await prisma.themeConfig.findFirst();
      if (existingTheme) {
        await prisma.themeConfig.update({ where: { id: existingTheme.id }, data: themeData });
      } else {
        await prisma.themeConfig.create({ data: themeData as any });
      }

      // 2) 记录当前应用模板（templates 表 upsert by slug）
      // 🔒 2026-09-14：应用预设 = 启用它 ⇒ 必须**同时停用其他所有模板**，
      //    否则会打破「同一时刻只有一个模板启用」这一不变式。
      const existing = await prisma.template.findUnique({ where: { slug: preset.slug } });
      if (existing) {
        await prisma.template.update({
          where: { id: existing.id },
          data: { name: preset.name, description: preset.description, isDefault: true, isActive: true, config: preset as any },
        });
        await prisma.template.updateMany({ where: { NOT: { id: existing.id }, isDefault: true }, data: { isDefault: false } });
        await prisma.template.updateMany({ where: { NOT: { id: existing.id } }, data: { isActive: false } });
      } else {
        await prisma.template.create({
          data: {
            name: preset.name,
            slug: preset.slug,
            version: "1.0.0",
            description: preset.description,
            config: preset as any,
            isDefault: true,
            isActive: true,
          },
        });
        await prisma.template.updateMany({ where: { NOT: { slug: preset.slug }, isDefault: true }, data: { isDefault: false } });
        await prisma.template.updateMany({ where: { NOT: { slug: preset.slug } }, data: { isActive: false } });
      }

      // 3) 站点模板切换（默认站点）
      const defaultSite = await prisma.site.findFirst({ where: { isDefault: true } });
      if (defaultSite) {
        await prisma.site.update({ where: { id: defaultSite.id }, data: { templateSlug: preset.slug } });
      }

      return NextResponse.json({ ok: true, slug: preset.slug, name: preset.name });
    }

    // 只应用配色（2026-09-15 新增）——「解耦配色与版式」
    // =====================================================
    // 语义：只把预设的 theme（颜色 + 字体）写进 ThemeConfig，并更新 remark。
    // 🔒 刻意**不写**模板 slug、**不动** templates 表、**不动** Site
    //    ⇒ 配色皮肤可以**叠加在「整站版式模板」之上**，不会再被踢回默认版式。
    //    （对比上面的 applyPreset：那是「连版式一起换」，本分支是「只换颜色」。）
    if (req.nextUrl.searchParams.get("action") === "applyColors") {
      const body = await req.json();
      const { slug } = body;
      const preset = TEMPLATE_PRESETS.find((t) => t.slug === slug);
      if (!preset) return NextResponse.json({ error: "预设模板不存在" }, { status: 400 });

      // 复用既有映射函数（禁止手抄字段列表，否则会与预设定义漂移）
      const colorData = {
        ...presetToThemeConfig(preset),
        remark: `配色「${preset.name}」(${preset.slug}) 应用（未切换模板）`,
      };
      const existingTheme = await prisma.themeConfig.findFirst({ orderBy: { id: "asc" } });
      if (existingTheme) {
        await prisma.themeConfig.update({ where: { id: existingTheme.id }, data: colorData as any });
      } else {
        await prisma.themeConfig.create({ data: colorData as any });
      }

      return NextResponse.json({ ok: true, slug: preset.slug, name: preset.name, mode: "colors" });
    }

    const body = await req.json();
    const { name, slug, version, description, screenshot, config, isDefault, isActive, sortOrder } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "模板名称和标识为必填项" }, { status: 400 });
    }

    // slug 唯一性校验
    const exists = await prisma.template.findUnique({ where: { slug } });
    if (exists) {
      return NextResponse.json({ error: `模板标识 ${slug} 已存在` }, { status: 400 });
    }

    // 设为默认时，先取消其他模板的默认标记
    if (isDefault) {
      await prisma.template.updateMany({ data: { isDefault: false } });
    }

    // 🔒 2026-09-14：新建模板时 isActive 默认 true ⇒ 同样必须先停用其他所有模板，
    //    保证「同一时刻只有一个模板启用」。
    const willBeActive = isActive !== undefined ? isActive : true;
    if (willBeActive) {
      await prisma.template.updateMany({ data: { isActive: false } });
    }

    const template = await prisma.template.create({
      data: {
        name,
        slug,
        version: version || "1.0.0",
        description: description || null,
        screenshot: screenshot || null,
        config: config || undefined,
        isDefault: isDefault === true,
        isActive: willBeActive,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(serializeBigInt({ id: template.id, success: true }));
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: `创建模板失败: ${e.message}` }, { status: 500 });
  }
}
