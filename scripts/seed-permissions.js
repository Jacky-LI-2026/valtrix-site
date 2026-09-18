/**
 * 补齐权限码 + admin/editor 角色默认权限（本地与服务器均可执行）
 *
 * 🔒 2026-09-16 起：权限清单的**单一真源** = `prisma/permission-catalog.json`（77 条 + editor 27 条）。
 *    此前本脚本与 `prisma/seed.ts` **各维护一份且严重不一致**（41/27 vs 23/11）；
 *    更严重的是：`middleware.ts` 引用的 `edm:view` / `visit-booking:view` **两边都没有**
 *    ⇒ 全新环境会出现「侧边栏入口对所有人（含 admin）静默消失」（幽灵码事故形态）。
 *    ⛔ **禁止再在本文件里写权限清单**，只改 catalog。
 *
 * ⚠️ 同批修正：此前用 `require('@prisma/client')`，**在本机解析失败**
 *    （`Cannot find module '.prisma/client/default'`，本项目 client 生成在 `lib/generated/prisma`）
 *    ⇒ 脚本此前根本跑不起来，而它正是"把权限码下发到某环境"的唯一手段。
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch (e) { /* 服务器可能用环境变量注入 */ }

const { PrismaClient } = require(path.join(ROOT, 'lib', 'generated', 'prisma'));
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, 'prisma', 'permission-catalog.json'), 'utf8'));
const p = new PrismaClient();

(async () => {
  // 1) 补齐缺失的权限码
  const created = [];
  for (const perm of CATALOG.permissions) {
    const ex = await p.permission.findUnique({ where: { code: perm.code } });
    if (!ex) {
      await p.permission.create({ data: perm });
      created.push(perm.code);
    }
  }
  console.log('新增权限:', created.length, created.join(', ') || '(无新增，均已存在)');

  const adminRole = await p.role.findUnique({ where: { name: 'admin' } });
  const editorRole = await p.role.findUnique({ where: { name: 'editor' } });

  // 2) admin = 全部权限
  if (adminRole) {
    const all = await p.permission.findMany();
    for (const perm of all) {
      const ex = await p.rolePermission.findUnique({ where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } } });
      if (!ex) await p.rolePermission.create({ data: { roleId: adminRole.id, permissionId: perm.id } });
    }
    console.log('admin 权限已全量:', all.length);
  }

  // 3) editor = catalog.editorCodes（内容维护口径）
  if (editorRole) {
    const perms = await p.permission.findMany({ where: { code: { in: CATALOG.editorCodes } } });
    for (const perm of perms) {
      const ex = await p.rolePermission.findUnique({ where: { roleId_permissionId: { roleId: editorRole.id, permissionId: perm.id } } });
      if (!ex) await p.rolePermission.create({ data: { roleId: editorRole.id, permissionId: perm.id } });
    }
    console.log('editor 权限:', perms.length);
  }

  await p.$disconnect();
  console.log('完成');
})().catch((e) => { console.error(e.message); process.exit(1); });
