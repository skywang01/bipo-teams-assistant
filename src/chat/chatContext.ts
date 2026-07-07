// 让 A2UI 卡片（渲染在消息流里）能触发后续消息 —— HITL 的核心：卡片点“确认/提交/批准”
// 时回发一条结构化确认消息，agent 据此调用真实工具。

import { createContext, useContext } from "react";

export interface ChatActions {
  send: (query: string) => void;
}

export const ChatActionsContext = createContext<ChatActions>({ send: () => {} });
export const useChatActions = () => useContext(ChatActionsContext);
