// A2UI 组件：每个渲染一条 agent_output 消息。注册表把 output_type → 组件，镜像
// bipo-ai-service 的 AgentOutputRegistry。组件是交互式的，写操作通过 chatActions.send()
// 回发结构化确认消息（HITL）——卡片本身绝不直接写 HRMS。
//
// 契约铁律：任何字段增改，必须同步 docs/prompts 的对应片段（agent 侧）。
// ⚠️ 标 demoBadge 的卡片（报销/工资单/daily/休假批量）当前后端工具可能未就绪，
//    先做完整 UI + 占位数据，工具就绪后 engine 不变、零 UI 改动即生效。

import { useEffect, useState } from "react";
import { useChatActions } from "../chat/chatContext";
import { t } from "../i18n";

type Data = Record<string, unknown>;
const S = (v: unknown, d = "") => (v == null ? d : String(v));
const N = (v: unknown, d = 0) => (v == null ? d : Number(v));
const A = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/* ---------- analysis_progress ---------- */
function AnalysisProgress({ data }: { data: Data }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setW(100), 60);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="progress">
      🔎 {S(data.label, "正在分析")}
      <div className="bar"><i style={{ width: `${w}%` }} /></div>
      <div className="step">已扫描 {N(data.scanned)} / {N(data.total)} · 完成</div>
    </div>
  );
}

/* ---------- clock_punch（EE 打卡确认） ---------- */
function ClockPunch({ data }: { data: Data }) {
  const { send } = useChatActions();
  const [done, setDone] = useState(false);
  const [clock] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  return (
    <div className="a2ui punch">
      <div className="h">🕐 打卡 Clock Punch<span className="badge">A2UI · clock_punch</span></div>
      <div className="bd">
        <div className="clock">{clock}</div>
        <div className="loc">📍 {S(data.location, "当前位置")} · {S(data.date)}</div>
        {done ? (
          <div className="done-tag ok">✓ {t("submitted")}</div>
        ) : (
          <div className="btns">
            <button className="bb ok" onClick={() => { setDone(true); send(`确认打卡: ${S(data.date)} ${clock}`); }}>
              ✓ {t("confirm")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- ot_request（EE OT 申请表单） ---------- */
function OtRequest({ data }: { data: Data }) {
  const { send } = useChatActions();
  const [f, setF] = useState({ date: S(data.date), start: S(data.start, "19:00"), end: S(data.end, "21:00"), reason: S(data.reason) });
  const [done, setDone] = useState(false);
  return (
    <div className="a2ui">
      <div className="h">⏱️ OT 申请<span className="badge">A2UI · ot_request</span></div>
      <div className="bd">
        <div className="grid2">
          <div className="field"><label>日期</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div className="field"><label>时长</label><input value={`${f.start}–${f.end}`} readOnly /></div>
        </div>
        <div className="grid2">
          <div className="field"><label>开始</label><input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
          <div className="field"><label>结束</label><input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
        </div>
        <div className="field"><label>事由</label><input value={f.reason} placeholder="如：版本上线保障" onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        {done ? (
          <div className="done-tag ok">✓ {t("submitted")}</div>
        ) : (
          <div className="btns">
            <button className="bb ok" onClick={() => { setDone(true); send(`提交OT申请: ${f.date} ${f.start}-${f.end}, 事由=${f.reason || "—"}`); }}>{t("submit")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- leave_request（EE 休假申请表单） ---------- */
function LeaveRequest({ data }: { data: Data }) {
  const { send } = useChatActions();
  const types = A<string>(data.types);
  const [f, setF] = useState({ type: S(data.type, types[0]), from: S(data.from), to: S(data.to), reason: S(data.reason) });
  const [done, setDone] = useState(false);
  return (
    <div className="a2ui">
      <div className="h">🏖️ 休假申请<span className="badge">A2UI · leave_request</span></div>
      <div className="bd">
        <div className="field">
          <label>假别</label>
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {types.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div className="grid2">
          <div className="field"><label>开始</label><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
          <div className="field"><label>结束</label><input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
        </div>
        <div className="field"><label>事由</label><input value={f.reason} placeholder="选填" onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        {done ? (
          <div className="done-tag ok">✓ {t("submitted")}</div>
        ) : (
          <div className="btns">
            <button className="bb ok" onClick={() => { setDone(true); send(`提交休假申请: ${f.type}, ${f.from}~${f.to}, 事由=${f.reason || "—"}`); }}>{t("submit")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- reimbursement（EE 报销 · 新增） ---------- */
function Reimbursement({ data }: { data: Data }) {
  const { send } = useChatActions();
  const cats = A<string>(data.categories);
  const [f, setF] = useState({ category: S(data.category, cats[0]), amount: S(data.amount), currency: S(data.currency, "CNY"), date: S(data.date), note: S(data.note), receipt: false });
  const [done, setDone] = useState(false);
  return (
    <div className="a2ui">
      <div className="h">🧾 报销 Expense Claim<span className="badge">A2UI · reimbursement</span><span className="demo-badge">{t("demoBadge")}</span></div>
      <div className="bd">
        <div className="grid2">
          <div className="field">
            <label>类别</label>
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {cats.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="field"><label>金额 ({f.currency})</label><input type="number" value={f.amount} placeholder="0.00" onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        </div>
        <div className="field"><label>日期</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        <div className="field"><label>说明</label><input value={f.note} placeholder="如：客户拜访打车" onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <label style={{ fontSize: 12.5, color: "var(--slate)", display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={f.receipt} onChange={(e) => setF({ ...f, receipt: e.target.checked })} /> 已上传发票 / 附件
        </label>
        {done ? (
          <div className="done-tag ok">✓ {t("submitted")}</div>
        ) : (
          <div className="btns">
            <button className="bb ok" disabled={!f.amount} onClick={() => { setDone(true); send(`提交报销: ${f.category}, ${f.currency} ${f.amount}, ${f.date}, 说明=${f.note || "—"}`); }}>{t("submit")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- payslip（EE 工资单 · 新增） ---------- */
function Payslip({ data }: { data: Data }) {
  const items = A<{ label: string; amount: string; kind: string }>(data.items);
  return (
    <div className="a2ui pay">
      <div className="h">💰 工资单 Payslip · {S(data.period)}<span className="badge">A2UI · payslip</span><span className="demo-badge">{t("demoBadge")}</span></div>
      <div className="bd">
        <div className="amt-hero">
          <span style={{ color: "var(--slate)", fontSize: 12 }}>实发 Net</span>
          <span className="big">{S(data.currency)} {S(data.net)}</span>
        </div>
        {items.map((it) => (
          <div className={`item ${it.kind === "deduction" ? "deduction" : ""}`} key={it.label}>
            <span>{it.label}</span><span>{it.amount}</span>
          </div>
        ))}
        <div className="line" style={{ fontWeight: 700, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
          <span>应发 Gross</span><span>{S(data.currency)} {S(data.gross)}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- ot_breakdown（ER OT 明细 · 谁最多） ---------- */
function OtBreakdown({ data }: { data: Data }) {
  const people = A<{ name: string; hours: number; pctOfMax: number; daily: { date: string; hours: number }[] }>(data.people);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="a2ui">
      <div className="h">📊 {S(data.title, "OT 明细")}<span className="badge">A2UI · ot_breakdown</span></div>
      <div className="bd">
        {people.map((p) => (
          <div key={p.name}>
            <div className="hbar" onClick={() => setOpen(open === p.name ? null : p.name)}>
              <span className="nm">{p.name}</span>
              <span className="tk"><i style={{ width: `${p.pctOfMax}%` }} /></span>
              <span className="vv">{p.hours}h</span>
            </div>
            {open === p.name && (
              <div className="drill-detail">
                <table><tbody>{p.daily.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.hours}h</td></tr>)}</tbody></table>
              </div>
            )}
          </div>
        ))}
        <div className="drill-hint">↳ 点任意一行下钻到逐日明细</div>
      </div>
    </div>
  );
}

/* ---------- ot_pending_list（ER 批量审批 OT） ---------- */
function OtPendingList({ data }: { data: Data }) {
  const { send } = useChatActions();
  const rows = A<{ id: string; name: string; dept: string; date: string; hours: number; reason: string; complianceFlag?: string }>(data.rows);
  const [status, setStatus] = useState<Record<string, "approved" | "rejected">>({});
  const resolve = (id: string, s: "approved" | "rejected", name: string) => {
    setStatus((m) => ({ ...m, [id]: s }));
    send(`${s === "approved" ? "批准OT" : "驳回OT"}: ${name} (${id})`);
  };
  const pending = rows.filter((r) => !status[r.id] && !r.complianceFlag);
  const batch = () => {
    setStatus((m) => { const n = { ...m }; pending.forEach((r) => (n[r.id] = "approved")); return n; });
    send(`批准OT: 批量 ${pending.length} 笔(跳过有风险)`);
  };
  return (
    <div className="a2ui">
      <div className="h">📝 待审批 OT ({rows.length})<span className="badge">A2UI · ot_pending_list</span></div>
      <div className="bd plist">
        {rows.map((r) => (
          <div className={`prow ${status[r.id] ? "resolved" : ""}`} key={r.id}>
            <div className="who">
              <b>{r.name}</b> · {r.hours}h
              <div className="meta">{r.dept} · {r.date} · {r.reason}</div>
              {r.complianceFlag && <div className="flag">⚠️ {r.complianceFlag}</div>}
            </div>
            {status[r.id] ? (
              <span className="mini" style={{ color: status[r.id] === "approved" ? "var(--green)" : "var(--red)" }}>
                {status[r.id] === "approved" ? "✓ " + t("approved") : t("rejected")}
              </span>
            ) : (
              <>
                <button className="mini ok" onClick={() => resolve(r.id, "approved", r.name)}>{t("approve")}</button>
                <button className="mini no" onClick={() => resolve(r.id, "rejected", r.name)}>{t("reject")}</button>
              </>
            )}
          </div>
        ))}
        {pending.length > 0 && (
          <div className="bar-actions">
            <button className="bb ok" onClick={batch}>✓ {t("batchApprove")} {pending.length} 笔(跳过风险)</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- leave_pending_list（ER 批量审批休假 · 新增） ---------- */
function LeavePendingList({ data }: { data: Data }) {
  const { send } = useChatActions();
  const rows = A<{ id: string; name: string; dept: string; type: string; from: string; to: string; days: number; reason: string; flag?: string }>(data.rows);
  const [status, setStatus] = useState<Record<string, "approved" | "rejected">>({});
  const resolve = (id: string, s: "approved" | "rejected", name: string) => {
    setStatus((m) => ({ ...m, [id]: s }));
    send(`${s === "approved" ? "批准休假" : "驳回休假"}: ${name} (${id})`);
  };
  const pending = rows.filter((r) => !status[r.id] && !r.flag);
  const batch = () => {
    setStatus((m) => { const n = { ...m }; pending.forEach((r) => (n[r.id] = "approved")); return n; });
    send(`批准休假: 批量 ${pending.length} 笔(跳过缺附件)`);
  };
  return (
    <div className="a2ui">
      <div className="h">🏖️ 待审批休假 ({rows.length})<span className="badge">A2UI · leave_pending_list</span><span className="demo-badge">{t("demoBadge")}</span></div>
      <div className="bd plist">
        {rows.map((r) => (
          <div className={`prow ${status[r.id] ? "resolved" : ""}`} key={r.id}>
            <div className="who">
              <b>{r.name}</b> · {r.type} · {r.days}d
              <div className="meta">{r.dept} · {r.from}~{r.to} · {r.reason}</div>
              {r.flag && <div className="flag">⚠️ {r.flag}</div>}
            </div>
            {status[r.id] ? (
              <span className="mini" style={{ color: status[r.id] === "approved" ? "var(--green)" : "var(--red)" }}>
                {status[r.id] === "approved" ? "✓ " + t("approved") : t("rejected")}
              </span>
            ) : (
              <>
                <button className="mini ok" onClick={() => resolve(r.id, "approved", r.name)}>{t("approve")}</button>
                <button className="mini no" onClick={() => resolve(r.id, "rejected", r.name)}>{t("reject")}</button>
              </>
            )}
          </div>
        ))}
        {pending.length > 0 && (
          <div className="bar-actions">
            <button className="bb ok" onClick={batch}>✓ {t("batchApprove")} {pending.length} 笔(跳过缺附件)</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- daily_attendance（ER 今日出勤 · 新增） ---------- */
function DailyAttendance({ data }: { data: Data }) {
  const sum = (data.summary ?? {}) as Record<string, number>;
  const rows = A<{ name: string; dept: string; in: string; out: string; status: string; note: string }>(data.rows);
  const label: Record<string, string> = { normal: "正常", late: "迟到", absent: "缺勤", leave: "休假", ot: "OT" };
  return (
    <div className="a2ui daily">
      <div className="h">📅 今日出勤 · {S(data.date)}<span className="badge">A2UI · daily_attendance</span><span className="demo-badge">{t("demoBadge")}</span></div>
      <div className="bd">
        <div className="sum">
          <span className="chip">出勤 {sum.present ?? 0}</span>
          <span className="chip">迟到 {sum.late ?? 0}</span>
          <span className="chip">缺勤 {sum.absent ?? 0}</span>
          <span className="chip">休假 {sum.leave ?? 0}</span>
          <span className="chip">OT {sum.ot ?? 0}</span>
        </div>
        <table>
          <thead><tr><th>姓名</th><th>上班</th><th>下班</th><th>状态</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}<div style={{ color: "var(--mute)", fontSize: 11 }}>{r.dept}</div></td>
                <td>{r.in}</td><td>{r.out}</td>
                <td><span className={`st ${r.status}`}>{label[r.status] ?? r.status}</span>{r.note && <div style={{ fontSize: 11, color: "var(--mute)" }}>{r.note}</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- generated_dashboard（ER 大盘） ---------- */
function GeneratedDashboard({ data }: { data: Data }) {
  const tiles = A<{ label: string; value: string; danger?: boolean }>(data.tiles);
  const series = A<number>(data.series);
  const [pinned, setPinned] = useState(false);
  const max = Math.max(...series, 1);
  return (
    <div className="a2ui gend">
      <div className="h">🧩 {S(data.title, "大盘")}（AI 生成）<span className="badge">A2UI · generated_dashboard</span></div>
      <div className="bd">
        <div className="tiles">
          {tiles.map((x) => (
            <div className="gtile" key={x.label}>
              <div className="l">{x.label}</div>
              <div className="v" style={x.danger ? { color: "var(--red)" } : undefined}>{x.value}</div>
            </div>
          ))}
        </div>
        <div className="spark">{series.map((v, i) => <i key={i} style={{ height: `${(v / max) * 100}%` }} />)}</div>
        <button className="open" disabled={pinned} onClick={() => setPinned(true)}>{pinned ? "✓ 已钉到常用" : "📌 钉到常用"}</button>
      </div>
    </div>
  );
}

/* ---------- proactive（建议 + 行动 chips） ---------- */
function Proactive({ data }: { data: Data }) {
  const chips = A<{ label: string; solid?: boolean; action: string }>(data.chips);
  const { send } = useChatActions();
  const [done, setDone] = useState(false);
  const handle = (action: string) => {
    if (action.startsWith("ask:")) send(action.slice(4));
    else if (action === "batch_approve_ot") send("批准OT: 批量(无风险)");
    setDone(true);
  };
  return (
    <div className="proact">
      💡 <span dangerouslySetInnerHTML={{ __html: S(data.text).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }} />
      <div className="chips">
        {chips.map((c) => (
          <button key={c.label} className={`chip ${c.solid ? "solid" : ""}`} disabled={done} onClick={() => handle(c.action)}>{c.label}</button>
        ))}
      </div>
    </div>
  );
}

const REGISTRY: Record<string, (p: { data: Data }) => JSX.Element> = {
  analysis_progress: AnalysisProgress,
  clock_punch: ClockPunch,
  ot_request: OtRequest,
  leave_request: LeaveRequest,
  reimbursement: Reimbursement,
  payslip: Payslip,
  ot_breakdown: OtBreakdown,
  ot_pending_list: OtPendingList,
  leave_pending_list: LeavePendingList,
  daily_attendance: DailyAttendance,
  generated_dashboard: GeneratedDashboard,
  proactive: Proactive,
};

export function A2UIRenderer({ outputType, data }: { outputType: string; data: Data }) {
  const Comp = REGISTRY[outputType];
  if (Comp) return <Comp data={data} />;
  // 未注册类型的兜底：原样展示 payload，不丢信息（如真实 agent 的 builtin 类型）。
  return (
    <div className="a2ui">
      <div className="h">🧩 {outputType}<span className="badge">A2UI · 未注册</span></div>
      <div className="bd">
        <pre style={{ fontSize: 12, color: "var(--slate)", whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
}
