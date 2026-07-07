// 离线脚本化 agent 响应（MockEngine 用）。每个 builder 返回一组 AgentMessage。
// 真实 agent 会产出同样的形状（文字 + ```a2ui``` 块）。顺序敏感——first-match-wins，
// 确认/跟进分支必须排在通用关键词分支之前。角色（ee/manager）参与匹配。

import type { AgentMessage, MessageContent, Role } from "./types";
import {
  rdOtTop, pendingOt, pendingLeave, dailyAttendance, generatedDashboard,
  payslip, expenseCategories, leaveTypes,
} from "../data/mockData";

const now = () => new Date().toISOString();
function msg(content: MessageContent, phase: string, id?: string): AgentMessage {
  return { content, phase: { type: phase, id }, timestamp: now() };
}
const text = (t: string) => msg({ type: "text", text: t }, "final_response");
const toolCall = (tool: string, input: Record<string, unknown>) => msg({ type: "tool_call", tool, input }, "tool_call");
const progress = (label: string, scanned: number, total: number) =>
  msg({ type: "agent_output", output_type: "analysis_progress", data: { label, scanned, total } }, "agent_output");
const out = (output_type: string, data: Record<string, unknown>, response_id?: string) =>
  msg({ type: "agent_output", output_type, data, response_id }, "agent_output");

export interface Script {
  match: (q: string, role: Role) => boolean;
  build: (role: Role) => AgentMessage[];
}

const todayISO = () => new Date().toISOString().slice(0, 10);

// 顺序敏感：确认类 / 具体意图在前，通用关键词在后。
export const SCRIPTS: Script[] = [
  /* ============ HITL 确认回流（写操作：卡片点确认后回发的结构化消息） ============ */
  {
    match: (q) => /^确认打卡|^confirm punch|clock_punch:/i.test(q),
    build: () => [toolCall("clock_punch", { at: "device_now", geo: "device" }), text("✅ 打卡成功。已记录你的上/下班时间与位置。")],
  },
  {
    match: (q) => /^提交OT申请|submit_ot_request:/i.test(q),
    build: () => [toolCall("submit_ot_request", { source: "card" }), text("✅ OT 申请已提交，等待主管审批。可在“我的申请”中查看进度。")],
  },
  {
    match: (q) => /^提交休假申请|submit_leave_request:/i.test(q),
    build: () => [toolCall("submit_leave_request", { source: "card" }), text("✅ 休假申请已提交，等待审批。")],
  },
  {
    match: (q) => /^提交报销|submit_expense_claim:/i.test(q),
    build: () => [toolCall("submit_expense_claim", { source: "card" }), text("✅ 报销单已提交，财务将在 3 个工作日内处理。")],
  },
  {
    match: (q) => /^批准OT|^approve_ot|approve_ot_request:/i.test(q),
    build: () => [toolCall("approve_ot_request", { source: "card" }), text("✅ 已批准。已通知申请人。")],
  },
  {
    match: (q) => /^批准休假|approve_leave_request:/i.test(q),
    build: () => [toolCall("approve_leave_request", { source: "card" }), text("✅ 休假已批准。")],
  },

  /* ============ EE 员工功能 ============ */
  // 打卡
  {
    match: (q, role) => role === "ee" && /打卡|签到|签退|clock\s?(in|out)?|punch/i.test(q),
    build: () => [
      text("好的，帮你打卡。请确认时间与定位（时间/位置以设备为准）："),
      out("clock_punch", { date: todayISO(), suggestType: "auto", location: "定位中… 使用当前位置" }),
    ],
  },
  // OT 申请
  {
    match: (q, role) => role === "ee" && /(申请|提交|报).*(ot|加班)|加班申请|ot申请/i.test(q),
    build: () => [
      text("好的，帮你发起 OT 申请。请补全并确认（我已按今天预填，可修改）："),
      out("ot_request", { date: todayISO(), start: "19:00", end: "21:00", reason: "", hours: 2 }),
    ],
  },
  // 休假申请
  {
    match: (q, role) => role === "ee" && /(请假|休假|年假|病假|事假|调休|leave)/i.test(q),
    build: () => [
      text("好的，帮你申请休假。选择假别与日期后确认："),
      out("leave_request", { types: leaveTypes, type: leaveTypes[0], from: todayISO(), to: todayISO(), halfStart: "", halfEnd: "", reason: "" }),
    ],
  },
  // 报销
  {
    match: (q, role) => role === "ee" && /(报销|费用|发票|reimburse|expense|claim)/i.test(q),
    build: () => [
      text("好的，帮你新建报销单。填写金额与类别后提交（可上传发票）："),
      out("reimbursement", { categories: expenseCategories, category: expenseCategories[0], amount: "", currency: "CNY", date: todayISO(), note: "", receipt: false }),
    ],
  },
  // 工资单
  {
    match: (q, role) => role === "ee" && /(工资|薪资|薪水|工资单|payslip|salary|pay ?slip)/i.test(q),
    build: () => [
      toolCall("get_payslip", { period: payslip.period }),
      text(`这是你 **${payslip.period}** 的工资单：实发 **${payslip.currency} ${payslip.net}**。明细如下：`),
      out("payslip", payslip as unknown as Record<string, unknown>),
    ],
  },

  /* ============ ER 管理者功能 ============ */
  // 批量审批 OT
  {
    match: (q, role) => role === "manager" && /(审批|批准|处理).*(ot|加班)|待审批|批量.*ot/i.test(q),
    build: () => [
      text(`当前有 **${pendingOt.length} 笔待审批 OT**，其中 2 笔有合规提醒。可逐条或批量处理：`),
      out("ot_pending_list", { rows: pendingOt }),
      out("proactive", {
        text: "**建议**：郑三(运营)连续 6 天出勤涉嫌违规，建议单独复核；其余可批量批准。",
        chips: [
          { label: "批量批准无风险的 →", solid: true, action: "batch_approve_ot" },
          { label: "只看有风险的", action: "ask:只看有合规风险的待审批 OT" },
          { label: "稍后", action: "dismiss" },
        ],
      }),
    ],
  },
  // 批量审批休假
  {
    match: (q, role) => role === "manager" && /(审批|批准|处理).*(休假|请假|leave)|待审批.*假/i.test(q),
    build: () => [
      text(`有 **${pendingLeave.length} 笔待审批休假**。王五的病假缺附件，已标注：`),
      out("leave_pending_list", { rows: pendingLeave }),
    ],
  },
  // 查看 daily
  {
    match: (q, role) => role === "manager" && /(daily|今日|当日|考勤看板|出勤|谁没打卡|异常打卡)/i.test(q),
    build: () => [
      toolCall("query_daily_attendance", { date: dailyAttendance.date }),
      text(`**${dailyAttendance.date}** 出勤概览：出勤 ${dailyAttendance.summary.present}、迟到 ${dailyAttendance.summary.late}、缺勤 ${dailyAttendance.summary.absent}、休假 ${dailyAttendance.summary.leave}。明细如下：`),
      out("daily_attendance", dailyAttendance as unknown as Record<string, unknown>),
    ],
  },
  // 大盘 / dashboard
  {
    match: (q, role) => role === "manager" && /(看板|大盘|dashboard|面板|生成.*板|指标)/i.test(q),
    build: () => [
      text("已为你生成 **研发部 OT 大盘**，预览如下，满意可钉到常用："),
      out("generated_dashboard", generatedDashboard),
    ],
  },
  // 只看有风险（来自 proactive chip）
  {
    match: (q, role) => role === "manager" && /只看.*风险|有合规风险/.test(q),
    build: () => [
      text("有合规风险的待审批 OT 共 **2 笔**："),
      out("ot_pending_list", { rows: pendingOt.filter((p) => p.complianceFlag) }),
    ],
  },
  // OT 明细（谁最多）——通用，放后面
  {
    match: (q, role) => role === "manager" && /(ot|加班|工时|谁.*多)/i.test(q),
    build: () => [
      toolCall("query_ot", { dept: "研发", month: "2026-07" }),
      progress("正在分析 OT 明细", 142, 142),
      text("研发部本月 OT 共 **486 小时**，集中在少数人。**张三**(96h)远高于中位数，70% 在周末，建议关注："),
      out("ot_breakdown", rdOtTop),
    ],
  },
];

export const FALLBACK = (role: Role): AgentMessage[] =>
  role === "ee"
    ? [text("我是 **BIPO Assistant**。可以帮你 **打卡**、发起 **OT / 休假 / 报销** 申请，或 **查工资单**。试试对我说：“我要打卡”、“申请明天下午半天年假”、“查一下上月工资单”。")]
    : [text("我是 **BIPO Assistant**。可以帮你 **批量审批 OT / 休假**、看 **今日出勤(daily)**、生成 **大盘看板**。试试：“有哪些待审批 OT”、“看今天的出勤”、“做个研发部 OT 大盘”。")];
