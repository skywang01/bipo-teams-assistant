// 会话状态：从 Chatbot 抽出的 entries/streaming/send/reset 逻辑，供后续 Task 复用。
// engine 单独持有一份（非 store 的 engine），会话按 role 重置 sessionId。

import { createContext, useContext, useMemo, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { createEngine } from "../ai/engine";
import type { AgentMessage } from "../ai/types";
import { useStore } from "./store";

export type Entry = { kind: "user"; id: number; text: string } | { kind: "agent"; id: number; m: AgentMessage };
interface Chat { entries: Entry[]; streaming: boolean; send: (t: string) => Promise<void>; reset: () => void; hasStarted: boolean; }
const Ctx = createContext<Chat | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { role } = useStore();
  const engine = useMemo(() => createEngine(), []);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [streaming, setStreaming] = useState(false);
  const seq = useRef(1);
  const sessionId = useRef(crypto.randomUUID());

  const send = useCallback(async (query: string) => {
    const q = query.trim(); if (!q || streaming) return;
    setEntries((e) => [...e, { kind: "user", id: seq.current++, text: q }]);
    setStreaming(true);
    try {
      for await (const m of engine.invoke(q, { sessionId: sessionId.current, role })) {
        setEntries((e) => [...e, { kind: "agent", id: seq.current++, m }]);
      }
    } catch (err) {
      setEntries((e) => [...e, { kind: "agent", id: seq.current++, m: { content: { type: "error", message: String(err) }, phase: { type: "error" }, timestamp: "" } }]);
    } finally { setStreaming(false); }
  }, [engine, role, streaming]);

  const reset = useCallback(() => { setEntries([]); sessionId.current = crypto.randomUUID(); }, []);
  return <Ctx.Provider value={{ entries, streaming, send, reset, hasStarted: entries.length > 0 }}>{children}</Ctx.Provider>;
}
export function useChat(): Chat { const c = useContext(Ctx); if (!c) throw new Error("useChat outside ChatProvider"); return c; }
