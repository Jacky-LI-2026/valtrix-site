import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeBigInt } from "@/lib/serialize";
import { getAllContentTypes } from "@/lib/content-types/registry";
import { listDynamicTypes } from "@/lib/content-types/dynamic";

// GET：全部内容类型（静态注册 + 动态定义）
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const staticTypes = getAllContentTypes().map((c) => ({
      id: null,
      name: c.name,
      label: c.label,
      model: c.model,
      fields: c.fields,
      listColumns: c.listColumns,
      titleField: c.titleField,
      slugField: c.slugField || null,
      enableSeo: !!c.enableSeo,
      enableStatus: !!c.enableStatus,
      dynamic: false,
      sortOrder: 0,
      active: true,
    }));
    const dyn = await listDynamicTypes();
    // 用 DB defs 原始记录补充（含 id）
    const dynDefs = await prisma.contentTypeDef.findMany({ orderBy: { sortOrder: "asc" } });
    const dynMap = new Map(dynDefs.map((d) => [d.name, d]));
    const dynamicTypes = dyn.map((c) => {
      const def = dynMap.get(c.name);
      return {
        id: def ? String(def.id) : null,
        name: c.name,
        label: c.label,
        model: "DynamicContent",
        fields: c.fields,
        listColumns: c.listColumns,
        titleField: c.titleField,
        slugField: c.slugField || null,
        enableSeo: !!c.enableSeo,
        enableStatus: !!c.enableStatus,
        dynamic: true,
        sortOrder: def ? Number(def.sortOrder) : 0,
        active: def ? !!def.active : true,
      };
    });
    return NextResponse.json([...staticTypes, ...dynamicTypes]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST：创建动态内容类型
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const name = String(body.name || "").trim().toLowerCase().replace(/[^\w-]/g, "-");
    if (!name || !body.label) return NextResponse.json({ error: "类型标识与名称不能为空" }, { status: 400 });
    if (getAllContentTypes().some((c) => c.name === name)) {
      return NextResponse.json({ error: `类型标识 ${name} 已存在（静态注册）` }, { status: 400 });
    }
    const exists = await prisma.contentTypeDef.findFirst({ where: { name } });
    if (exists) return NextResponse.json({ error: `类型标识 ${name} 已存在` }, { status: 400 });
    const fields = Array.isArray(body.fields) ? body.fields : [];
    if (fields.length === 0) return NextResponse.json({ error: "至少定义一个字段" }, { status: 400 });
    const titleField = String(body.titleField || fields[0].name);
    const listColumns = Array.isArray(body.listColumns) && body.listColumns.length
      ? body.listColumns
      : fields.map((f: any) => ({ key: f.name, label: f.label }));
    const def = await prisma.contentTypeDef.create({
      data: {
        name,
        label: String(body.label),
        labelEn: body.labelEn || "",
        description: body.description || "",
        fields,
        listColumns,
        titleField,
        slugField: body.slugField || null,
        enableSeo: !!body.enableSeo,
        enableStatus: body.enableStatus !== false,
        sortOrder: Number(body.sortOrder) || 0,
        active: body.active !== false,
      },
    });
    return NextResponse.json(serializeBigInt(def));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
