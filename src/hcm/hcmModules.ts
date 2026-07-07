// HCM 模块配置(首批 4 个)+ 各模块"快捷入口"(跳聊天让 Agent 代执行的 prompt, 按角色)。
import type { Role } from "../ai/types";
import type { ViewId } from "../state/store";

export type ModuleId = Exclude<ViewId, "chat">; // "attendance" | "leave" | "claim" | "payroll"

export interface ModuleDef {
  id: ModuleId;
  icon: string;
  label: { en: string; zh: string };
}

export const MODULES: ModuleDef[] = [
  { id: "attendance", icon: "🕐", label: { en: "Attendance", zh: "考勤" } },
  { id: "leave", icon: "🌴", label: { en: "Leave", zh: "休假" } },
  { id: "claim", icon: "🧾", label: { en: "Claim", zh: "报销" } },
  { id: "payroll", icon: "💰", label: { en: "Payroll", zh: "薪资" } },
];

export interface Shortcut {
  label: { en: string; zh: string };
  prompt: string; // 跳聊天后自动发送的消息
}

export const SHORTCUTS: Record<ModuleId, Record<Role, Shortcut[]>> = {
  attendance: {
    ee: [
      { label: { en: "Clock in via AI", zh: "让 AI 帮我打卡" }, prompt: "我要打卡" },
      { label: { en: "File OT", zh: "申请 OT" }, prompt: "申请明天 19:00-21:00 OT" },
    ],
    manager: [
      { label: { en: "Today's attendance", zh: "看今天出勤" }, prompt: "看今天的出勤 daily" },
      { label: { en: "OT dashboard", zh: "OT 大盘" }, prompt: "做个研发部 OT 大盘" },
    ],
  },
  leave: {
    ee: [{ label: { en: "Request leave via AI", zh: "让 AI 帮我请假" }, prompt: "请下周三年假一天" }],
    manager: [{ label: { en: "Batch approve leave", zh: "批量审批休假" }, prompt: "有待审批的休假吗" }],
  },
  claim: {
    ee: [{ label: { en: "New claim via AI", zh: "让 AI 帮我报销" }, prompt: "报销昨天打车 68 元" }],
    manager: [{ label: { en: "Approve claims", zh: "审批报销" }, prompt: "有待审批的报销吗" }],
  },
  payroll: {
    ee: [{ label: { en: "Explain my payslip", zh: "解读我的工资单" }, prompt: "查上月工资单" }],
    manager: [{ label: { en: "Payroll overview", zh: "发薪概览" }, prompt: "做个发薪大盘" }],
  },
};
