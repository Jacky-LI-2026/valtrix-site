# 项目文档索引

> 左文科技企业官网 + 后台管理系统（Next.js 14 / React 18 / TS / Prisma + PostgreSQL）
> 本文档聚合所有开发、运维与业务文档入口。

## 项目总览

| 文档 | 说明 |
|------|------|
| [使用说明书](user-guide.md) | **面向客户/运维**的完整使用手册（后台各模块操作、部署、AI 客服、增量更新） |
| [行业网站分析](industry-website-analysis.md) | 通用行业网站功能分析（已完成/未完成/可扩展功能盘点） |
| [待办功能](todo-features.md) | 待完成功能清单（高德地图、询价自动报价等） |

## 后台开发（backend）

| 文档 | 说明 |
|------|------|
| [总体计划](backend/00-overall-plan.md) | 后台功能总体规划 |
| [数据字典](backend/01-data-dictionary.md) | 数据库表/字段定义 |
| [开发规则](backend/02-rules.md) | 代码规范与约定 |
| [进度](backend/03-progress.md) | 功能开发进度 |
| [工作日志](backend/04-work-log.md) | 开发过程日志 |
| [开发记忆库](backend/05-dev-memory.md) | ADR/坑点/关键事实（排查问题优先查阅） |

## 前台开发（frontend）

| 文档 | 说明 |
|------|------|
| [通用功能块规范](frontend/shared-components-guide.md) | 后台多语言表单/翻译/SEO 等统一封装用法 |
| [QA 检查清单](frontend/qa-checklist.md) | 链接/文字/图片/多终端/后台配置回归清单 |
| [多语言体检报告](frontend/multilang-audit-20260831.md) | 前台多语种改造记录 |
| [硬编码审计](frontend/hardcoded-audit.md) | 前台硬编码内容审计与修改记录 |

## 部署与运维

| 文档 | 说明 |
|------|------|
| [阿里云部署](aliyun-deploy.md) | 阿里云服务器部署步骤 |
| [部署指南](deploy-guide.md) | 部署/更新详细指南（**不上传服务器**） |
| [CDN 加速](cdn-acceleration.md) | CDN 配置说明 |
| [性能优化](performance-optimization.md) | 性能优化方案 |
| [Nginx 配置](nginx-zuowen.conf) | Nginx 反代配置样例（**不上传服务器**） |
| [升级包示例](upgrade-manifest-example.json) | 升级包 manifest 示例 |

## 商务与授权

| 文档 | 说明 |
|------|------|
| [商用授权许可协议](license-agreement.md) | 商用授权协议模板（含标准销售流程） |
| [授权说明](license-authorization-guide.md) | 授权码生成/使用说明（**不上传服务器**） |

## 开发经验

| 文档 | 说明 |
|------|------|
| [开发经验总结](development-experience.md) | 开发过程经验沉淀 |

## 备注

- `AGENTS.md` 为 Agent 长期记忆（关键坑点/规则），改动代码前先读。
- `docs/backend/05-dev-memory.md` 集中存放 ADR 与已验证坑点，排查问题优先查阅。
- 部署排除项：`deploy-guide.md`、`license-authorization-guide.md`、`nginx-zuowen.conf`（含敏感信息，不上传服务器）。
