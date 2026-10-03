import { Client } from "ssh2";
import * as fs from "fs";
import * as path from "path";

export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string | null;
  privateKey?: string | null;
  deployPath: string;
  processManager: string;
  processName?: string | null;
  branch: string;
  deployMode?: string; // git / upload
  domain?: string | null;
}

export interface DeployStep {
  id: string;
  name: string;
  command: string;
  description: string;
}

export interface DeployLog {
  time: string;
  type: "info" | "success" | "error" | "warning" | "command" | "output";
  message: string;
}

export type LogCallback = (log: DeployLog) => void;
export type StepCallback = (stepIndex: number, totalSteps: number) => void;

// 部署步骤定义
export function getDeploySteps(server: ServerConfig): DeployStep[] {
  // PM2 进程名：服务器记录 → 部署级环境变量 → 中性默认值（不得写死某站的进程名）
  // 注：各站服务器的 servers 表里通常已配置 processName，这里只是最后的兜底
  const processName = server.processName || process.env.PM2_APP_NAME || "web";
  const pmCmd = server.processManager === "pm2"
    ? `bash -c 'command -v pm2 >/dev/null 2>&1 || npm install -g pm2 >/dev/null 2>&1; if pm2 describe ${processName} >/dev/null 2>&1; then if pm2 describe ${processName} 2>/dev/null | grep -q "next start"; then pm2 delete ${processName} && NODE_ENV=production pm2 start "node server.js" --name ${processName} && pm2 save; else pm2 restart ${processName}; fi; else NODE_ENV=production pm2 start "node server.js" --name ${processName} && pm2 save; fi'`
    : server.processManager === "systemd"
    ? `(systemctl is-active ${processName} >/dev/null 2>&1 && sudo systemctl restart ${processName}) || (echo "systemd 服务 ${processName} 不存在，请先创建单元文件后手动启动")`
    : "echo '自定义进程管理，请手动重启'";

  const isUpload = server.deployMode === "upload";

  const baseSteps: DeployStep[] = [
    {
      id: "connect",
      name: "连接服务器",
      command: "ssh connect",
      description: `连接到 ${server.host}:${server.port}`,
    },
    {
      id: "check-dir",
      name: "检查部署目录",
      command: `mkdir -p "${server.deployPath}" && cd "${server.deployPath}" && pwd`,
      description: `验证部署目录存在: ${server.deployPath}`,
    },
  ];

  if (isUpload) {
    baseSteps.push({
      id: "upload",
      name: "上传代码包",
      command: "sftp upload",
      description: "通过 SFTP 上传代码压缩包到服务器",
    });
    baseSteps.push({
      id: "extract",
      name: "解压代码",
      command: `bash -c '
set -e
rm -rf /tmp/deploy-extract
mkdir -p /tmp/deploy-extract
if command -v unzip >/dev/null 2>&1; then
  unzip -o /tmp/deploy-package.zip -d /tmp/deploy-extract >/dev/null
else
  python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" /tmp/deploy-package.zip /tmp/deploy-extract
fi
SRC=""
FOUND=$(find /tmp/deploy-extract -name package.json 2>/dev/null | head -1)
if [ -n "$FOUND" ]; then SRC=$(dirname "$FOUND"); fi
[ -n "$SRC" ] || SRC=/tmp/deploy-extract
mkdir -p "${server.deployPath}"
cp -rf "$SRC"/. "${server.deployPath}"/
if command -v python3 >/dev/null 2>&1; then
python3 - <<'"'"'PYEOF'"'"'
import os, shutil
root = "${server.deployPath}"
for r, _, fs in os.walk(root):
    for f in fs:
        if "\\\\" in f:
            o = os.path.join(r, f)
            n = os.path.join(r, f.replace("\\\\", "/"))
            os.makedirs(os.path.dirname(n), exist_ok=True)
            shutil.move(o, n)
PYEOF
fi
rm -rf /tmp/deploy-extract /tmp/deploy-package.zip
echo "代码已解压到部署目录"
'`,
      description: "解压代码包到部署目录（自动定位项目根，兼容 unzip/python3 及 Windows 打包 zip）",
    });
    baseSteps.push({
      id: "env-check",
      name: "环境变量检查",
      command: `cd "${server.deployPath}" && if [ ! -f .env ]; then if [ -f .env.example ]; then cp .env.example .env && echo "警告：已从 .env.example 生成 .env（占位配置，请配置真实数据库密码后重跑本步骤）"; else echo "错误：缺少 .env 和 .env.example，请在部署目录手动配置 .env"; exit 1; fi; else echo ".env 已存在"; fi`,
      description: "检查部署目录 .env 配置",
    });
  } else {
    baseSteps.push({
      id: "git-pull",
      name: "拉取最新代码",
      command: `cd "${server.deployPath}" && git pull origin ${server.branch}`,
      description: `从 ${server.branch} 分支拉取最新代码`,
    });
  }

  baseSteps.push(
    {
      id: "install-deps",
      name: "安装依赖",
      command: `cd "${server.deployPath}" && pnpm install`,
      description: "安装项目依赖（含构建所需 devDependencies）",
    },
    {
      id: "db-check",
      name: "数据库检测",
      command: `cd "${server.deployPath}" && if ! grep -qE '^DATABASE_URL="?postgres' .env 2>/dev/null; then echo "错误: .env 未正确配置 DATABASE_URL（应以 postgres:// 开头）"; exit 1; fi; if ! command -v psql >/dev/null 2>&1; then echo "错误: 服务器未安装 PostgreSQL（psql 不可用）。请先安装: sudo apt-get install -y postgresql postgresql-contrib，并创建数据库与用户"; exit 1; fi; if command -v pg_isready >/dev/null 2>&1 && ! pg_isready -q 2>/dev/null; then echo "错误: PostgreSQL 服务未启动。请执行: sudo systemctl start postgresql && sudo systemctl enable postgresql"; exit 1; fi; echo "数据库环境检测通过（DATABASE_URL 已配置、psql 可用）"`,
      description: "检查 DATABASE_URL 配置与 PostgreSQL 服务可用性",
    },
    {
      id: "db-migrate",
      name: "数据库同步",
      command: `cd "${server.deployPath}" && npx prisma db push`,
      description: "同步数据库结构",
    },
    {
      id: "build",
      name: "构建项目",
      command: `cd "${server.deployPath}" && pnpm build`,
      description: "构建 Next.js 生产版本",
    },
    {
      id: "restart",
      name: "重启服务",
      command: `cd "${server.deployPath}" && ${pmCmd}`,
      description: `使用 ${server.processManager} 重启服务`,
    },
    {
      id: "health-check",
      name: "健康检查",
      command: `sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`,
      description: "检查服务是否正常启动",
    }
  );

  return baseSteps;
}

// 创建SSH连接
export function createSSHConnection(server: ServerConfig): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    const connectConfig: any = {
      host: server.host,
      port: server.port,
      username: server.username,
      readyTimeout: 30000,
      // keepalive 防止长传输（如 100MB+ 的部署包 SFTP 上传）期间连接被防火墙/空闲超时断开
      keepaliveInterval: 10000,
      keepaliveCountMax: 12,
    };

    if (server.privateKey) {
      connectConfig.privateKey = server.privateKey;
    } else if (server.password) {
      connectConfig.password = server.password;
    }

    conn.on("ready", () => {
      resolve(conn);
    });

    conn.on("error", (err) => {
      reject(new Error(`SSH连接失败: ${err.message}`));
    });

    conn.connect(connectConfig);
  });
}

// 执行命令并获取输出
export function executeCommand(
  conn: Client,
  command: string,
  onOutput?: (data: string) => void
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    conn.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }

      stream.on("close", (code: number) => {
        resolve({ code, stdout, stderr });
      });

      stream.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        if (onOutput) onOutput(text);
      });

      stream.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        if (onOutput) onOutput(text);
      });
    });
  });
}

// 通过SFTP上传文件
export function uploadFileViaSFTP(
  conn: Client,
  localPath: string,
  remotePath: string,
  onProgress?: (transferred: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) {
        reject(new Error(`SFTP连接失败: ${err.message}`));
        return;
      }

      const fileSize = fs.statSync(localPath).size;
      let transferred = 0;

      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);

      readStream.on("data", (chunk) => {
        transferred += chunk.length;
        if (onProgress) onProgress(transferred, fileSize);
      });

      writeStream.on("close", () => {
        resolve();
      });

      writeStream.on("error", (err: Error) => {
        reject(new Error(`文件上传失败: ${err.message}`));
      });

      readStream.on("error", (err: Error) => {
        reject(new Error(`读取本地文件失败: ${err.message}`));
      });

      readStream.pipe(writeStream);
    });
  });
}

// 格式化时间
function formatTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
}

// 执行完整部署流程
export async function runDeployment(
  server: ServerConfig,
  onLog: LogCallback,
  onStep: StepCallback,
  uploadPackagePath?: string
): Promise<{ success: boolean; message: string }> {
  const steps = getDeploySteps(server);
  let conn: Client | null = null;

  try {
    // 步骤1: 连接服务器
    onStep(0, steps.length);
    onLog({ time: formatTime(), type: "info", message: `开始部署到: ${server.name} (${server.host})` });
    onLog({ time: formatTime(), type: "info", message: `部署方式: ${server.deployMode === "upload" ? "上传部署" : "Git拉取"}` });
    onLog({ time: formatTime(), type: "command", message: `正在连接 ${server.host}:${server.port}...` });

    conn = await createSSHConnection(server);
    onLog({ time: formatTime(), type: "success", message: "SSH连接成功" });

    // 执行后续步骤
    for (let i = 1; i < steps.length; i++) {
      const step = steps[i];
      onStep(i, steps.length);
      onLog({ time: formatTime(), type: "info", message: `[${i + 1}/${steps.length}] ${step.name}` });

      if (step.id === "upload" && uploadPackagePath) {
        // SFTP 上传
        onLog({ time: formatTime(), type: "command", message: `上传文件: ${path.basename(uploadPackagePath)}` });
        const fileSize = fs.statSync(uploadPackagePath).size;
        onLog({ time: formatTime(), type: "info", message: `文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB` });

        await uploadFileViaSFTP(conn, uploadPackagePath, "/tmp/deploy-package.zip", (transferred, total) => {
          const percent = Math.round((transferred / total) * 100);
          if (percent % 20 === 0) {
            onLog({ time: formatTime(), type: "output", message: `上传进度: ${percent}% (${(transferred / 1024 / 1024).toFixed(1)}MB)` });
          }
        });
        onLog({ time: formatTime(), type: "success", message: "文件上传完成" });
        continue;
      }

      onLog({ time: formatTime(), type: "command", message: `$ ${step.command}` });

      const result = await executeCommand(conn, step.command, (data) => {
        const lines = data.trim().split("\n").filter((l) => l.trim());
        lines.forEach((line) => {
          onLog({ time: formatTime(), type: "output", message: line.substring(0, 200) });
        });
      });

      if (result.code !== 0 && step.id !== "health-check") {
        onLog({ time: formatTime(), type: "error", message: `${step.name} 失败 (退出码: ${result.code})` });
        if (result.stderr) {
          onLog({ time: formatTime(), type: "error", message: result.stderr.substring(0, 500) });
        }
        return { success: false, message: `${step.name} 失败` };
      }

      // 健康检查特殊处理：失败即整体判失败（不得以"可能正在启动中"掩盖服务未上线）
      if (step.id === "health-check") {
        const statusCode = result.stdout.trim();
        if (statusCode === "200" || statusCode === "301" || statusCode === "302") {
          onLog({ time: formatTime(), type: "success", message: `健康检查通过 (HTTP ${statusCode})` });
        } else {
          // curl 连不上时 http_code 为 000（或空）→ 明确报“服务无响应”，不得含糊成“可能正在启动中”
          const reachable = statusCode !== "" && statusCode !== "000";
          const reason = reachable
            ? `健康检查失败 (HTTP ${statusCode})`
            : `健康检查失败 (服务无响应，curl 退出码 ${result.code})`;
          onLog({ time: formatTime(), type: "error", message: reason });
          return { success: false, message: reason };
        }
      } else {
        onLog({ time: formatTime(), type: "success", message: `${step.name} 完成` });
      }

      // 步骤间短暂延迟
      await new Promise((r) => setTimeout(r, 500));
    }

    onStep(steps.length, steps.length);
    onLog({ time: formatTime(), type: "success", message: "🎉 部署完成！网站已成功部署到服务器" });
    if (server.domain) {
      onLog({ time: formatTime(), type: "info", message: `访问地址: ${server.domain}` });
    }

    return { success: true, message: "部署成功" };
  } catch (error: any) {
    onLog({ time: formatTime(), type: "error", message: `部署失败: ${error.message}` });
    return { success: false, message: error.message };
  } finally {
    if (conn) {
      conn.end();
    }
  }
}
