import { getActiveTemplateSlug, KITZ_CLEAN_SLUG } from "@/lib/templates/get-active-template";
import UnilokAboutPage from "@/components/theme-unilok/AboutPage";
import KitzAboutPage from "@/components/theme-kitzsct/AboutPage";
import AboutDefaultClient from "./AboutDefaultClient";

// 必须逐请求渲染：模板判定依赖请求头（x-preview-template / Host），
// 静态预渲染阶段拿不到请求头 → 会固定渲染默认模板。参见 AGENTS.md 同类坑。
export const dynamic = "force-dynamic";

// 与 lib/templates/active-theme.ts 的 UNILOK_SLUG 保持一致
const UNILOK_SLUG = "unilok-industrial";

/**
 * 模板派发（双 fork 合并 D3/D4，2026-09-12）
 * =====================================================
 * UNILOK 模板 → 渲染 Unilok 版；其余模板（含默认）→ 渲染默认版。
 * 默认版主体由基地原 <route>/page.tsx 原样拆出到 ./AboutDefaultClient，
 * **品牌文案保持基地原样**（未采用阀门站版本）。
 * 模板判定统一走 lib/templates/get-active-template.ts（D4 唯一入口）。
 */
export default async function AboutRoute() {
  const templateSlug = await getActiveTemplateSlug();
  // KITZ 洁净科技风模板（kitz-clean）→ 渲染 Kitz 版
  if (templateSlug === KITZ_CLEAN_SLUG) return <KitzAboutPage />;
  return templateSlug === UNILOK_SLUG ? <UnilokAboutPage /> : <AboutDefaultClient />;
}
