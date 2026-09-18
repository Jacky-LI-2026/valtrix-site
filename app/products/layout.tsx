import { buildListPageMetadata } from "@/lib/seo-metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return buildListPageMetadata({ titleKey: "products", subtitleKey: "productsPageSubtitle" });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
