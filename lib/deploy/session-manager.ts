import { DeployLog } from "./ssh-deploy";

export interface DeploySession {
  id: string;
  serverId: string;
  serverName: string;
  status: "pending" | "running" | "success" | "failed";
  currentStep: number;
  totalSteps: number;
  logs: DeployLog[];
  startTime: Date;
  endTime?: Date;
  result?: { success: boolean; message: string };
}

// 内存中存储部署会话（生产环境建议使用Redis或数据库）
// 用 globalThis 挂载 Map，避免 Next.js dev 热更新时模块被重新求值导致
// start 路由与 status 路由拿到不同的 Map 实例（表现为 start 200 但 status 404）
const g = globalThis as any;
if (!g.__deploySessions) {
  g.__deploySessions = new Map<string, DeploySession>();
}

class DeploySessionManager {
  private sessions: Map<string, DeploySession> = g.__deploySessions;

  createSession(serverId: string, serverName: string, totalSteps: number): DeploySession {
    const id = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: DeploySession = {
      id,
      serverId,
      serverName,
      status: "pending",
      currentStep: 0,
      totalSteps,
      logs: [],
      startTime: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): DeploySession | undefined {
    return this.sessions.get(id);
  }

  // 检查某服务器是否已有进行中的部署会话（防止并发部署互相干扰）
  hasActiveSession(serverId: string): boolean {
    return Array.from(this.sessions.values()).some(
      (s) => s.serverId === serverId && (s.status === "running" || s.status === "pending")
    );
  }

  updateStatus(id: string, status: DeploySession["status"]): void {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      if (status === "success" || status === "failed") {
        session.endTime = new Date();
      }
    }
  }

  updateStep(id: string, currentStep: number, totalSteps: number): void {
    const session = this.sessions.get(id);
    if (session) {
      session.currentStep = currentStep;
      session.totalSteps = totalSteps;
    }
  }

  addLog(id: string, log: DeployLog): void {
    const session = this.sessions.get(id);
    if (session) {
      session.logs.push(log);
      // 限制日志数量，避免内存溢出
      if (session.logs.length > 1000) {
        session.logs = session.logs.slice(-500);
      }
    }
  }

  setResult(id: string, result: { success: boolean; message: string }): void {
    const session = this.sessions.get(id);
    if (session) {
      session.result = result;
    }
  }

  // 清理超过1小时的会话
  cleanup(): void {
    const now = Date.now();
    Array.from(this.sessions.entries()).forEach(([id, session]) => {
      if (session.endTime && now - session.endTime.getTime() > 3600000) {
        this.sessions.delete(id);
      }
    });
  }
}

export const deploySessionManager = new DeploySessionManager();

// 定期清理过期会话
setInterval(() => {
  deploySessionManager.cleanup();
}, 60000);
