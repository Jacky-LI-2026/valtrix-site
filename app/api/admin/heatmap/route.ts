/**
 * 访客热力图 · 后台聚合 API
 * GET /api/admin/heatmap?path=/products → 点击矩阵 + 滚动深度分布
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const GRID = 20; // 20x20 网格
const FILE = path.join(process.cwd(), "data", "heatmap.jsonl");

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const p = req.nextUrl.searchParams.get("path") || "/";

  const lines: string[] = [];
  try {
    if (fs.existsSync(FILE)) lines.push(...fs.readFileSync(FILE, "utf8").split("\n").filter(Boolean));
  } catch { /* ignore */ }

  // 可用路径列表
  const paths = new Map<string, number>();
  const matrix = new Map<string, number>(); // "gx,gy" -> count
  const depthBins = new Array(10).fill(0);
  let total = 0;

  for (const line of lines) {
    let e: any;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.path !== p) continue;
    total++;
    paths.set(p, (paths.get(p) || 0) + 1);
    if (e.x >= 0 && e.y >= 0) {
      const gx = Math.min(GRID - 1, Math.floor(e.x / (1000 / GRID)));
      const gy = Math.min(GRID - 1, Math.floor(e.y / (1000 / GRID)));
      const k = `${gx},${gy}`;
      matrix.set(k, (matrix.get(k) || 0) + 1);
    }
    if (e.depth >= 0) {
      depthBins[Math.min(9, Math.floor(e.depth / 10))]++;
    }
  }

  // 所有路径（供选择器）
  const allPaths = new Map<string, number>();
  for (const line of lines) {
    let e: any;
    try { e = JSON.parse(line); } catch { continue; }
    const k = e.path || "/";
    allPaths.set(k, (allPaths.get(k) || 0) + 1);
  }

  const grid: number[][] = Array.from({ length: GRID }, () => new Array(GRID).fill(0));
  Array.from(matrix.entries()).forEach(([k, v]) => {
    const [gx, gy] = k.split(",").map(Number);
    grid[gy][gx] = v;
  });

  return NextResponse.json({
    path: p,
    total,
    grid,
    gridSize: GRID,
    depthBins,
    maxDepth: Math.max(1, ...depthBins),
    maxCell: Math.max(1, ...Array.from(matrix.values())),
    paths: Array.from(allPaths.entries()).sort((a, b) => b[1] - a[1]).slice(0, 30),
  });
}
