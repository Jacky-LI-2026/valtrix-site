#!/usr/bin/env node
/**
 * 生成「红色网络地球」站点图标
 * ==========================================================================
 * 背景：原 `app/icon.png` 实际是 **1542×498 的横版 LOGO 字标**，
 *   被浏览器当作 favicon 塞进方形槽位 → 严重压扁。
 *   本脚本改为输出**方形**的「红色网络地球」：
 *     红色实心圆盘（地球） + 低透明度白色经纬线（地球质感） + 高对比白色节点/连线（网络）
 *
 * 对 16×16 的可读性做了取舍：经纬线压到 45% 透明度且变细，网络元素加粗 —
 *   小尺寸下「红盘 + 白色三角网络」仍然清晰，经纬线只作为纹理。
 *
 * 输出（Next.js App Router 约定，自动生成 <link> 标签）：
 *   app/icon.png        256×256   主图标
 *   app/apple-icon.png  180×180   iOS 主屏图标（不透明，加白色圆角底）
 *   app/favicon.ico     16/32/48  经典 /favicon.ico（浏览器默认请求路径）
 *   public/favicon.png  192×192   与 icon.png 同源，供显式引用
 *
 * 用法：node scripts/_make_favicon.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(
  (() => {
    const i = process.argv.indexOf("--repo");
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : path.join(__dirname, "..");
  })()
);
/**
 * 品牌主色。双 fork 合并后两站共用代码，但**图标是品牌资产**、各站应不同，
 * 因此本脚本支持 `--color` 生成对站版本（例如阀门站用其自己的主色）。
 * 默认取 tailwind.config.ts 的 primary 默认值。
 */
const colorArg = (() => {
  const i = process.argv.indexOf("--color");
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : "#CC0000";
})();
const RED = colorArg;

/**
 * 图标几何（viewBox 0 0 64 64）
 * 设计取舍（**16px 优先**，第一版太挤已返工）：
 *   - 红盘 r=30 必须是画面主体；白色覆盖率要压到 ~8%，否则小尺寸只剩一团白
 *   - 经纬线只作为「地球」纹理：透明度 0.30、细线，且 **全部留在盘内**
 *     （第一版用了 rx=30/ry=30 的椭圆，正好压在盘缘上 → 实测 520 个白像素溢出）
 *   - 网络用「三节点三角 + 圆点」：形状干净、无中心节点，红盘不被糊死
 */
const svg = (bg = "none") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  ${bg === "none" ? "" : `<rect width="64" height="64" fill="${bg}"/>`}
  <!-- 地球本体 -->
  <circle cx="32" cy="32" r="30" fill="${RED}"/>
  <!-- 地球经纬线（纹理，低透明度，全部在盘内） -->
  <g fill="none" stroke="#FFFFFF" stroke-opacity="0.30" stroke-width="1.6">
    <ellipse cx="32" cy="32" rx="27" ry="10.5"/>
    <ellipse cx="32" cy="32" rx="10.5" ry="27"/>
  </g>
  <!-- 网络：三节点三角（质心 ≈(32.3,31.7)，与盘心对齐；第一版整体偏上 3 个单位） -->
  <path d="M19 25 L44 23 L34 47 Z" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#FFFFFF">
    <circle cx="19" cy="25" r="3.7"/>
    <circle cx="44" cy="23" r="3.7"/>
    <circle cx="34" cy="47" r="3.7"/>
  </g>
</svg>`;

/** 生成最小合法 ICO（内嵌 PNG，Vista+ 与所有现代浏览器均支持） */
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];
  for (const { size, buf } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width（0 表示 256）
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += buf.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.buf)]);
}

(async () => {
  const src = Buffer.from(svg());
  const out = [];

  const render = (size, bg) =>
    sharp(Buffer.from(svg(bg)))
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();

  // 1. app/icon.png — 主图标（透明背景，方形）
  const icon = await render(256);
  fs.writeFileSync(path.join(ROOT, "app", "icon.png"), icon);
  out.push(["app/icon.png", 256, icon.length]);

  // 2. app/apple-icon.png — iOS 主屏（不透明白底，避免系统自作主张加黑底）
  const apple = await sharp(Buffer.from(svg("#FFFFFF")))
    .resize(180, 180, { fit: "contain", background: "#FFFFFF" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(ROOT, "app", "apple-icon.png"), apple);
  out.push(["app/apple-icon.png", 180, apple.length]);

  // 3. app/favicon.ico — 16/32/48 三尺寸
  const icoSizes = [16, 32, 48];
  const pngs = [];
  for (const s of icoSizes) pngs.push({ size: s, buf: await render(s) });
  const ico = buildIco(pngs);
  fs.writeFileSync(path.join(ROOT, "app", "favicon.ico"), ico);
  out.push(["app/favicon.ico", icoSizes.join("/"), ico.length]);

  // 4. public/favicon.png — 与主图标同源
  const pub = await render(192);
  fs.writeFileSync(path.join(ROOT, "public", "favicon.png"), pub);
  out.push(["public/favicon.png", 192, pub.length]);

  // 顺手保留一份 SVG 源文件，便于后续微调（不参与构建）
  fs.writeFileSync(path.join(ROOT, "public", "favicon.svg"), svg(), "utf8");
  out.push(["public/favicon.svg", "vector", fs.statSync(path.join(ROOT, "public", "favicon.svg")).size]);

  console.log("已生成「红色网络地球」图标：\n");
  for (const [f, size, bytes] of out) {
    console.log(`  ${f.padEnd(24)} ${String(size).padEnd(10)} ${(bytes / 1024).toFixed(1)} KB`);
  }
  console.log(`\n品牌红：${RED}`);
  // 单独导出一张预览大图，便于用 vision 复核
  const preview = await render(512);
  fs.writeFileSync(path.join(ROOT, "_favicon_preview.png"), preview);
  console.log(`预览图：_favicon_preview.png（512×512，复核后可删）`);
})().catch((e) => {
  console.error("生成失败：", e);
  process.exit(1);
});
