# 全站代码体检报告（2026-09-05）

> 体检范围：app/ components/ lib/ scripts/ 全量 TS/TSX，覆盖多语言数据层、生产噪音、部署安全、工具链。

## 1. 多语言数据层（isEn 残留检查）

| 检查项 | 结果 |
|--------|------|
| `isEn` 声明残留 | 16 处（about/about[section]/careers/industries/news/resources/services/Footer/Industries 等） |
| `isEn ? xEn : x` 数据字段回退模式 | **0 处**（已全部走 `loc.get/getArray/getText`） |
| 结论 | isEn 仅用于布局/徽标/次要视觉逻辑（如英文名副标题 `!isEn && nameEn`），非数据缺口，安全 |

## 2. 生产代码噪音

| 检查项 | 结果 |
|--------|------|
| app/components/lib 中 console.log/warn | 0 处裸 log；console.error 均位于 catch 异常处理（合理保留） |
| scripts/ 中 console.log | 320 处（一次性开发/翻译脚本，非生产代码，正常） |

## 3. 部署安全（.env / 私钥 / 备份泄露风险）

| 检查项 | 结果 |
|--------|------|
| 根目录 .env / .env.local | 存在（正常，本地配置） |
| 增量部署 EXCLUDE_SEGMENTS | 覆盖 node_modules/.next/.git/tmp/_pgsql/logs/backups/_backups/_local_backup/config-keys/**项目备份**/data/license-keys/_old/_archive ✓ |
| 增量部署 EXCLUDE_FILES | 覆盖 .env/.env.local/dev_server.log/_db_backup.sql/license 文档等 ✓ |
| 整包部署 tar excludes | 覆盖 backups/_local_backup/config-keys/**项目备份**/data 等 ✓ |
| 结论 | 私钥/备份/环境变量均不会进入部署包，安全 |

## 4. 工具链与已知待办

| 检查项 | 结果 |
|--------|------|
| PostgreSQL 工具定位 | `lib/pg-tools.ts` 已跨平台（Windows 嵌入版→where；Linux which→常见路径），backup/restore API 已引用 `pgTool()` ✓（历史软链方案已可废弃） |
| tsc --noEmit | 0 |
| pnpm build | 0 |
| 服务器备份恢复 | 服务器 PG14 备份/恢复走 pg-tools 自动定位，无需再手动软链 |

## 5. 结论与遗留建议

- 代码健康度良好：无数据层多语言缺口、无生产噪音、无部署泄露风险、工具链跨平台。
- 遗留建议（非阻塞）：
  1. 服务器可删除 `/var/www/zuowen/_pgsql/extracted/pgsql/bin/*.exe` 旧软链（代码已自动定位，保留亦无碍）。
  2. `isEn` 布局逻辑可逐步字典化（低优先级，不影响多语言正确性）。
  3. 建议每轮功能迭代后运行本体检（扫描脚本模式见 AGENTS.md 深化二十九）。
