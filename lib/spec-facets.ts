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

import { extractPorts, portTypeOf, portLabel, isBodyDimension } from "./conn-spec";

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

/**
 * 「端口 N」维度前缀（owner 2026-10-07：「端口尺寸应该最少有两个端口，最多 4-5 个端口」）。
 * 键形如 `__port1` / `__port2`…；端口型式与尺寸的判定在 `lib/conn-spec.ts`（唯一真源）。
 */
export const PORT_FACET_PREFIX = "__port";

/** `__port3` → 3（不是端口维度则返回 0） */
export function portFacetIndex(key: string): number {
  if (!key.startsWith(PORT_FACET_PREFIX)) return 0;
  const n = Number(key.slice(PORT_FACET_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

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

/**
 * 从行集合推导可筛维度（是否带「规格项」伪维度由 includeLabel 决定）。
 * `excludePorts`：端口类键（MR / 管外径 / NPT…）**不在**这里出维度 ——
 *   它们由 `derivePortFacets()` 按「端口 1…N」组织（否则同一概念会被拆成多个下拉）；
 *   同时**本体外形尺寸类键**（`C 尺寸` / `壁厚` / `L size` …）也一并排除 ——
 *   它们是尺寸明细，不是选型维度（owner 2026-10-07 把端口单列后，这类键会浮到前 3 个里）。
 */
export function deriveFacets(
  rows: SpecRow[],
  opts: { max?: number; includeLabel?: boolean; excludePorts?: boolean } = {}
): Facet[] {
  const { max = 3, includeLabel = true, excludePorts = false } = opts;
  if (!rows.length) return [];
  const stat = new Map<string, { count: number; values: Set<string> }>();
  for (const r of rows) {
    for (const [k, v] of r.attrs) {
      if (v.length > 24) continue; // 长尺寸串不适合做下拉/chip
      if (excludePorts && (portTypeOf(k) || isBodyDimension(k))) continue; // 端口 → 「端口 N」；外形尺寸 → 不出维度
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

/**
 * 「端口 1…N」维度。
 * 一个接头的端口数由**本体型式**决定（三通 3、四通 4、其余至少 2，最多 5），
 * 同径本体只记一个尺寸时其余端口沿用该尺寸 —— 见 `lib/conn-spec.ts` 的 `extractPorts()`。
 * 与其它维度同一套门槛：某一列至少 3 行且覆盖 ≥5% 才出下拉（避免"170 行里只有 2 行有第 5 口"这种噪音列）。
 */
export function derivePortFacets(rows: SpecRow[], opts: { maxPorts?: number } = {}): Facet[] {
  const { maxPorts = 5 } = opts;
  if (!rows.length) return [];
  const cols: string[][] = [];
  let withPorts = 0;
  for (const r of rows) {
    const ports = extractPorts(r.attrs, r.label);
    if (!ports.length) continue;
    withPorts += 1;
    ports.forEach((p, i) => {
      if (i >= maxPorts) return;
      (cols[i] = cols[i] || []).push(portLabel(p));
    });
  }
  if (withPorts < 2) return [];
  const floor = Math.max(3, Math.floor(rows.length * 0.05));
  return cols
    .map((vals, i) => ({ key: `${PORT_FACET_PREFIX}${i + 1}`, vals, i }))
    .filter((c) => c.vals.length >= floor)
    .map((c) => ({ key: c.key, values: Array.from(new Set(c.vals)).sort(naturalCompare) }));
}

/** 该行是否命中「键=值」条件（LABEL_FACET 走 label；`__portN` 走第 N 个端口） */
export function rowMatches(row: SpecRow, key: string, value: string): boolean {
  if (!value) return true;
  if (key === LABEL_FACET) return row.label === value;
  const portIdx = portFacetIndex(key);
  if (portIdx) {
    const p = extractPorts(row.attrs, row.label)[portIdx - 1];
    return !!p && portLabel(p) === value;
  }
  return row.attrs.some(([k, v]) => k === key && v === value);
}
