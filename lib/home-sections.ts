/**
 * 前台组件市场（Home Sections）
 * =====================================================
 * 可视化配置首页各区块组件的显示 / 排序 / 启停。
 * 数据存 site_config.home_sections（Json）：[{key, name, enabled, sortOrder}]
 */
import { prisma } from "@/lib/prisma";

export interface HomeSectionDef {
  key: string;
  name: string;
  description: string;
}

export const HOME_SECTIONS: HomeSectionDef[] = [
  { key: "hero", name: "首页轮播 Hero", description: "顶部大图轮播 + 主标语" },
  { key: "products", name: "核心产品", description: "产品系列卡片展示" },
  { key: "features", name: "核心优势 Features", description: "四大核心优势区块" },
  { key: "stats", name: "数据统计 Stats", description: "年份/专利/系列/行业数字" },
  { key: "about", name: "关于我们", description: "公司简介 + 品牌介绍" },
  { key: "industries", name: "应用领域", description: "行业解决方案入口" },
  { key: "cases", name: "成功案例", description: "CaseShowcase 案例展示" },
  { key: "services", name: "服务能力", description: "OEM/ODM 等服务区块" },
  { key: "cta", name: "底部行动号召 CTA", description: "联系我们 / 获取报价按钮" },
];

export interface HomeSectionConfig {
  key: string;
  enabled: boolean;
  sortOrder: number;
}

const CFG_KEY = "home_sections";

/** 读取当前生效配置（未配置则全部启用，按默认顺序） */
export async function getHomeSectionConfig(): Promise<HomeSectionConfig[]> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { configKey: CFG_KEY } });
    if (row?.configValue && typeof row.configValue === "object") {
      const arr = Array.isArray(row.configValue) ? row.configValue : (row.configValue as any).sections;
      if (Array.isArray(arr) && arr.length) {
        return arr.map((s: any) => ({ key: String(s.key), enabled: s.enabled !== false, sortOrder: Number(s.sortOrder) || 0 }));
      }
    }
  } catch { /* ignore */ }
  return HOME_SECTIONS.map((s, i) => ({ key: s.key, enabled: true, sortOrder: i }));
}

/** 保存配置 */
export async function saveHomeSectionConfig(list: HomeSectionConfig[]) {
  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  await prisma.siteConfig.upsert({
    where: { configKey: CFG_KEY },
    create: { configKey: CFG_KEY, configValue: sorted as any },
    update: { configValue: sorted as any },
  });
  return sorted;
}
