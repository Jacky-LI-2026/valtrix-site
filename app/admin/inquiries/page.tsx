import { redirect } from "next/navigation";
// 兼容别名：询盘线索主路由为 /admin/leads
export default function InquiriesAliasPage() { redirect("/admin/leads"); }
