// 离线脚本引擎（demo / 无后端兜底）。把用户输入匹配到剧本并带微小延时流式吐出，
// 模拟真实 agent 的“思考/执行”节奏。实现与 BipoAgentEngine 相同的 AIEngine 接口，
// 所以聊天 UI 与传输方式无关。

import type { AIEngine, AgentMessage, InvokeContext } from "./types";
import { SCRIPTS, FALLBACK } from "./scripts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function delayFor(m: AgentMessage): number {
  if (m.content.type === "tool_call") return 500;
  if (m.content.type === "agent_output" && m.content.output_type === "analysis_progress") return 750;
  if (m.content.type === "text") return 550;
  return 400;
}

export class MockEngine implements AIEngine {
  async *invoke(input: string, ctx: InvokeContext): AsyncIterable<AgentMessage> {
    const q = input.replace(/\s*\[device_now:[^\]]*\]\s*$/, "").trim();
    const script = SCRIPTS.find((s) => s.match(q, ctx.role));
    const messages = script ? script.build(ctx.role) : FALLBACK(ctx.role);
    for (const m of messages) {
      await sleep(delayFor(m));
      yield { ...m, timestamp: new Date().toISOString() };
    }
  }
}
