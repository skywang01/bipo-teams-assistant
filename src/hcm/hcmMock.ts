// 资源页 mock 数据(前期无后端)。共享数据复用 data/mockData.ts, 此处补 EE 视角的
// 个人数据与 ER 视角的统计。真实模式下这些应由 HRMS 返回。

export {
  payslip,
  leaveBalance,
  leaveTypes,
  expenseCategories,
  pendingLeave,
  pendingOt,
  dailyAttendance,
  generatedDashboard,
} from "../data/mockData";

/* ---------- EE · 考勤 ---------- */
export const myAttendance = {
  today: { date: "2026-07-07 (Mon)", in: "09:02", out: "—", status: "working" as const },
  month: { present: 18, late: 1, absent: 0, ot: 6 },
  records: [
    { date: "07-07 Mon", in: "09:02", out: "—", status: "late", note: "迟到 2min" },
    { date: "07-04 Fri", in: "08:55", out: "18:10", status: "normal", note: "" },
    { date: "07-03 Thu", in: "08:50", out: "20:30", status: "ot", note: "OT 2h" },
    { date: "07-02 Wed", in: "08:58", out: "18:05", status: "normal", note: "" },
    { date: "07-01 Tue", in: "—", out: "—", status: "leave", note: "年假" },
  ],
};

/* ---------- EE · 休假 ---------- */
export const myLeaveRequests = [
  { id: "L1", type: "年假 Annual", from: "2026-07-14", to: "2026-07-15", days: 2, status: "pending" },
  { id: "L2", type: "病假 Sick", from: "2026-06-20", to: "2026-06-20", days: 1, status: "approved" },
  { id: "L3", type: "调休 TOIL", from: "2026-06-10", to: "2026-06-10", days: 0.5, status: "approved" },
];

/* ---------- EE · 报销 ---------- */
export const myClaims = [
  { id: "C1", category: "差旅 Travel", amount: "1,280.00", date: "2026-06-28", status: "approved" },
  { id: "C2", category: "餐饮 Meal", amount: "320.00", date: "2026-07-02", status: "pending" },
  { id: "C3", category: "交通 Transport", amount: "68.00", date: "2026-07-06", status: "pending" },
];
export const myClaimSummary = { currency: "CNY", monthUsed: "1,668.00", quota: "5,000.00", pending: 2 };

/* ---------- ER · 报销审批 ---------- */
export const pendingClaims = [
  { id: "PC1", name: "李四 Li Si", dept: "研发 R&D", category: "差旅 Travel", amount: "2,450.00", date: "2026-07-03", flag: "" },
  { id: "PC2", name: "王五 Wang Wu", dept: "研发 R&D", category: "餐饮 Meal", amount: "880.00", date: "2026-07-04", flag: "超部门餐饮上限" },
  { id: "PC3", name: "孙一 Sun Yi", dept: "销售 Sales", category: "交通 Transport", amount: "156.00", date: "2026-07-05", flag: "" },
];
export const claimDeptStats = { currency: "CNY", monthTotal: "42,600", pendingCount: 3, topDept: "研发 R&D" };

/* ---------- EE · 薪资 ---------- */
export const payslipHistory = [
  { period: "2026-06", net: "19,536.20" },
  { period: "2026-05", net: "19,210.00" },
  { period: "2026-04", net: "19,480.50" },
];

/* ---------- ER · 发薪概览 ---------- */
export const payrollOverview = {
  title: "发薪概览 · 2026-06",
  tiles: [
    { label: "发薪总额", value: "¥2.48M" },
    { label: "在薪人数", value: "128" },
    { label: "人均实发", value: "¥19,375" },
    { label: "环比", value: "+1.7%" },
  ],
  series: [210, 218, 222, 230, 241, 238, 252, 248, 260, 255, 244, 248],
};
