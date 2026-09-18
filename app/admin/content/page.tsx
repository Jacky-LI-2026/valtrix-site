import { redirect } from "next/navigation";
// 内容模型根路径 → 内容类型管理
export default function ContentRootPage() { redirect("/admin/content-types"); }
