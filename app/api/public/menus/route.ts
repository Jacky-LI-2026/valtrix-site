import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPluginState } from "@/lib/plugins/store";

/**
 * 前台菜单 URL 前缀 → 插件 key 映射。
 * 插件在后台被停用时，对应菜单（含整棵子树）从前台导航隐藏。
 * 覆盖：在线商城/模板展示/考察预约/会员/表单/询价报价 + 各内容栏目。
 */
const MENU_PLUGIN_MAP: [string, string][] = [
  ["/shop", "mall"],
  ["/template-preview", "frontend-theme"],
  ["/visit-booking", "visit-booking"],
  ["/member", "member"],
  ["/forms", "form-builder"],
  ["/quote", "quote"],
  ["/products", "content-product"],
  ["/news", "content-news"],
  ["/resources", "content-resource"],
  ["/industries", "content-industry"],
  ["/services", "content-service"],
  ["/cases", "content-case"],
  ["/faqs", "content-faq"],
  ["/careers", "content-career"],
  ["/about", "content-about"],
];

function menuPluginKey(url: string | null | undefined): string | null {
  if (!url) return null;
  for (const [prefix, key] of MENU_PLUGIN_MAP) {
    if (url === prefix || url.startsWith(prefix + "/") || url.startsWith(prefix + "?")) return key;
  }
  return null;
}

/**
 * 公共菜单API接口
 * 返回前台导航菜单数据（支持层级结构和多语言）
 * GET /api/public/menus?locale=zh|en
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "zh";

    // 查询所有启用的菜单项，按排序字段排序
    const allMenus = await prisma.menu.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: "asc" },
        { id: "asc" },
      ],
    });

    // 插件启用状态（前台入口联动：插件停用 → 对应菜单隐藏）
    let pluginState: Record<string, boolean> = {};
    try {
      const stored = await getPluginState();
      for (const [key, entry] of Object.entries(stored)) pluginState[key] = !!entry.enabled;
    } catch (e) { /* 插件状态读取失败时不做过滤（保底放行） */ }

    // 前台「模板展示」入口开关：站点设置关闭时同样不返回 /template-preview 菜单
    let showTpl = true;
    try {
      const cfg = await prisma.siteConfig.findUnique({
        where: { configKey: "showTemplatePreviewMenu" },
      });
      showTpl = cfg?.configValue !== false;
    } catch (e) { /* 忽略 */ }

    // 构建层级结构
    const menuMap = new Map<bigint, any>();
    const rootMenus: any[] = [];

    // 根据locale返回对应语种的菜单名称/描述
    const pickLang = (zh: string, en: string, ja: string, ko: string, fr: string, ar: string): string => {
      if (locale === 'en') return en || zh;
      if (locale === 'ja') return ja || zh;
      if (locale === 'ko') return ko || zh;
      if (locale === 'fr') return fr || zh;
      if (locale === 'ar') return ar || zh;
      return zh;
    };
    for (const menu of allMenus) {
      const name = pickLang(menu.name, menu.nameEn || '', menu.nameJa || '', menu.nameKo || '', menu.nameFr || '', menu.nameAr || '');
      const desc = pickLang(menu.description || '', menu.descriptionEn || '', menu.descriptionJa || '', menu.descriptionKo || '', menu.descriptionFr || '', menu.descriptionAr || '');
      const node = {
        id: Number(menu.id),
        name: name,
        description: desc,
        nameEn: menu.nameEn,
        nameZh: menu.name,
        url: menu.url,
        icon: menu.icon,
        sortOrder: menu.sortOrder,
        parentId: menu.parentId ? Number(menu.parentId) : null,
        children: [],
      };
      menuMap.set(menu.id, node);
    }

    // 第二遍：构建父子关系
    for (const menu of allMenus) {
      const node = menuMap.get(menu.id)!;
      if (menu.parentId && menuMap.has(menu.parentId)) {
        const parent = menuMap.get(menu.parentId)!;
        parent.children.push(node);
      } else {
        rootMenus.push(node);
      }
    }

    // 按sortOrder排序子菜单
    const sortChildren = (menus: any[]) => {
      menus.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const menu of menus) {
        if (menu.children.length > 0) {
          sortChildren(menu.children);
        }
      }
    };
    sortChildren(rootMenus);

    // 递归过滤：命中已停用插件 / 模板展示开关关闭 → 整棵子树隐藏
    const shouldHide = (menu: any): boolean => {
      const key = menuPluginKey(menu.url);
      if (key) {
        const enabled = key === "frontend-theme"
          ? (pluginState[key] !== false && showTpl)
          : pluginState[key] !== false;
        if (!enabled) return true;
      }
      return false;
    };
    const filterTree = (menus: any[]): any[] => {
      const out: any[] = [];
      for (const menu of menus) {
        if (shouldHide(menu)) continue;
        menu.children = filterTree(menu.children);
        out.push(menu);
      }
      return out;
    };
    const visible = filterTree(rootMenus);

    return new NextResponse(JSON.stringify({
      success: true,
      data: visible,
      locale,
      total: visible.length,
    }), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // 菜单受插件启停/后台菜单管理实时影响，禁用缓存保证前台即时联动
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("获取菜单数据失败:", error);
    return new NextResponse(JSON.stringify(
      {
        success: false,
        error: "获取菜单数据失败",
        data: [],
      },
    ), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
