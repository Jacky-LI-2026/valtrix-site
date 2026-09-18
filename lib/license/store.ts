/**
 * 商用授权 - 本地授权记录存取（data/license.json）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { LicenseRecord } from "./types";

function getLicensePath(): string {
  return join(process.cwd(), "data", "license.json");
}

export function readLicense(): LicenseRecord | null {
  try {
    const p = getLicensePath();
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")) as LicenseRecord;
  } catch {
    return null;
  }
}

export function writeLicense(record: LicenseRecord): void {
  const p = getLicensePath();
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(p, JSON.stringify(record, null, 2), "utf8");
}

export function clearLicense(): void {
  const p = getLicensePath();
  if (existsSync(p)) {
    try {
      writeFileSync(p, "", "utf8");
    } catch {}
  }
}
