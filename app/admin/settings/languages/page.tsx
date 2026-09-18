import { redirect } from "next/navigation";
// 兼容别名：语种管理主路由为 /admin/languages
export default function SettingsLanguagesAliasPage() { redirect("/admin/languages"); }
