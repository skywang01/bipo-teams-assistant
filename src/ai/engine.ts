// 引擎工厂（唯一接缝）。VITE_AGENT_MODE=real → 接真实 bipo-ai-service（经 Vite 代理）；
// 否则用 MockEngine（离线脚本 demo）。切换传输方式，UI 一行不改。

import type { AIEngine } from "./types";
import { MockEngine } from "./MockEngine";
import { BipoAgentEngine } from "./BipoAgentEngine";

export function createEngine(): AIEngine {
  if (import.meta.env.VITE_AGENT_MODE === "real") {
    const agentId = import.meta.env.VITE_BIPO_AGENT_ID || "attendance-ai";
    // baseUrl="" → 同源；Vite 代理转发 /api 并注入鉴权头。
    return new BipoAgentEngine("", agentId);
  }
  return new MockEngine();
}
