#!/usr/bin/env node
/**
 * 从 `lib/templates/presets.ts` 里**机械抽取**某条预设为主题切换用的 JSON。
 *
 *   npx tsx scripts/_gen_preset_json.js kitz-clean [outfile]
 *
 * 为什么要有这个脚本：远端切模板时需要预设的 theme 值，但 `presets.ts` 是 TS，
 * 远端直接 require 不了。**手工往脚本里抄一份颜色 = 引入转录风险**，
 * 所以这里从唯一真源（presets.ts）抽取，远端脚本只消费产物。
 */
"use strict";

const fs = require("fs");
const path = require("path");

async function main() {
  const slug = (process.argv[2] || "").trim();
  if (!slug) {
    console.error("用法：npx tsx scripts/_gen_preset_json.js <slug> [outfile]");
    process.exit(1);
  }
  const out =
    process.argv[3] || path.join(__dirname, `_preset_${slug.replace(/[^\w-]/g, "_")}.json`);

  const mod = require("../lib/templates/presets");
  const preset = (mod.TEMPLATE_PRESETS || []).find((t) => t.slug === slug);
  if (!preset) {
    console.error(`未找到预设 slug=${slug}；可用：` + (mod.TEMPLATE_PRESETS || []).map((t) => t.slug).join(", "));
    process.exit(1);
  }

  const payload = {
    _source: "lib/templates/presets.ts",
    _generatedAt: new Date().toISOString(),
    // 去掉下划线前缀后的键**逐字等价于 TemplatePreset**（远端写 templates.config 时要用它）
    slug: preset.slug,
    name: preset.name,
    nameEn: preset.nameEn,
    category: preset.category,
    description: preset.description,
    descriptionEn: preset.descriptionEn,
    theme: preset.theme,
    style: preset.style,
    industries: preset.industries,
    sections: preset.sections,
  };

  fs.writeFileSync(out, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log("已写出：" + out);
  console.log("  slug     = " + preset.slug);
  console.log("  name     = " + preset.name + " / " + preset.nameEn);
  console.log("  primary  = " + preset.theme.primary + "  accent = " + preset.theme.accent);
  console.log("  dark     = " + preset.theme.dark + "  darkLight = " + preset.theme.darkLight);
}

main().catch((e) => {
  console.error("失败：" + (e && e.message ? e.message : e));
  process.exit(1);
});
