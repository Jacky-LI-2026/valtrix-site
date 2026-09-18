import { NextRequest, NextResponse } from "next/server";
import { verifyLicenseCode, isDomainAllowed, isExpired } from "@/lib/license/verify";
import { readLicense, writeLicense, clearLicense } from "@/lib/license/store";
import type { LicenseRecord } from "@/lib/license/types";
import { prisma } from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";
import { auth } from "@/auth";

function getCurrentDomain(req: NextRequest): string {
  return req.headers.get("host") || "localhost";
}

/** 读取站点配置中登记的域名集合（站点设置→域名信息），供授权校验关联 */
async function getSiteDomains(): Promise<string[]> {
  try {
    const sc = await prisma.siteConfig.findUnique({ where: { configKey: 'contact_info' } });
    const ci = sc?.configValue;
    let raw = "";
    if (ci && typeof ci === "object" && !Array.isArray(ci)) raw = String((ci as any).siteDomain || "");
    if (!raw) {
      const sd = await prisma.siteConfig.findUnique({ where: { configKey: 'siteDomain' } });
      raw = sd?.configValue ? String(sd.configValue) : "";
    }
    return raw.split(/[\n,，;；]/).map((d) => d.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** 当前站点是否在授权域名内：优先按站点配置域名集合比对，未配置时回退请求 Host */
async function domainAllowed(payload: any, req: NextRequest): Promise<boolean> {
  const configured = await getSiteDomains();
  const candidates = configured.length > 0 ? configured : [getCurrentDomain(req)];
  return candidates.some((d) => isDomainAllowed(payload, d));
}

/** 获取授权状态 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const currentDomain = getCurrentDomain(req);
    const record = readLicense();

    if (!record) {
      const configuredDomains = await getSiteDomains();
      return NextResponse.json({
        activated: false,
        status: "none",
        currentDomain,
        configuredDomains,
        record: null,
      });
    }

    // 重新验签，防止 license.json 被手工篡改
    const v = verifyLicenseCode(record.code);
    if (!v.ok || !v.payload) {
      return NextResponse.json({
        activated: false,
        status: "invalid",
        currentDomain,
        record: null,
        error: v.error,
      });
    }

    const expired = isExpired(v.payload);
    const configuredDomains = await getSiteDomains();
    const domainOk = await domainAllowed(v.payload, req);
    let status: string;
    if (expired) status = "expired";
    else if (!domainOk) status = "domain-mismatch";
    else status = "valid";

    return NextResponse.json({
      activated: true,
      status,
      currentDomain,
      configuredDomains,
      record,
      expired,
      domainAllowed: domainOk,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "获取授权状态失败" }, { status: 500 });
  }
}

/** 激活授权 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim();
    if (!code) {
      return NextResponse.json({ error: "请输入授权码" }, { status: 400 });
    }

    const v = verifyLicenseCode(code);
    if (!v.ok || !v.payload) {
      return NextResponse.json({ error: v.error || "授权码无效" }, { status: 400 });
    }

    if (isExpired(v.payload)) {
      return NextResponse.json({ error: "授权码已过期，请联系授权方续期" }, { status: 400 });
    }

    const currentDomain = getCurrentDomain(req);
    const configuredDomains = await getSiteDomains();
    const domainOk = await domainAllowed(v.payload, req);
    if (!domainOk) {
      return NextResponse.json(
        {
          error: `授权域名不匹配：本授权绑定 ${v.payload.domains.join(", ")}，当前站点配置域名 ${configuredDomains.length ? configuredDomains.join(", ") : currentDomain}。如需更改请联系授权方重新签发。`,
        },
        { status: 400 }
      );
    }

    const record: LicenseRecord = {
      cid: v.payload.cid,
      domains: v.payload.domains,
      edition: v.payload.edition,
      exp: v.payload.exp,
      issued: v.payload.issued,
      seats: v.payload.seats,
      activatedAt: new Date().toISOString(),
      code,
    };
    writeLicense(record);
await recordOperation({ module: "license", action: "activate", target: v.payload.cid });

    return NextResponse.json({
      success: true,
      message: `授权激活成功：${v.payload.cid}（${v.payload.edition}）`,
      record,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "激活失败" }, { status: 500 });
  }
}

/** 解除授权 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    clearLicense();
    await recordOperation({ module: "license", action: "deactivate", target: "license" });
await recordOperation({ module: "license", action: "deactivate", target: "license" });
  return NextResponse.json({ success: true, message: "已解除授权" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "解除授权失败" }, { status: 500 });
  }
}
