/**
 * 首页「产品中心」区块用的**扁平列表**构造器（纯函数，服务端/客户端共用）
 * ==========================================================================
 * 为什么单独抽出来（owner 2026-10-12「如何让百度完整收录」）：
 *   首页产品区块是客户端组件（自己 fetch），SSR 时区块内没有数据 ⇒ 首页 HTML 里
 *   **一条 `/products/...` 内链都没有**，而首页是全站权重最高、爬虫最主要的入口页。
 *   现在首页改由服务端先摊平后注入 ⇒ 首屏 HTML 直接有分类/产品内链。
 *
 * 为什么是"扁平列表"而不是"整棵产品树"：
 *   区块只用到 `{分类名/描述}` 与 `{产品名/副标题/所属产品线}` 这些字段，整棵树还要带上
 *   specs / 六语种正文等大字段。实测（阀门站）：注入整树让首页 HTML 从 ~100KB 涨到 371KB
 *   （gzip 多 ~35KB），而渲染出来是一样的 —— 故只传摊平后的两份小列表。
 *
 * ⚠️ 本模块是**纯函数**（不 import 任何 client/server 专属东西），
 *    服务端页面与客户端组件共用同一份映射，杜绝"两处各算一套"的口径漂移。
 */

export interface HomeCategoryItem {
  slug: string;
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameKo?: string;
  nameFr?: string;
  nameAr?: string;
  description?: string;
  descriptionEn?: string;
  descriptionJa?: string;
  descriptionKo?: string;
  descriptionFr?: string;
  descriptionAr?: string;
}

export interface HomeProductItem {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  nameJa?: string;
  nameKo?: string;
  nameFr?: string;
  nameAr?: string;
  subtitle?: string;
  subtitleEn?: string;
  subtitleJa?: string;
  subtitleKo?: string;
  subtitleFr?: string;
  subtitleAr?: string;
  tabSlug: string;
}

/** 公开产品树（Tab→Category→Model）→ 区块要用的两份扁平列表 */
export function buildHomeProductLists(tabs: any[]): {
  cats: HomeCategoryItem[];
  prods: HomeProductItem[];
} {
  const cats: HomeCategoryItem[] = [];
  const prods: HomeProductItem[] = [];
  (tabs || []).forEach((tab: any) => {
    cats.push({
      slug: tab.id,
      name: tab.name,
      nameEn: tab.nameEn,
      nameJa: tab.nameJa,
      nameKo: tab.nameKo,
      nameFr: tab.nameFr,
      nameAr: tab.nameAr,
      description: tab.categories?.[0]?.description || "",
      descriptionEn: tab.categories?.[0]?.descriptionEn || "",
      descriptionJa: tab.categories?.[0]?.descriptionJa || "",
      descriptionKo: tab.categories?.[0]?.descriptionKo || "",
      descriptionFr: tab.categories?.[0]?.descriptionFr || "",
      descriptionAr: tab.categories?.[0]?.descriptionAr || "",
    });
    tab.categories?.forEach((cat: any) => {
      cat.models?.forEach((p: any) => {
        prods.push({
          id: p.id,
          slug: p.id,
          name: p.name,
          nameEn: p.nameEn,
          nameJa: p.nameJa,
          nameKo: p.nameKo,
          nameFr: p.nameFr,
          nameAr: p.nameAr,
          subtitle: p.subtitle || p.summary || "",
          subtitleEn: p.subtitleEn || p.summaryEn || "",
          subtitleJa: p.subtitleJa || p.summaryJa || "",
          subtitleKo: p.subtitleKo || p.summaryKo || "",
          subtitleFr: p.subtitleFr || p.summaryFr || "",
          subtitleAr: p.subtitleAr || p.summaryAr || "",
          tabSlug: tab.id,
        });
      });
    });
  });
  return { cats, prods };
}
