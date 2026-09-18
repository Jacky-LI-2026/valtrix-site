import { buildListPageMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return buildListPageMetadata({ titleKey: "news", subtitleKey: "newsPageSubtitle" });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
