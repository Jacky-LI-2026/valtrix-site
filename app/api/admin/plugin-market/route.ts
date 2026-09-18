import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchMarketCatalog, getPluginActivated } from "@/lib/plugins/market";
import { getPluginState } from "@/lib/plugins/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/plugin-market
 * 插件市场目录：优先拉取 site_config.plugin_market_url 配置的远程 JSON（内存缓存 5 分钟），
 * 失败/未配置时回退内置目录（registry builtin 插件 + 示例远程条目）。
 * ?refresh=1 忽略缓存强制刷新。
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  const force = req.nextUrl.searchParams.get("refresh") === "1";
  const catalog = await fetchMarketCatalog(force);
  const state = await getPluginState();
  const activated = await getPluginActivated();
  return NextResponse.json({
    plugins: catalog.plugins,
    source: catalog.source,
    cached: catalog.cached,
    // 附加已安装/已开通状态，便于市场视图一次渲染
    installedKeys: Object.keys(state),
    activatedKeys: activated,
  });
}
