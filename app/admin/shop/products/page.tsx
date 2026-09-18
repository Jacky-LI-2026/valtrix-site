import { redirect } from "next/navigation";

// 兼容别名：商品管理主路由为 /admin/shop，/admin/shop/products 为历史/外部入口兜底
export default function ShopProductsAliasPage() {
  redirect("/admin/shop");
}
