// 对话主体。单一入口：用户与 agent 对话，写操作走 HITL（卡片确认 → 回发结构化消息 →
// agent 调工具 → 成功文本回流）。角色不同 → 问候语/快捷入口不同；会话按角色隔离
// （App 用 key=role 重挂载）。

import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { ChatActionsContext } from "./chatContext";
import { A2UIRenderer } from "../a2ui/components";
import { useSpeech } from "./useSpeech";
import { t } from "../i18n";
import type { Lang } from "../i18n";
import type { AgentMessage, Role } from "../ai/types";

type Entry =
  | { kind: "user"; id: number; text: string }
  | { kind: "agent"; id: number; m: AgentMessage };

// 快捷问题随当前语言切换（这些文本会直接发给引擎，中英均能命中 mock/真实 agent 的意图）。
const SUGGEST: Record<Role, Record<Lang, string[]>> = {
  ee: {
    zh: ["我要打卡", "申请明天 19:00-21:00 OT", "请下周三年假一天", "报销昨天打车 68 元", "查上月工资单"],
    en: ["Clock me in", "File OT tomorrow 19:00-21:00", "Request annual leave next Wed", "Reimburse taxi expense", "Show last month's payslip"],
  },
  manager: {
    zh: ["有哪些待审批 OT", "看今天的出勤 daily", "有待审批的休假吗", "做个研发部 OT 大盘", "研发部谁 OT 最多"],
    en: ["Pending OT approvals", "Today's attendance (daily)", "Pending leave approvals", "Build an R&D OT dashboard", "Who has the most OT?"],
  },
};

function mdBold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

export function Chatbot() {
  const { engine, role, lang } = useStore();
  const [entries, setEntries] = useState<Entry[]>([
    {
      kind: "agent",
      id: 0,
      m: { content: { type: "text", text: role === "ee" ? t("greetEE") : t("greetER") }, phase: { type: "final_response" }, timestamp: "" },
    },
  ]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const seq = useRef(1);
  const sessionId = useRef(crypto.randomUUID());
  const streamRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const send = async (query: string) => {
    const q = query.trim();
    if (!q || streaming) return;
    setEntries((e) => [...e, { kind: "user", id: seq.current++, text: q }]);
    setStreaming(true);
    scrollDown();
    try {
      for await (const m of engine.invoke(q, { sessionId: sessionId.current, role })) {
        setEntries((e) => [...e, { kind: "agent", id: seq.current++, m }]);
        scrollDown();
      }
    } catch (err) {
      setEntries((e) => [
        ...e,
        { kind: "agent", id: seq.current++, m: { content: { type: "error", message: String(err) }, phase: { type: "error" }, timestamp: "" } },
      ]);
    } finally {
      setStreaming(false);
      scrollDown();
    }
  };

  const onSubmit = () => {
    void send(input);
    setInput("");
  };

  // 语音录入：识别文本实时填入输入框，用户复核后发送
  const speech = useSpeech(lang, (text) => setInput(text));

  const suggestions = SUGGEST[role][lang];

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
                  <div className="av ai">✦</div>
                  <div className="bubble full">
                    <AgentRender m={e.m} />
                  </div>
                </div>
              ),
            )}
            {streaming && (
              <div className="row ai">
                <div className="av ai">✦</div>
                <div className="typing">
                  <i /><i /><i />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="composer">
          <div className="box">
            <span style={{ fontSize: 18, color: "var(--mute)" }}>＋</span>
            <input
              value={input}
              placeholder={t("composerPh")}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") onSubmit();
              }}
            />
            {speech.supported && (
              <button
                className={`mic ${speech.listening ? "on" : ""}`}
                onClick={speech.toggle}
                aria-label="语音输入"
                title={speech.listening ? "停止" : "语音输入"}
              >
                {speech.listening ? "■" : "🎤"}
              </button>
            )}
            <button className="send" disabled={streaming || !input.trim()} onClick={onSubmit} aria-label={t("send")}>
              ↑
            </button>
          </div>
          <div className="sug">
            {suggestions.map((q) => (
              <span className="q" key={q} onClick={() => void send(q)}>
                {q}
              </span>
            ))}
          </div>
        </div>
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
