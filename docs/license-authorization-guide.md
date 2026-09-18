# 授权签发与授权管理指南（内部·仅供应商）

> 本文档为**供应商内部资料**，仅保存在本地开发环境，**严禁**随部署包、增量更新包上传到客户服务器。
> 客户使用的《使用说明书》（docs/user-guide.md）只包含激活/状态/解除等客户侧操作，不包含签发方法。

## 1. 授权码签发（本机 CLI）

### 前置
- 私钥文件：`scripts/license-keys/private.pem`（RSA-2048，仅本机存在，**切勿放入部署包/更新包/代码仓库**）。
- 命令：`node scripts/license-gen.js`

### 用法

```bash
# 30 天试用（新客户首次合作默认）
node scripts/license-gen.js --cid "客户公司" --domain www.example.com --edition trial --exp 30d

# 正式授权
node scripts/license-gen.js --cid "客户公司" --domain www.example.com --edition pro --exp 2027-12-31

# 不限域名 / 永久
node scripts/license-gen.js --cid "客户公司" --domain a.com,b.com --edition enterprise --exp permanent
```

### 参数说明
| 参数 | 必填 | 说明 |
|---|---|---|
| --cid | 是 | 客户标识（公司名等） |
| --domain | 否 | 绑定域名，多个用逗号分隔；省略=不限域名 |
| --edition | 否 | trial / pro / enterprise |
| --exp | 否 | permanent（永久）｜ 天数如 30d ｜ 日期如 2027-12-31 |
| --seats | 否 | 授权站点数，默认 1 |

## 2. 授权码格式与校验

- 格式：`base64url(payload) + "." + base64url(RSA-SHA256签名)`；payload 含 cid/domains/edition/exp/issued/seats。
- 系统验签公钥：`lib/license/keys.ts`（LICENSE_PUBLIC_KEY）；验签逻辑 `lib/license/verify.ts`。
- 域名校验忽略端口（localhost:3000 视为 localhost）。
- 授权码 base64url 含 `-``_`，交付客户时提示勿断行粘贴。

## 3. 标准销售流程（首次 30 天试用）

1. 新客户首次合作：签发 `--edition trial --exp 30d` 的 30 天试用授权码。
2. 试用到期：系统提示续期，不锁功能；数据保留。
3. 客户采购后：签发正式码（pro/enterprise），客户在后台「授权管理」重新激活即可，无需重装。
4. 试用期数据全部保留。

## 4. 授权管理后台（客户侧可见）

- 入口：后台 → 系统部署 → 授权管理。
- 能力：激活授权 / 查看授权信息 / 解除授权。
- 未授权/过期/域名不匹配时后台顶部显示黄色横幅，不锁功能。

## 5. 安全提醒

- `scripts/license-keys/` 私钥目录已在所有部署脚本的排除规则中，永远不会上传。
- 如私钥泄露，请重新生成密钥对，并让客户重新激活。
