/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 预存 exhaustive-deps / no-img-element 等 warning 较多，
    // 构建期跳过 ESLint 避免阻塞部署；dev 服务器仍实时提示。
    ignoreDuringBuilds: true,
  },
  // ⚠️ 2026-09-15 防事故开关：允许用环境变量把构建输出改到**临时目录**。
  //
  //   为什么必须加（真实事故，不是假想）：`next build` 默认**原地重写 `.next`**，
  //   构建期间正在被 `node server.js` 服务的 `.next` 会被逐步覆盖。当天有人在构建
  //   进行中执行 `pkill -9 -f 'pnpm build'`，构建在 `✓ Compiled successfully` **之后**、
  //   生成 manifest 阶段被杀死，`.next` 留下「有 BUILD_ID 但缺 prerender-manifest.json」
  //   的**半成品** → `node server.js` 启动即 `ENOENT: .next/prerender-manifest.json` 崩溃
  //   → pm2 崩溃重启循环 314 次 → 站点不可用。
  //
  //   ⇒ 正确做法：构建写进 `.next.tmp.<时间戳>`，构建**完整成功后**再用同文件系统的
  //     `mv`（rename）一次性换上去 —— 正在服务的 `.next` 全程不可触碰。
  //     执行者是 `scripts/_safe_build_deploy.js`（构建→切换→重启→验证→失败回滚）。
  //
  //   ⛔ 只有显式设置 `NEXT_DIST_DIR` 时才生效；**日常 `pnpm build` 行为完全不变**（仍输出 `.next`）。
  //
  //   🔴🔴🔴 2026-09-14 实测更正（**改这一行前必须读完**）🔴🔴🔴
  //   ⛔ **绝不能用 `NEXT_PHASE` 做门闩**。我一开始写成
  //        process.env.NEXT_PHASE === "phase-production-build" && process.env.NEXT_DIST_DIR ? ... : ".next"
  //      结果在真机上**每次构建都静默回退成原地构建**（`.next.tmp.*` 从未被创建）。
  //   根因（已读 Next 14.2.5 源码确认）：
  //        `node_modules/next/dist/build/index.js:1051` 才执行
  //        `process.env.NEXT_PHASE = PHASE_PRODUCTION_BUILD`
  //      —— 它位于构建函数**深处**（其上第 1045 行已在用已解析好的 `distDir`）。
  //      也就是说 **`next build` 是在求值完 `next.config.js` 之后才设这个变量的**，
  //      门闩在求值瞬间**永远为假**。配套哨兵之所以"通过"，是因为它用 `node -e` **手动**注入
  //      该变量 —— 验证的是一个**在真实构建中不成立的前提**，属于自证式假阳性。
  //   ⇒ 结论：`NEXT_DIST_DIR` 只能裸读（下面这样），真正的防线是
  //      ① 脚本的**熔断**（轮询时现网 `.next/BUILD_ID` 一变就中止，2026-09-14 实战救场成功）
  //      ② 脚本的**哨兵**（裸读口径：不设 NEXT_PHASE 时 `NEXT_DIST_DIR=x` 必须解析成 `x`；
  //         不设 `NEXT_DIST_DIR` 时必须解析成 `.next`）
  //      ③ 脚本的**`.env` 哨兵**（服务器 `.env` 里出现 `NEXT_DIST_DIR` 就拒绝构建）
  //      ④ 启动构建后校验 `.next.tmp.<ts>` **确实被创建**
  //
  //   🔴 仍然成立的地雷：`NEXT_DIST_DIR` 若进入服务器 `.env` 会打死现网站点
  //      —— Next 的 `loadEnvConfig` 在所有 phase 都加载 `.env`，运行中的 `node server.js`
  //      会去找那个不存在的目录 → `ENOENT` → pm2 崩溃重启循环（与事故同型）。
  //   ⇒ **`NEXT_DIST_DIR` 永远不要出现在服务器 `.env` / pm2 env 里**，只能由构建命令临时注入。
  //      这条现在靠脚本的 `.env` 哨兵（③）来强制，而不是靠门闩。
  // 🔵 2026-09-16 运行期安全阀（用户裁定，与部署脚本探针 A 配套）：
  //   只有在**构建命令显式同时注入 `NEXT_BUILD_TEMP=1`** 时才认 `NEXT_DIST_DIR`；否则一律 `.next`。
  //   为什么必须加：Next 的 `loadEnvConfig` 在**所有 phase** 都加载 `.env` —— 只要服务器 `.env`
  //   里混进一行 `NEXT_DIST_DIR=.next.tmp.xxx`，正在运行的 `node server.js` 就会去找那个不存在的
  //   目录 → ENOENT → pm2 崩溃重启循环。过去只靠部署脚本的「哨兵 C」在**部署时**拦，
  //   对「事后有人手改 `.env` 再 restart」没有任何保护。加了这道阀后**运行期永远解析成 `.next`**，
  //   地雷从根上拆掉；哨兵 C 保留为纵深防御。
  //   ⚠️ 配套（缺一不可）：构建命令必须写成 `NEXT_DIST_DIR=<tmp> NEXT_BUILD_TEMP=1 pnpm build`；
  //      哨兵 A 也必须同时摆这两个变量，否则会误判成「接线缺失」而拒绝部署。
  distDir: process.env.NEXT_BUILD_TEMP === "1" && process.env.NEXT_DIST_DIR
    ? process.env.NEXT_DIST_DIR
    : ".next",
  images: {
    // ⚠️ 2026-09-14：曾尝试 `images.loader:'custom'` + loaderFile 让 /uploads/** 绕开优化器，
    //    **本地实测该方案会把内置 `/_next/image` 端点整个停用**（返回 404 页面），
    //    导致所有非上传图一起坏掉 ⇒ 已回退。
    //
    // 现采用的方案：在 `server.js` 里一并接管 `/_next/image?url=/uploads/**`，
    //    命中即直供原图（绕过优化器）；其余图片仍走内置优化器，行为零变化。
    //    见 server.js 的 serveUpload() 注释。
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  // ⚠️ 2026-09-12 实测记录：曾试开 experimental.instrumentationHook=true 以启用根目录
  // instrumentation.ts（启动时注册插件能力）。**该 hook 确实会执行**，但会使 Next 把
  // instrumentation 同时编译出 edge 版本，而 ensurePlugins() 链路会拉入
  // lib/atoms/ai.ts（函数体内 `require("fs")`）→ 报
  //   Module not found: Can't resolve 'fs'
  // （import trace: lib/atoms/ai.ts → lib/atoms/index.ts → lib/plugins/ensure.ts → instrumentation.ts）
  // 在本机无法跑通 `pnpm build` 的情况下不能确认它不会导致构建失败，故**暂不开启**，
  // 根目录 instrumentation.ts 目前不生效（Next 14 需要该开关）。待做的正确修法：
  // 给 edge 编译加 resolve.fallback（fs/path=false）或改造 lib/atoms/ai.ts 的 fs 引入方式。
  webpack: (config, { isServer }) => {
    // ssh2 及其可选原生加速模块 cpu-features 在构建环境无编译产物，
    // 将其作为 Node 端外部模块，避免 webpack 尝试打包 .node 二进制导致构建失败。
    // 运行时 ssh2 对 cpu-features 采用可选加载，缺失时自动回退，不影响部署功能。
    if (isServer) {
      config.externals.push(
        { 'ssh2': 'commonjs ssh2' },
        { 'cpu-features': 'commonjs cpu-features' }
      );
    }
    return config;
  },
};

module.exports = nextConfig;
