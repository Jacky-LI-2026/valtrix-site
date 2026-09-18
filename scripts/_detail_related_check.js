/**
 * 产品详情页「相关产品」等价性检查（一次性诊断脚本，不入部署包）
 * =====================================================
 * 断言：详情接口新返回的 `related`（前 3 条）与**旧逻辑从全量产品树推导**的结果
 *   在卡片实际用到的每个字段上**完全一致**。
 *
 * 旧逻辑（改造前，三个详情页组件里都是这个写法）：
 *   1) 在全量树里定位当前型号所属的 category；
 *   2) category.models.filter(id !== 当前型号).slice(0, 3)
 * 新逻辑：detail.related.slice(0, 3)（服务端按站点过滤 + sortOrder 排序，最多 6 条）
 *
 * 用法：node scripts/_detail_related_check.js <products.json> <detail.json> [more-detail.json ...]
 */
const fs = require("fs");

const products = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const detailFiles = process.argv.slice(3);

/** 卡片实际用到的字段（KitzProductCard / UnilokProductCard） */
const CARD_FIELDS = ["id", "model", "name", "nameEn", "nameJa", "nameKo", "nameFr", "nameAr",
  "image", "images", "description", "descriptionEn", "descriptionJa", "descriptionKo", "descriptionFr", "descriptionAr"];

function oldDerive(listTabs, modelId) {
  for (const tab of listTabs) {
    for (const cat of tab.categories) {
      const me = (cat.models || []).find((m) => m.id === modelId);
      if (!me) continue;
      return (cat.models || []).filter((m) => m.id !== me.id).slice(0, 3);
    }
  }
  return null; // 全量树里找不到该型号
}

let failed = 0;
let checked = 0;

for (const file of detailFiles) {
  const detail = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!detail.success) { console.log(`跳过 ${file}（接口未成功）`); continue; }
  const modelId = detail.data.id;
  const oldList = oldDerive(products.data, modelId);
  const newList = (detail.data.related || []).slice(0, 3);

  if (oldList === null) {
    console.log(`跳过 ${modelId}：全量树里没有该型号（可能未发布）`);
    continue;
  }
  checked++;

  const oldIds = oldList.map((m) => m.id);
  const newIds = newList.map((m) => m.id);
  if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
    failed++;
    console.log(`❌ ${modelId} 相关产品 id/顺序不一致`);
    console.log(`   旧: ${oldIds.join(", ")}`);
    console.log(`   新: ${newIds.join(", ")}`);
    continue;
  }

  for (let i = 0; i < oldList.length; i++) {
    for (const k of CARD_FIELDS) {
      const a = JSON.stringify(oldList[i][k] ?? null);
      const b = JSON.stringify(newList[i][k] ?? null);
      if (a !== b) {
        failed++;
        console.log(`❌ ${modelId} → related[${i}].${k} 不一致`);
        console.log(`   旧: ${a.slice(0, 120)}`);
        console.log(`   新: ${b.slice(0, 120)}`);
      }
    }
    // 卡片显示的规格（前 3 条）也要一致
    const sa = JSON.stringify((oldList[i].specs || []).slice(0, 3));
    const sb = JSON.stringify((newList[i].specs || []).slice(0, 3));
    if (sa !== sb) {
      failed++;
      console.log(`❌ ${modelId} → related[${i}].specs(前3条) 不一致`);
      console.log(`   旧: ${sa.slice(0, 160)}`);
      console.log(`   新: ${sb.slice(0, 160)}`);
    }
  }
  console.log(`✅ ${modelId}：相关产品 ${newIds.length} 条，与旧逻辑逐字段一致`);
}

console.log(failed === 0
  ? `\n✅ 全部通过（比对 ${checked} 个型号）`
  : `\n❌ 共 ${failed} 处不一致`);
if (failed) process.exitCode = 1;
