import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/api/*"],
    },
    // 站点域名取自部署级环境变量 NEXT_PUBLIC_SITE_URL（双 fork 合并 D1=单码多库，不得硬编码域名）
    sitemap: [siteUrl("/sitemap.xml"), siteUrl("/sitemap-images.xml")],
  };
}
