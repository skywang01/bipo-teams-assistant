// 真实引擎：把聊天接到 bipo-ai-service。与 MockEngine 同一个 AIEngine 接口，
// 因此切换（VITE_AGENT_MODE=real）时 UI 一行不改。
//
// 契约（对齐 bipo-ai-service routes.py + schemas.py）：
//   POST /api/agents/{agentId}/invoke
//   body: { jsonrpc:"2.0", id, method:"invoke", params:{ input, session_id } }
//   resp: SSE —— 每帧 `data: {jsonrpc,id,result:AgentMessage}`（或 {error}）
//   鉴权: Authorization: Bearer <JWT> 或 x-service-key（POC 由 Vite 代理注入）
//
// 同源调用（baseUrl=""），Vite dev proxy 注入鉴权头，token 不进浏览器 bundle。
//
// A2UI 零后端注册：平台现役 agent 只渲染 markdown、无考勤专用 agent_output。
// 于是让 agent 在回复文本里内嵌 ```a2ui {json}``` 代码块，本引擎在客户端把它们解析成
// agent_output 消息 → 复用 a2ui 注册表渲染成真卡片。tool_call/tool_result 实时流出；
// text 缓冲到本轮结束再解析。

import type { AIEngine, AgentMessage, InvokeContext, MessageContent, Role } from "./types";
import { authHeaders } from "./backend";

export class BipoAgentEngine implements AIEngine {
  // 服务端签发的 session id，按角色分桶（EE / ER 会话隔离）。
  private sessionIds: Partial<Record<Role, string>> = {};

  constructor(
    private baseUrl: string,
    private agentId: string,
    private token = "",
  ) {}

  async *invoke(input: string, ctx: InvokeContext): AsyncIterable<AgentMessage> {
    // 直连模式带 x-service-key(authHeaders);代理模式为空(代理注入)。
    const headers: Record<string, string> = { "content-type": "application/json", ...authHeaders() };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    // [device_now] marker：LLM 不知道“今天”，所有相对日期（明天/下周三）都靠这个锚点。
    const withNow = `${input} ${deviceNowMarker()}`;

    const params: Record<string, unknown> = { input: withNow };
    const sid = this.sessionIds[ctx.role];
    if (sid) params.session_id = sid;

    const res = await fetch(`${this.baseUrl}/api/agents/${this.agentId}/invoke`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: ctx.sessionId, method: "invoke", params }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      yield errorMessage(`请求失败 ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
      return;
    }
    if (!res.body) {
      yield errorMessage("响应没有 SSE 流");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let textBuffer = ""; // 累积助手文本，本轮结束再做 a2ui 解析

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const frames = buf.split("\n\n"); // SSE 帧以空行分隔
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const raw = dataLine.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          continue; // 跳过非 JSON 的 keep-alive 行
        }
        if (payload.error) {
          yield errorMessage(String(payload.error.message ?? "agent error"));
          continue;
        }
        const m = payload.result as (AgentMessage & { session_id?: string }) | undefined;
        if (!m) continue;
        if (m.session_id) this.sessionIds[ctx.role] = m.session_id; // 捕获会话 id 供多轮复用

        if (m.content.type === "text") {
          textBuffer += m.content.text; // 缓冲文本，回合末统一解析（含 a2ui 卡片）
        } else {
          yield m; // tool_call / tool_result / agent_output / error 实时流出
        }
      }
    }

    for (const msg of parseA2ui(textBuffer)) yield msg;
  }
}

// 把助手文本拆成有序的文本段 + a2ui 卡片。
// 块形式：```a2ui\n{"output_type":"clock_punch","data":{...}}\n```
function parseA2ui(text: string): AgentMessage[] {
  const out: AgentMessage[] = [];
  const re = /```a2ui\s*([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) out.push(textMessage(before));
    try {
      const spec = JSON.parse(m[1].trim());
      if (spec && spec.output_type) {
        out.push(outputMessage(String(spec.output_type), spec.data ?? {}));
      } else {
        out.push(textMessage(m[1].trim()));
      }
    } catch {
      out.push(textMessage(m[1].trim())); // 块格式错误 -> 原样显示
    }
    last = re.lastIndex;
  }
  const tail = text.slice(last).trim();
  if (tail) out.push(textMessage(tail));
  return out;
}

// [device_now: YYYY-MM-DD HH:MM (Wd)]
function deviceNowMarker(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return `[device_now: ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} (${wd})]`;
}

function stamp(content: MessageContent, phase: string): AgentMessage {
  return { content, phase: { type: phase }, timestamp: new Date().toISOString() };
}
const textMessage = (text: string) => stamp({ type: "text", text }, "final_response");
const outputMessage = (output_type: string, data: Record<string, unknown>) =>
  stamp({ type: "agent_output", output_type, data }, "agent_output");
const errorMessage = (message: string) => stamp({ type: "error", message }, "error");
