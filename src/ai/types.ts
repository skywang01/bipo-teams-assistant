// 消息协议，镜像 bipo-ai-service（src/api/schemas.py）。MockEngine 与 BipoAgentEngine
// 产出同一形状，因此聊天渲染层在切换传输方式时一行都不用改。

export type MessageContent =
  | { type: "text"; text: string }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; result: unknown }
  | { type: "error"; message: string }
  | {
      type: "agent_output";
      output_type: string; // e.g. "clock_punch", "ot_request", "payslip"
      data: Record<string, unknown>; // 组件载荷
      response_id?: string;
    };

export interface MessagePhase {
  type: string; // "thinking" | "tool_call" | "tool_result" | "final_response" | ...
  id?: string;
}

export interface AgentMessage {
  content: MessageContent;
  phase: MessagePhase;
  timestamp: string;
}

export type Role = "ee" | "manager";

export interface InvokeContext {
  sessionId: string;
  role: Role;
}

// 聊天层唯一依赖的接缝。镜像 POST /agents/{agent_id}/invoke 返回的 AgentMessage 流。
export interface AIEngine {
  invoke(input: string, ctx: InvokeContext): AsyncIterable<AgentMessage>;
}
