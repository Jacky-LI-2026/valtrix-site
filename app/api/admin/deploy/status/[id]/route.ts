import { NextRequest, NextResponse } from "next/server";
import { deploySessionManager } from "@/lib/deploy/session-manager";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const sessionId = params.id;
    const session = deploySessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "部署会话不存在或已过期" }, { status: 404 });
    }

    // 只返回最近的200条日志，避免数据过大
    const recentLogs = session.logs.slice(-200);

    return NextResponse.json({
      id: session.id,
      serverId: session.serverId,
      serverName: session.serverName,
      status: session.status,
      currentStep: session.currentStep,
      totalSteps: session.totalSteps,
      logs: recentLogs,
      startTime: session.startTime,
      endTime: session.endTime,
      result: session.result,
      logCount: session.logs.length,
    });
  } catch (e: any) {
    console.error("获取部署状态失败:", e);
    return NextResponse.json({ error: `获取部署状态失败: ${e.message}` }, { status: 500 });
  }
}
