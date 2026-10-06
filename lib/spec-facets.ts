/**
 * 规格「维度」推导（单一真源）
 * ==========================================================================
 * 被两处复用：
 *   · `components/ui/SpecPicker.tsx` —— 单个产品页内的选型器；
 *   · `components/product-selector/ProductSelector.tsx` —— 跨产品的「产品快速选型」插件。
 *
 * 口径（**通用、零硬编码**）：产品规格的一条 = 一个可选变体，`value` 是「键: 值; 键: 值」串。
 *   把键值对拆出来后，取「出现够多（≥5% 且 ≥3 行）＋ 取值个数适中（2~12）」的键作为可筛维度。
 */

export interface LocGetter {
  get(obj: any, key: string): string;
}

export interface SpecRow {
  label: string;
  value: string;
  code: string;
  attrs: [string, string][];
}

export interface Facet {
  key: string;
  values: string[];
}

/** 「按规格项（类型）」这个伪维度 */
export const LABEL_FACET = "__label__";

const SPLIT = /[;；؛]/;

/** 把一条规格解析成 { label, code, attrs } */
export function parseSpecRow(spec: any, loc: LocGetter): SpecRow {
  const label = String(loc.get(spec, "label") || "").trim();
  const value = String(loc.get(spec, "value") || "").trim();
  const attrs: [string, string][] = [];
  for (const seg of value.split(SPLIT)) {
    const s = seg.trim();
    if (!s) continue;
    const i = s.indexOf(":") >= 0 ? s.indexOf(":") : s.indexOf("：");
    if (i <= 0) continue;
    const k = s.slice(0, i).trim();
    const v = s.slice(i + 1).trim();
    if (k && v) attrs.push([k, v]);
  }
  return { label, value, code: String(spec?.groupName || spec?.model || "").trim(), attrs };
}

/** 自然序比较（1/8 < 1/4 < 1/2 < 3/4 < 1） */
export function naturalCompare(a: string, b: string): number {
  const num = (s: string) => {
    const m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return Number(m[1]) / Number(m[2]);
    const n = Number(s.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  };
  const na = num(a);
  const nb = num(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

/** 从行集合推导可筛维度（是否带「规格项」伪维度由 includeLabel 决定） */
export function deriveFacets(rows: SpecRow[], opts: { max?: number; includeLabel?: boolean } = {}): Facet[] {
  const { max = 3, includeLabel = true } = opts;
  if (!rows.length) return [];
  const stat = new Map<string, { count: number; values: Set<string> }>();
  for (const r of rows) {
    for (const [k, v] of r.attrs) {
      if (v.length > 24) continue; // 长尺寸串不适合做下拉/chip
      const s = stat.get(k) || { count: 0, values: new Set<string>() };
      s.count += 1;
      s.values.add(v);
      stat.set(k, s);
    }
  }
  const keyFacets = Array.from(stat.entries())
    .filter(([, s]) => s.values.size >= 2 && s.values.size <= 12 && s.count >= Math.max(3, Math.floor(rows.length * 0.05)))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, max)
    .map(([key, s]) => ({ key, values: Array.from(s.values).sort(naturalCompare) }));
  if (!includeLabel) return keyFacets;
  const labels = Array.from(new Set(rows.map((r) => r.label).filter(Boolean)));
  return labels.length >= 2 ? [{ key: LABEL_FACET, values: labels.sort(naturalCompare) }, ...keyFacets] : keyFacets;
}

/** 该行是否命中「键=值」条件（LABEL_FACET 走 label） */
export function rowMatches(row: SpecRow, key: string, value: string): boolean {
  if (!value) return true;
  if (key === LABEL_FACET) return row.label === value;
  return row.attrs.some(([k, v]) => k === key && v === value);
}
