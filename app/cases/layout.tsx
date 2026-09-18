import { buildListPageMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return buildListPageMetadata({ titleKey: "casesPageTitle", subtitleKey: "casesPageSubtitle" });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
