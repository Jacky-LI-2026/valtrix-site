import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";
import AboutSectionClient from "./AboutSectionClient";
import UnilokAboutSectionPage from "@/components/theme-unilok/AboutSectionPage";
import KitzAboutSectionPage from "@/components/theme-kitzsct/AboutSectionPage";
import { headers } from "next/headers";
import { getTemplatePreset, DEFAULT_TEMPLATE_SLUG } from "@/lib/templates/presets";

// 与 lib/templates/active-theme.ts 的 UNILOK_SLUG 保持一致
const UNILOK_SLUG = "unilok-industrial";
// 与 lib/templates/active-theme.ts 的 KITZ_CLEAN_SLUG 保持一致
const KITZ_SLUG = "kitz-clean";

/** 服务端读取当前活动模板 slug */
async function getTemplateSlugServer(): Promise<string> {
  try {
    const h = headers();
    const previewTpl = h.get("x-preview-template");
    if (previewTpl) return getTemplatePreset(previewTpl).slug;
    const { getTenantContext } = await import("@/lib/tenant/context");
    const ctx = await getTenantContext(h);
    if (ctx?.themeConfig && typeof ctx.themeConfig === "object") {
      const tc: any = ctx.themeConfig;
      if (tc.primary || tc.primaryLight || tc.accent) {
        return ctx.templateSlug || DEFAULT_TEMPLATE_SLUG;
      }
    }
    const config = await prisma.themeConfig.findFirst({
      orderBy: { id: "asc" },
    });
    return config?.templateSlug || DEFAULT_TEMPLATE_SLUG;
  } catch {
    return DEFAULT_TEMPLATE_SLUG;
  }
}

interface Props {
  params: Record<string, string>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const slug = decodeURIComponent(props.params.section);
    const record = await (prisma as any)["aboutSection"].findUnique({ where: { slug: slug } });
    if (!record) {
      return { title: decodeURIComponent(props.params.section) };
    }
    return buildSeoMetadata({
      record,
      fallbackTitle: record["titleEn"] || record["title"] || "",
      fallbackDescription: record["descriptionEn"] || record["description"] || "",
    });
  } catch (e) {
    console.error("app/about/[section]" + " generateMetadata 失败:", (e as Error).message);
    return {};
  }
}

export default async function Page(props: Props) {
  const templateSlug = await getTemplateSlugServer();
  const isUnilok = templateSlug === UNILOK_SLUG;
  const isKitz = templateSlug === KITZ_SLUG;
  return isKitz ? (
    <KitzAboutSectionPage params={props.params as any} />
  ) : isUnilok ? (
    <UnilokAboutSectionPage params={props.params as any} />
  ) : (
    <AboutSectionClient params={props.params as any} />
  );
}
