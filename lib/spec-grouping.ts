/**
 * 产品规格表分组工具
 *
 * product_specs 表中接头类产品存在同 label 不同 value 的合法尺寸变体
 * （如 label=「长对焊接管」有 17 种尺寸值）。本工具将同产品内相同 label 的
 * 行按首次出现顺序分组，渲染层用 rowSpan 合并 label 单元格，value 逐行展示。
 *
 * 纯渲染层分组，不改数据。分组键用中文基础字段 label（canonical 标识），
 * labelEn/Ja/Ko/Fr/Ar 是其译文，同一 label 的多语种行必然同组。
 *
 * 来源：自阀门站（VALTRIX）回流至通用基地（2026-09-12，双 fork 合并 D2）。
 * 兼容性说明：当某产品内 label 互不重复时（如 MPCVD 设备规格），
 * 每组恰好 1 个 value，渲染结果与「逐行渲染」完全一致，无版式差异。
 */

export interface SpecGroup {
  /** 分组键（中文基础 label，空则回退 labelEn） */
  key: string;
  /** 当前语种的 label 显示文本（经 loc.get 取当前语种，自动回退） */
  label: string;
  /** 当前语种的 value 列表（逐行展示） */
  values: string[];
}

/**
 * 将 specs 按 label 分组，保持原始顺序（首次出现的 label 顺序），不排序。
 * @param specs 规格行数组（每行含 label / labelEn / ... / value / valueEn / ...）
 * @param loc 本地化取值器（createLocalizedGetter 的返回值），需提供 get(obj, field)
 */
export function groupSpecs(
  specs: any[],
  loc: { get: (obj: any, field: string) => string }
): SpecGroup[] {
  if (!Array.isArray(specs) || specs.length === 0) return [];

  const groups: SpecGroup[] = [];
  // 用 Map 记录 key -> 在 groups 中的索引，保持首次出现顺序
  const indexMap = new Map<string, number>();

  for (const spec of specs) {
    if (!spec) continue;
    // 分组键用中文基础字段 label，为空回退 labelEn
    const key =
      (typeof spec.label === "string" && spec.label) ||
      spec.labelEn ||
      "";
    const labelText = loc.get(spec, "label");
    const valueText = loc.get(spec, "value");

    const existingIndex = indexMap.get(key);
    if (existingIndex !== undefined) {
      groups[existingIndex].values.push(valueText);
    } else {
      indexMap.set(key, groups.length);
      groups.push({ key, label: labelText, values: [valueText] });
    }
  }

  return groups;
}
