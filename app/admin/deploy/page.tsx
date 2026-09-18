"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { serverRecommendations, deploymentAdvice } from "@/lib/deploy/server-recommendations";
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  RefreshCw,
  Download,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  Terminal,
  Archive,
  Upload,
  Globe,
  Shield,
  Settings,
  Server as ServerIcon,
  MemoryStick,
  Wifi,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  Star,
  ExternalLink,
} from "lucide-react";

interface DeployLog {
  id: number;
  time: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
}

interface ServerItem {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  deployPath: string;
  isActive: boolean;
}

interface BackupItem {
  name: string;
  size: number;
  modified: string;
}

interface SystemInfo {
  version: string;
  uptime: string;
  nodeVersion: string;
  platform: string;
  env: string;
  lastDeploy: string;
}

interface EnvCheck {
  label: string;
  current: string;
  recommended: string;
  status: "ok" | "warn" | "error" | "info";
}

interface EnvData {
  current: Record<string, string>;
  recommended: Record<string, string>;
  checks: EnvCheck[];
}

export default function DeployPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    version: "检测中...",
    uptime: "检测中...",
    nodeVersion: "检测中...",
    platform: "",
    env: "development",
    lastDeploy: "",
  });

  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [logs, setLogs] = useState<DeployLog[]>([
    { id: 1, time: "14:30:00", type: "info", message: "系统初始化完成，等待部署指令" },
  ]);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");

  const [backuping, setBackuping] = useState(false);
  const [backupList, setBackupList] = useState<BackupItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [deploySessionId, setDeploySessionId] = useState<string>("");
  const [deployStatus, setDeployStatus] = useState<"idle" | "running" | "success" | "failed">("idle");
  const [deployCurrentStep, setDeployCurrentStep] = useState(0);
  const [deployTotalSteps, setDeployTotalSteps] = useState(0);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [recommendTab, setRecommendTab] = useState<"aliyun" | "us" | "hk" | "advice">("aliyun");
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [loadingServers, setLoadingServers] = useState(true);
  const [deployMode, setDeployMode] = useState<"git" | "upload">("git");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string>("");
  // 一键部署压缩包
  const [packaging, setPackaging] = useState(false);
  const [packageInfo, setPackageInfo] = useState<{
    fileName: string;
    filePath: string;
    sizeText: string;
    downloadUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadingBackup, setUploadingBackup] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // 运行环境检测
  const [envData, setEnvData] = useState<EnvData | null>(null);
  const [loadingEnv, setLoadingEnv] = useState(true);

  useEffect(() => {
    fetchServers();
    fetchBackups();
    fetchEnvironment();
  }, []);

  const fetchEnvironment = async () => {
    setLoadingEnv(true);
    try {
      const res = await fetch("/api/admin/deploy/environment");
      const data = await res.json();
      if (data.success) {
        setEnvData(data);
        // 用真实检测结果填充顶部系统信息卡片（替代硬编码假数据）
        const cur = data.current || {};
        setSystemInfo((prev) => ({
          version: cur.appVersion ? `v${cur.appVersion}` : prev.version,
          uptime: cur.uptime || prev.uptime,
          nodeVersion: cur.node || prev.nodeVersion,
          platform: cur.platform || prev.platform,
          env: cur.env || prev.env,
          lastDeploy: prev.lastDeploy,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEnv(false);
    }
  };

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch("/api/admin/deploy/backup");
      const data = await res.json();
      if (data.backups) setBackupList(data.backups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBackups(false);
    }
  };

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/admin/servers");
      const data = await res.json();
      if (Array.isArray(data)) {
        const activeServers = data.filter((s: ServerItem) => s.isActive);
        setServers(activeServers);
        if (activeServers.length > 0 && !selectedServer) {
          setSelectedServer(activeServers[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingServers(false);
    }
  };

  const currentServer = servers.find((s) => s.id === selectedServer);

  const addLog = (type: DeployLog["type"], message: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    setLogs((prev) => [...prev, { id: prev.length + 1, time, type, message }]);
  };

  const checkUpdate = async () => {
    setCheckingUpdate(true);
    addLog("info", "正在检查更新...");
    try {
      const res = await fetch("/api/admin/system-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      const data = await res.json();
      if (data.hasUpdate) {
        setLatestVersion(data.latestVersion);
        setUpdateAvailable(true);
        addLog("success", `发现新版本 v${data.latestVersion}`);
      } else {
        setLatestVersion(data.latestVersion || "");
        setUpdateAvailable(false);
        addLog("info", data.message || "当前已是最新版本");
      }
    } catch (err) {
      addLog("error", "检查更新失败，请稍后重试");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const deploySteps = deployMode === "upload"
    ? [
        { name: "连接服务器", icon: Server },
        { name: "检查部署目录", icon: HardDrive },
        { name: "上传代码包", icon: Upload },
        { name: "解压代码", icon: Archive },
        { name: "环境变量检查", icon: ShieldCheck },
        { name: "安装依赖", icon: RefreshCw },
        { name: "数据库检测", icon: Database },
        { name: "数据库同步", icon: Database },
        { name: "构建项目", icon: HardDrive },
        { name: "重启服务", icon: Play },
        { name: "健康检查", icon: CheckCircle },
      ]
    : [
        { name: "连接服务器", icon: Server },
        { name: "检查部署目录", icon: HardDrive },
        { name: "拉取最新代码", icon: Download },
        { name: "安装依赖", icon: RefreshCw },
        { name: "数据库检测", icon: Database },
        { name: "数据库同步", icon: Database },
        { name: "构建项目", icon: HardDrive },
        { name: "重启服务", icon: Play },
        { name: "健康检查", icon: CheckCircle },
      ];

  const startDeploy = async () => {
    if (deploying) return;
    if (!selectedServer) {
      alert("请先选择部署服务器，或在服务器管理中添加服务器");
      return;
    }
    if (deployMode === "upload" && !uploadFile && !uploadedFilePath) {
      alert("请先选择要上传的代码包（.zip 格式）");
      return;
    }
    if (!confirm(`确定要将网站部署到「${currentServer?.name}」吗？\n部署方式：${deployMode === "upload" ? "上传部署" : "Git拉取"}\n部署过程中网站可能会短暂不可用。`)) {
      return;
    }

    // 清理旧的轮询，防止重复启动导致多个 interval 并发（日志重复）
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    setDeploying(true);
    setDeployStatus("running");
    setDeployStep(0);
    setLogs([]);
    addLog("info", `开始部署 -> 目标服务器: ${currentServer?.name} (${currentServer?.host})`);
    addLog("info", `部署方式: ${deployMode === "upload" ? "上传部署" : "Git拉取"}`);

    try {
      let filePath = uploadedFilePath;

      // 上传模式：先上传文件
      if (deployMode === "upload" && uploadFile) {
        setUploading(true);
        addLog("info", `正在上传代码包: ${uploadFile.name} (${(uploadFile.size / 1024 / 1024).toFixed(2)} MB)`);
        const formData = new FormData();
        formData.append("file", uploadFile);
        const uploadRes = await fetch("/api/admin/deploy/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          throw new Error(uploadData.error || "文件上传失败");
        }
        filePath = uploadData.filePath;
        setUploadedFilePath(filePath);
        addLog("success", "代码包上传完成");
        setUploading(false);
      }

      // 调用部署API
      const res = await fetch("/api/admin/deploy/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: selectedServer, deployMode, uploadPackagePath: filePath }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "启动部署失败");
      }

      setDeploySessionId(data.sessionId);
      setDeployTotalSteps(data.totalSteps || 8);
      addLog("success", `部署任务已启动，共 ${data.totalSteps || 8} 个步骤`);

      // 开始轮询部署状态
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/admin/deploy/status/${data.sessionId}`);
          const statusData = await statusRes.json();

          if (statusData.error) {
            addLog("error", statusData.error);
            clearInterval(interval);
            setDeploying(false);
            setDeployStatus("failed");
            return;
          }

          // 更新进度
          setDeployCurrentStep(statusData.currentStep);
          setDeployStep(statusData.currentStep);
          setDeployTotalSteps(statusData.totalSteps);

          // 添加新日志（只添加比当前多的日志）
          const currentLogCount = logsRef.current;
          if (statusData.logs && statusData.logs.length > currentLogCount) {
            const newLogs = statusData.logs.slice(currentLogCount);
            newLogs.forEach((log: any) => {
              addLog(log.type, log.message);
            });
          }

          // 部署完成
          if (statusData.status === "success" || statusData.status === "failed") {
            clearInterval(interval);
            setDeploying(false);
            setDeployStatus(statusData.status);
            
            if (statusData.status === "success") {
              addLog("success", "🎉 部署完成！网站已成功部署到服务器");
              setSystemInfo((prev) => ({
                ...prev,
                lastDeploy: new Date().toLocaleString("zh-CN"),
              }));
            } else {
              addLog("error", "部署失败，请查看上方日志了解详情");
            }
          }
        } catch (err: any) {
          console.error("轮询部署状态失败:", err);
        }
      }, 2000);

      setPollingInterval(interval);
    } catch (error: any) {
      addLog("error", `部署启动失败: ${error.message}`);
      setDeploying(false);
      setDeployStatus("failed");
    }
  };

  // 使用ref存储日志数量，避免闭包问题（必须用 useRef 保证轮询闭包与 useEffect 操作同一对象）
  const logsRef = useRef(logs.length);
  useEffect(() => {
    logsRef.current = logs.length;
  }, [logs]);

  // 组件卸载时清除轮询
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const startBackup = async () => {
    if (backuping) return;
    setBackuping(true);
    addLog("info", "开始备份...");
    try {
      const res = await fetch("/api/admin/deploy/backup", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "备份失败");
      }
      (data.logs || []).forEach((log: any) => addLog(log.type === "info" ? "info" : "success", log.message));
      fetchBackups();
    } catch (e: any) {
      addLog("error", e.message || "备份失败");
    } finally {
      setBackuping(false);
    }
  };

  const downloadBackup = async (fileName: string) => {
    try {
      const res = await fetch(`/api/admin/deploy/backup?file=${encodeURIComponent(fileName)}`, { method: "PUT" });
      if (!res.ok) {
        alert("下载失败");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("下载失败");
    }
  };

  // 生成一键部署压缩包
  const generateDeployPackage = async () => {
    if (packaging) return;
    setPackaging(true);
    setPackageInfo(null);
    addLog("info", "正在生成一键部署压缩包（打包代码 + 安装脚本 + 配置模板）...");
    try {
      const res = await fetch("/api/admin/deploy/package", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "生成失败");
      }
      setPackageInfo({
        fileName: data.fileName,
        filePath: data.filePath,
        sizeText: data.sizeText,
        downloadUrl: data.downloadUrl,
      });
      addLog("success", `部署压缩包生成成功：${data.fileName}（${data.sizeText}）`);
      addLog("success", `压缩包已挂载，路径：${data.filePath}`);
    } catch (e: any) {
      addLog("error", `生成失败：${e.message || e}`);
    } finally {
      setPackaging(false);
    }
  };

  // 复制压缩包路径
  const copyPackagePath = async () => {
    if (!packageInfo) return;
    const text = packageInfo.filePath;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("复制失败，请手动复制路径");
    }
  };

  const restoreBackup = async (fileName: string) => {
    const isDb = fileName.endsWith(".dump");
    const typeName = isDb ? "数据库" : "项目文件";
    if (!confirm(`确定要从「${fileName}」恢复${typeName}吗？\n\n将覆盖当前${typeName}数据，恢复前会自动备份当前状态。\n此操作不可撤销，请谨慎操作！`)) {
      return;
    }
    setBackuping(true);
    addLog("info", `开始恢复${typeName}...`);
    try {
      const res = await fetch("/api/admin/deploy/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fileName }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "恢复失败");
      }
      (data.logs || []).forEach((log: any) => addLog(log.type === "error" ? "error" : "success", log.message));
      fetchBackups();
    } catch (e: any) {
      addLog("error", e.message || "恢复失败");
    } finally {
      setBackuping(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
    return bytes + " B";
  };

  const uploadBackup = async (file: File) => {
    if (!file) return;
    if (uploadingBackup) return;
    if (!/\.(dump|zip|tar\.gz|sql|backup)$/i.test(file.name)) {
      alert("仅支持 .dump / .zip / .tar.gz / .sql / .backup 格式");
      return;
    }
    setUploadingBackup(true);
    addLog("info", `正在上传备份文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/deploy/backup/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "上传失败");
      if (data.backups) setBackupList(data.backups);
      addLog("success", `备份文件上传成功: ${data.name}`);
    } catch (e: any) {
      addLog("error", e.message || "上传失败");
    } finally {
      setUploadingBackup(false);
    }
  };

  const getLogIcon = (type: DeployLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle size={14} className="text-green-500" />;
      case "error":
        return <AlertCircle size={14} className="text-red-500" />;
      case "warning":
        return <AlertCircle size={14} className="text-yellow-500" />;
      default:
        return <Terminal size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">系统部署</h1>
          <p className="text-sm text-gray-500 mt-1">一键部署、系统更新、备份恢复</p>
        </div>
        <Link
          href="/admin/servers"
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <Settings size={16} />
          服务器管理
        </Link>
      </div>

      {/* 服务器选择 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ServerIcon size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">选择部署服务器</span>
          </div>
          {servers.length === 0 && !loadingServers && (
            <Link href="/admin/servers" className="text-xs text-red-600 hover:underline">
              暂无服务器，点击添加
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            disabled={deploying || loadingServers || servers.length === 0}
            className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-400"
          >
            {loadingServers ? (
              <option value="">加载中...</option>
            ) : servers.length === 0 ? (
              <option value="">暂无可用服务器</option>
            ) : (
              servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name} - {server.host}:{server.port} ({server.username})
                </option>
              ))
            )}
          </select>
          {currentServer && (
            <div className="flex-1 text-xs text-gray-500 space-y-1">
              <div>部署路径: <span className="font-mono text-gray-700">{currentServer.deployPath}</span></div>
              <div>服务器类型: <span className="text-gray-700">{currentServer.type === "aliyun" ? "阿里云" : currentServer.type === "usa" ? "美国服务器" : "其他"}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* 系统信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Server size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">当前版本</div>
              <div className="text-lg font-semibold text-gray-900">{systemInfo.version}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">运行时间</div>
              <div className="text-lg font-semibold text-gray-900">{systemInfo.uptime}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Cpu size={20} className="text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Node.js</div>
              <div className="text-lg font-semibold text-gray-900">{systemInfo.nodeVersion}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Globe size={20} className="text-orange-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">运行环境</div>
              <div className="text-lg font-semibold text-gray-900">
                {systemInfo.env === "production" ? "生产环境" : "开发环境"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 运行环境检测 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings size={20} className="text-red-600" />
            运行环境检测
          </h2>
          <button
            onClick={fetchEnvironment}
            disabled={loadingEnv}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            title="重新检测"
          >
            <RefreshCw size={14} className={loadingEnv ? "animate-spin" : ""} />
            {loadingEnv ? "检测中..." : "重新检测"}
          </button>
        </div>

        {loadingEnv && !envData ? (
          <div className="p-6 text-center text-sm text-gray-400">正在检测当前环境...</div>
        ) : envData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 建议运行环境 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Cpu size={16} className="text-blue-500" />
                建议运行环境
              </h3>
              <div className="space-y-2">
                {Object.entries(envData.recommended).map(([key, val]) => (
                  <div key={key} className="flex items-start gap-2 p-2.5 bg-blue-50/40 rounded-md">
                    <CheckCircle2 size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <span className="text-gray-500 mr-2 shrink-0">
                        {({ os: "操作系统", node: "Node.js", postgres: "PostgreSQL", memory: "内存", cpu: "CPU", disk: "磁盘", process: "进程管理", proxy: "反向代理" } as Record<string, string>)[key] || key}:
                      </span>
                      <span className="text-gray-800">{val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 当前环境版本对比 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Settings size={16} className="text-green-500" />
                当前环境版本
              </h3>
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500">
                      <th className="px-3 py-2 font-medium">项目</th>
                      <th className="px-3 py-2 font-medium">当前</th>
                      <th className="px-3 py-2 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {envData.checks.map((c) => (
                      <tr key={c.label} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-medium">{c.label}</td>
                        <td className="px-3 py-2">
                          <div className="text-gray-800 whitespace-nowrap">{c.current}</div>
                          {c.status !== "info" && c.recommended && (
                            <div className="text-xs text-gray-400 mt-0.5">建议：{c.recommended}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                              c.status === "ok"
                                ? "bg-green-50 text-green-700"
                                : c.status === "warn"
                                ? "bg-yellow-50 text-yellow-700"
                                : c.status === "error"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-50 text-gray-500"
                            }`}
                          >
                            {c.status === "ok" ? (
                              <><CheckCircle2 size={12} />达标</>
                            ) : c.status === "warn" ? (
                              <><AlertCircle size={12} />待优化</>
                            ) : c.status === "error" ? (
                              <><AlertCircle size={12} />未达标</>
                            ) : (
                              <><Clock size={12} />信息</>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-red-500">环境检测失败，请稍后重试</div>
        )}
      </div>

      {/* 部署操作区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 一键部署 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw size={20} className="text-red-600" />
            部署到远程服务器
          </h2>

          {/* 系统升级提示 */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-sm text-yellow-700">
              <div className="font-medium mb-1">代码版本升级请前往「系统更新」页面</div>
              <div className="text-xs">本页面用于将当前代码部署到远程服务器。如需升级系统版本，请使用侧边栏「系统部署 → 系统更新」功能。</div>
              <a href="/admin/system-update" className="inline-block mt-2 text-xs text-blue-600 hover:underline">前往系统更新 →</a>
            </div>
          </div>

          {/* 部署方式选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">部署方式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setDeployMode("git")}
                disabled={deploying}
                className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                  deployMode === "git"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Git 拉取
              </button>
              <button
                onClick={() => setDeployMode("upload")}
                disabled={deploying}
                className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                  deployMode === "upload"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                上传部署
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {deployMode === "git" ? "远程服务器需已配置 Git 仓库，部署时执行 git pull" : "上传本地 .zip 代码包，通过 SFTP 上传到服务器"}
            </p>
          </div>

          {/* 生成一键部署压缩包 */}
          <div className="mb-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  <Archive size={16} className="text-indigo-600" />
                  一键部署压缩包
                </div>
                <p className="text-xs text-gray-500 mt-1">打包当前项目代码 + 自动安装脚本 + 配置模板，可下载后在任何服务器部署</p>
              </div>
            </div>

            <button
              onClick={generateDeployPackage}
              disabled={packaging}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {packaging ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  正在生成压缩包...
                </>
              ) : (
                <>
                  <Archive size={16} />
                  生成一键部署压缩包
                </>
              )}
            </button>

            {/* 生成成功：自动挂载路径 */}
            {packageInfo && (
              <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-md">
                <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">压缩包已生成</span>
                  <span className="text-xs text-gray-400 ml-auto">{packageInfo.sizeText}</span>
                </div>
                <div className="text-xs text-gray-500 mb-1">文件名</div>
                <div className="text-xs font-mono bg-gray-50 px-2 py-1.5 rounded mb-2 text-gray-800 break-all">{packageInfo.fileName}</div>
                <div className="text-xs text-gray-500 mb-1">文件路径（已挂载）</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-gray-50 px-2 py-1.5 rounded text-gray-800 break-all">{packageInfo.filePath}</code>
                  <button
                    onClick={copyPackagePath}
                    className="shrink-0 text-xs px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                    title="复制路径"
                  >
                    {copied ? "✓ 已复制" : "复制路径"}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={packageInfo.downloadUrl}
                    className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                  >
                    <Download size={14} />
                    下载压缩包
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 上传部署：文件选择 */}
          {deployMode === "upload" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">代码包</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    setUploadedFilePath("");
                  }
                }}
                disabled={deploying || uploading}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {uploadFile && (
                <div className="mt-2 text-xs text-gray-600">
                  已选择: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              {uploading && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" />
                  正在上传...
                </div>
              )}
            </div>
          )}

          {/* 部署步骤 */}
          <div className="mb-4 space-y-2">
            {deploySteps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-2 rounded-md text-sm ${
                  deployStep > index
                    ? "bg-green-50 text-green-700"
                    : deployStep === index + 1 && deploying
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    deployStep > index
                      ? "bg-green-500 text-white"
                      : deployStep === index + 1 && deploying
                      ? "bg-blue-500 text-white animate-pulse"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {deployStep > index ? (
                    <CheckCircle size={14} />
                  ) : deployStep === index + 1 && deploying ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    index + 1
                  )}
                </div>
                <step.icon size={16} />
                <span>{step.name}</span>
              </div>
            ))}
          </div>

          {/* 开始部署按钮 */}
          <button
            onClick={startDeploy}
            disabled={deploying}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {deploying ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                正在部署中... ({deployStep}/{deploySteps.length})
              </>
            ) : (
              <>
                <Play size={18} />
                {deployMode === "upload" ? "开始上传部署" : "开始部署"}
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 mt-2 text-center">
            部署过程中请勿关闭页面，预计需要1-2分钟
          </p>
        </div>

        {/* 备份恢复 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Archive size={20} className="text-red-600" />
            备份与恢复
          </h2>

          {/* 一键备份 */}
          <div className="mb-6">
            <button
              onClick={startBackup}
              disabled={backuping}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {backuping ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  正在备份...
                </>
              ) : (
                <>
                  <Download size={16} />
                  一键备份（数据库+文件）
                </>
              )}
            </button>
          </div>

          {/* 备份列表 */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">最近备份</h3>
            {loadingBackups ? (
              <div className="p-4 text-center text-sm text-gray-400">加载中...</div>
            ) : backupList.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                暂无备份文件，点击上方“一键备份”创建
              </div>
            ) : (
              <div className="space-y-2">
                {backupList.slice(0, 8).map((backup) => {
                  const isDb = backup.name.endsWith(".dump");
                  return (
                    <div key={backup.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-3 min-w-0">
                        {isDb ? (
                          <Database size={18} className="text-blue-500 flex-shrink-0" />
                        ) : (
                          <Archive size={18} className="text-purple-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{backup.name}</div>
                          <div className="text-xs text-gray-500">
                            {backup.modified ? new Date(backup.modified).toLocaleString("zh-CN") : ""} · {formatSize(backup.size)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <button
                          onClick={() => downloadBackup(backup.name)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          下载
                        </button>
                        <button
                          onClick={() => restoreBackup(backup.name)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          恢复
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 上传备份 */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">上传备份文件</h3>
            <input
              ref={backupFileInputRef}
              type="file"
              accept=".dump,.zip,.tar.gz,.sql,.backup"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadBackup(f);
                e.target.value = "";
              }}
            />
            <div
              className={`border-2 border-dashed rounded-md p-6 text-center transition-colors cursor-pointer ${
                dragOver ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-red-300"
              }`}
              onClick={() => backupFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) uploadBackup(f);
              }}
            >
              {uploadingBackup ? (
                <>
                  <RefreshCw size={32} className="text-gray-400 mx-auto mb-2 animate-spin" />
                  <p className="text-sm text-gray-500">正在上传...</p>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">点击或拖拽上传备份文件</p>
                  <p className="text-xs text-gray-400 mt-1">支持 .dump / .zip / .tar.gz / .sql 格式</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 部署日志 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Terminal size={20} className="text-red-600" />
            部署日志
          </h2>
          <button
            onClick={() => setLogs([{ id: 1, time: new Date().toLocaleTimeString("zh-CN"), type: "info", message: "日志已清空" }])}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            清空日志
          </button>
        </div>

        <div className="bg-gray-900 rounded-md p-4 h-64 overflow-y-auto font-mono text-sm">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 py-1">
              <span className="text-gray-500 shrink-0">[{log.time}]</span>
              <span className="shrink-0 mt-0.5">{getLogIcon(log.type)}</span>
              <span
                className={
                  log.type === "success"
                    ? "text-green-400"
                    : log.type === "error"
                    ? "text-red-400"
                    : log.type === "warning"
                    ? "text-yellow-400"
                    : "text-gray-300"
                }
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 服务器状态 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={20} className="text-red-600" />
          服务器状态监控
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-500 mb-1">CPU 使用率</div>
            <div className="text-2xl font-bold text-gray-900">23%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: "23%" }}></div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-500 mb-1">内存使用率</div>
            <div className="text-2xl font-bold text-gray-900">45%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: "45%" }}></div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-500 mb-1">磁盘使用率</div>
            <div className="text-2xl font-bold text-gray-900">67%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "67%" }}></div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm text-green-700">所有服务运行正常，数据库连接正常</span>
        </div>
      </div>

      {/* 服务器配置推荐 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ServerIcon size={20} className="text-red-600" />
            服务器配置推荐
          </h2>
          <span className="text-xs text-gray-400">根据企业官网需求推荐</span>
        </div>

        {/* 标签页切换 */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
          <button
            onClick={() => setRecommendTab("aliyun")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recommendTab === "aliyun" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            阿里云（国内）
          </button>
          <button
            onClick={() => setRecommendTab("us")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recommendTab === "us" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            美国服务器（海外）
          </button>
          <button
            onClick={() => setRecommendTab("hk")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recommendTab === "hk" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            香港服务器（免备案）
          </button>
          <button
            onClick={() => setRecommendTab("advice")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${recommendTab === "advice" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            部署建议
          </button>
        </div>

        {/* 阿里云推荐 */}
        {recommendTab === "aliyun" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serverRecommendations.filter(s => s.provider === "aliyun").map((server) => (
              <div key={server.id} className={`border rounded-lg p-4 relative ${server.recommended ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                {server.recommended && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    推荐
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{server.tierName}</h3>
                  <span className="text-xs text-gray-500">{server.regionName}</span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Cpu size={14} className="text-gray-400" />
                    <span>{server.cpu}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MemoryStick size={14} className="text-gray-400" />
                    <span>{server.memory}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <HardDrive size={14} className="text-gray-400" />
                    <span>{server.storage}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wifi size={14} className="text-gray-400" />
                    <span>{server.bandwidth}</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3 mb-3">
                  <div className="text-xs text-gray-500 mb-1">适用场景</div>
                  <div className="flex flex-wrap gap-1">
                    {server.suitableFor.map((item, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-600">¥{server.priceMonthly}</div>
                    <div className="text-xs text-gray-500">/月 · 年付 ¥{server.priceYearly}</div>
                  </div>
                  {server.purchaseUrl && (
                    <a href={server.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
                      去购买 <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 美国服务器推荐 */}
        {recommendTab === "us" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serverRecommendations.filter(s => s.provider === "us").map((server) => (
              <div key={server.id} className={`border rounded-lg p-4 relative ${server.recommended ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                {server.recommended && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    推荐
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{server.tierName}</h3>
                  <span className="text-xs text-gray-500">{server.regionName}</span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Cpu size={14} className="text-gray-400" />
                    <span>{server.cpu}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MemoryStick size={14} className="text-gray-400" />
                    <span>{server.memory}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <HardDrive size={14} className="text-gray-400" />
                    <span>{server.storage}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wifi size={14} className="text-gray-400" />
                    <span>{server.bandwidth}</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3 mb-3">
                  <div className="text-xs text-gray-500 mb-1">适用场景</div>
                  <div className="flex flex-wrap gap-1">
                    {server.suitableFor.map((item, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-600">¥{server.priceMonthly}</div>
                    <div className="text-xs text-gray-500">/月 · 年付 ¥{server.priceYearly}</div>
                  </div>
                  {server.purchaseUrl && (
                    <a href={server.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
                      去购买 <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 香港服务器推荐 */}
        {recommendTab === "hk" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serverRecommendations.filter(s => s.provider === "hk").map((server) => (
              <div key={server.id} className={`border rounded-lg p-4 relative ${server.recommended ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                {server.recommended && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    推荐
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{server.tierName}</h3>
                  <span className="text-xs text-gray-500">{server.regionName}</span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Cpu size={14} className="text-gray-400" />
                    <span>{server.cpu}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MemoryStick size={14} className="text-gray-400" />
                    <span>{server.memory}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <HardDrive size={14} className="text-gray-400" />
                    <span>{server.storage}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wifi size={14} className="text-gray-400" />
                    <span>{server.bandwidth}</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3 mb-3">
                  <div className="text-xs text-gray-500 mb-1">适用场景</div>
                  <div className="flex flex-wrap gap-1">
                    {server.suitableFor.map((item, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-600">¥{server.priceMonthly}</div>
                    <div className="text-xs text-gray-500">/月 · 年付 ¥{server.priceYearly}</div>
                  </div>
                  {server.purchaseUrl && (
                    <a href={server.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
                      去购买 <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 部署建议 */}
        {recommendTab === "advice" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ServerIcon size={16} className="text-red-600" />
                {deploymentAdvice.architecture.title}
              </h3>
              <ul className="space-y-2">
                {deploymentAdvice.architecture.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Cpu size={16} className="text-red-600" />
                {deploymentAdvice.environment.title}
              </h3>
              <ul className="space-y-2">
                {deploymentAdvice.environment.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield size={16} className="text-red-600" />
                {deploymentAdvice.security.title}
              </h3>
              <ul className="space-y-2">
                {deploymentAdvice.security.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-red-600" />
                {deploymentAdvice.optimization.title}
              </h3>
              <ul className="space-y-2">
                {deploymentAdvice.optimization.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
