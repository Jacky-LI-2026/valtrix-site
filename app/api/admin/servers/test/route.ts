import { NextRequest, NextResponse } from "next/server";
import { Client } from "ssh2";
import { prisma } from "@/lib/prisma";

// POST /api/admin/servers/test - 测试服务器 SSH 连接
// body: { id } 测试已保存服务器，或 { host, port, username, password, privateKey } 测试表单信息
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求参数错误" }, { status: 400 });
  }

  try {
    // 收集连接信息
    let connectInfo: any = {};
    if (body.id) {
      const server = await prisma.server.findUnique({ where: { id: BigInt(body.id) } });
      if (!server) {
        return NextResponse.json({ success: false, error: "服务器不存在" }, { status: 404 });
      }
      connectInfo = {
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password,
        privateKey: server.privateKey,
        deployPath: server.deployPath,
        name: server.name,
      };
    } else {
      connectInfo = {
        host: body.host,
        port: body.port || 22,
        username: body.username,
        password: body.password || null,
        privateKey: body.privateKey || null,
        deployPath: body.deployPath || "",
        name: body.name || "",
      };
    }

    if (!connectInfo.host || !connectInfo.username) {
      return NextResponse.json({ success: false, error: "缺少主机或用户名" }, { status: 400 });
    }
    if (!connectInfo.password && !connectInfo.privateKey) {
      return NextResponse.json({ success: false, error: "缺少 SSH 密码或私钥" }, { status: 400 });
    }

    const startTime = Date.now();
    const result = await runSSHTest(connectInfo);
    result.elapsed = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("测试服务器连接失败:", e);
    return NextResponse.json({ success: false, error: "测试服务器连接失败: " + (e?.message || e) }, { status: 500 });
  }
}

// 执行 SSH 连接测试（ssh2 回调式 API 用 Promise 封装，所有路径均 resolve 不 reject）
function runSSHTest(connectInfo: any): Promise<any> {
  return new Promise((resolve) => {
    let settled = false;
    const conn = new Client();
    const finish = (result: any) => {
      if (settled) return;
      settled = true;
      try { conn.end(); } catch {}
      resolve(result);
    };

    // 总超时保护（12秒）
    const timer = setTimeout(() => {
      finish({ success: false, error: "连接超时（12秒），请检查主机、端口或防火墙（安全组）设置" });
    }, 12000);

    try {
      const connectConfig: any = {
        host: connectInfo.host,
        port: connectInfo.port,
        username: connectInfo.username,
        readyTimeout: 10000,
      };
      // 私钥必须是合法 PEM 格式（含 BEGIN 标记），否则降级用密码
      const pk = connectInfo.privateKey || "";
      const validKey = pk.includes("-----BEGIN") && /RSA|EC|OPENSSH|PRIVATE KEY/.test(pk);
      if (validKey) {
        connectConfig.privateKey = pk;
      } else if (connectInfo.password) {
        connectConfig.password = connectInfo.password;
      } else {
        finish({ success: false, error: "私钥格式无效（非 PEM 格式），且无密码可用，请重新配置凭证" });
        return;
      }

      conn.on("ready", () => {
        clearTimeout(timer);
        (async () => {
          const details: any = {};
          const exec = (cmd: string) =>
            new Promise<{ code: number; stdout: string; stderr: string }>((resExec) => {
              conn.exec(cmd, (err: any, stream: any) => {
                if (err) {
                  resExec({ code: -1, stdout: "", stderr: err.message });
                  return;
                }
                let stdout = "";
                let stderr = "";
                stream.on("close", (code: number) => resExec({ code, stdout, stderr }));
                stream.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
                stream.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
              });
            });

          try {
            const sys = await exec("uname -srmo 2>/dev/null || uname -a");
            details.system = sys.stdout.trim() || sys.stderr.trim() || "未知";

            const node = await exec("node -v 2>/dev/null || echo '未安装'");
            details.nodeVersion = node.stdout.trim() || "未安装";

            const pnpm = await exec("pnpm -v 2>/dev/null || echo '未安装'");
            details.pnpmVersion = pnpm.stdout.trim().split("\n")[0] || "未安装";

            let dirExists = false;
            let dirWritable = false;
            if (connectInfo.deployPath) {
              const dir = await exec(`if [ -d "${connectInfo.deployPath}" ]; then echo "1"; else echo "0"; fi`);
              dirExists = dir.stdout.trim() === "1";
              if (dirExists) {
                const wr = await exec(`if [ -w "${connectInfo.deployPath}" ]; then echo "1"; else echo "0"; fi`);
                dirWritable = wr.stdout.trim() === "1";
              }
            }
            details.deployPath = connectInfo.deployPath || "";
            details.deployDirExists = dirExists;
            details.deployDirWritable = dirWritable;

            finish({ success: true, message: "连接成功", details });
          } catch (e: any) {
            finish({ success: false, error: "测试过程中出错: " + (e?.message || e) });
          } finally {
            try { conn.end(); } catch {}
          }
        })();
      });

      conn.on("error", (err: any) => {
        clearTimeout(timer);
        finish({ success: false, error: friendlyError(err) });
      });

      conn.connect(connectConfig);
    } catch (e: any) {
      clearTimeout(timer);
      finish({ success: false, error: "连接初始化失败: " + (e?.message || e) });
    }
  });
}

// 将 ssh2 原始错误翻译为友好提示
function friendlyError(err: any): string {
  const msg = err?.message || "连接失败";
  if (/Timed out/i.test(msg)) return "连接超时，请检查主机 IP / 端口 / 防火墙（安全组）";
  if (/ECONNREFUSED/i.test(msg)) return "连接被拒绝，请确认 SSH 服务已启动且端口正确";
  if (/ENOTFOUND|getaddrinfo/i.test(msg)) return "无法解析主机名 / IP 地址，请检查填写是否正确";
  if (/EHOSTUNREACH|ENETUNREACH/i.test(msg)) return "主机不可达，请检查网络或安全组是否放行";
  if (/All configured authentication methods failed|Permission denied/i.test(msg))
    return "认证失败：用户名、密码或私钥不正确";
  if (/No compatible.*key/i.test(msg)) return "认证失败：服务器不支持当前密钥类型，请改用密码或正确的密钥格式";
  if (/privateKey|keyParse|incorrect/i.test(msg)) return "私钥格式无效，请检查 PEM 内容是否正确";
  return msg;
}
