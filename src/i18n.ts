// 极简双语（en/zh）。UI chrome 文案集中在此，默认 en，持久化到 localStorage。
// 卡片业务数据（mockData）保持单一表示，由 agent/后端决定内容。

export type Lang = "en" | "zh";

const DICT = {
  appName: { en: "BIPO Assistant", zh: "BIPO 助手" },
  online: { en: "Online · agent-powered", zh: "在线 · 由 Agent 驱动" },
  homeGreet: { en: "How can I help?", zh: "有什么可以帮你？" },
  newChat: { en: "Home", zh: "首页" },
  modules: { en: "HCM modules", zh: "HCM 模块" },
  roleEE: { en: "Employee", zh: "员工" },
  roleER: { en: "Manager", zh: "管理者" },
  switchRole: { en: "Switch role", zh: "切换角色" },
  composerPh: { en: "Ask me anything…", zh: "问我任何事…" },
  send: { en: "Send", zh: "发送" },
  greetEE: {
    en: "Hi, I'm **BIPO Assistant**. I can clock you in/out, file **OT / leave / expense** requests, or pull your **payslip**. Just ask.",
    zh: "你好，我是 **BIPO 助手**。可以帮你 **打卡**、发起 **OT / 休假 / 报销** 申请，或 **查工资单**。直接问我就好。",
  },
  greetER: {
    en: "Hi, I'm **BIPO Assistant**. I can batch-approve **OT / leave**, show **today's attendance**, and build **dashboards**. Just ask.",
    zh: "你好，我是 **BIPO 助手**。可以帮你 **批量审批 OT / 休假**、看 **今日出勤**、生成 **大盘看板**。直接问我就好。",
  },
  submitted: { en: "Submitted", zh: "已提交" },
  approved: { en: "Approved", zh: "已批准" },
  rejected: { en: "Rejected", zh: "已驳回" },
  confirm: { en: "Confirm", zh: "确认" },
  submit: { en: "Submit", zh: "提交" },
  approve: { en: "Approve", zh: "批准" },
  reject: { en: "Reject", zh: "驳回" },
  batchApprove: { en: "Batch approve", zh: "批量批准" },
  demoBadge: { en: "demo data · pending backend tool", zh: "占位数据 · 待接后端工具" },
} as const;

export type Key = keyof typeof DICT;

let current: Lang = (typeof localStorage !== "undefined" && (localStorage.getItem("lang") as Lang)) || "en";
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}
export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem("lang", l);
  } catch {}
  listeners.forEach((fn) => fn());
}
export function onLangChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function t(key: Key): string {
  return DICT[key][current];
}
