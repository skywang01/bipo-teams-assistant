// 对话视图容器: 无消息 → 渲染 Home(空态); 有消息 → 线程 + 底部输入。
// 挂载时消费 seed(资源页快捷入口种子)并自动发送 → 由 Agent 代执行。
// 合并空态/线程于一体, 避免"seed 设置后视图挂载竞态"。

import { useEffect, useRef, useState } from "react";
import { useChat } from "../state/chat";
import { useStore } from "../state/store";
import { Composer } from "../chat/Composer";
import { A2UIRenderer } from "../a2ui/components";
import { ChatActionsContext } from "../chat/chatContext";
import { Home } from "./Home";
import type { AgentMessage } from "../ai/types";

function mdBold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

export function Chat() {
  const { entries, streaming, send } = useChat();
  const { seedText, consumeSeed } = useStore();
  const streamRef = useRef<HTMLDivElement>(null);
  const seedSentRef = useRef(false); // 防 StrictMode 双调导致重复发送

  const scrollDown = () =>
    requestAnimationFrame(() => streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" }));

  // 挂载时消费快捷入口种子(资源页跳聊天), 自动发送一次。直接读 seedText(而非 consumeSeed 返回值,
  // 因 setState 更新器非同步返回)；ref 守卫确保只发一次(StrictMode 开发期会双调副作用)。
  useEffect(() => {
    if (seedText && !seedSentRef.current) {
      seedSentRef.current = true;
      void send(seedText);
      consumeSeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollDown();
  }, [entries.length, streaming]);

  if (entries.length === 0) return <Home />;

  return (
    <ChatActionsContext.Provider value={{ send: (q) => void send(q) }}>
    <div className="main">
      <div className="stream" ref={streamRef}>
        <div className="wrap">
          {entries.map((e) =>
            e.kind === "user" ? (
              <div className="row me" key={e.id}>
                <div className="av u">🙂</div>
                <div className="bubble">
                  <span dangerouslySetInnerHTML={{ __html: mdBold(e.text) }} />
                </div>
              </div>
            ) : (
              <div className="row ai" key={e.id}>
                <div className="av ai">B</div>
                <div className="bubble full">
                  <AgentRender m={e.m} />
                </div>
              </div>
            ),
          )}
          {streaming && (
            <div className="row ai">
              <div className="av ai">B</div>
              <div className="typing">
                <i /><i /><i />
              </div>
            </div>
          )}
        </div>
      </div>
      <Composer variant="chat" onSent={scrollDown} />
    </div>
    </ChatActionsContext.Provider>
  );
}

function AgentRender({ m }: { m: AgentMessage }) {
  const c = m.content;
  if (c.type === "text") return <div className="txt" dangerouslySetInnerHTML={{ __html: mdBold(c.text) }} />;
  if (c.type === "tool_call") return <ToolCall tool={c.tool} input={c.input} />;
  if (c.type === "tool_result") return <div className="toolcall"><span className="sp" /> 工具结果 · {c.tool}</div>;
  if (c.type === "error") return <div className="txt" style={{ color: "var(--red)" }}>⚠️ {c.message}</div>;
  if (c.type === "agent_output") return <A2UIRenderer outputType={c.output_type} data={c.data} />;
  return null;
}

function ToolCall({ tool, input }: { tool: string; input: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const args = Object.entries(input)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  return (
    <div className="toolcall" onClick={() => setOpen(!open)}>
      <span className="sp" /> 调用 {tool}({args}) {open ? "▴" : "▾"}
      {open && <pre>{JSON.stringify(input, null, 2)}</pre>}
    </div>
  );
}
