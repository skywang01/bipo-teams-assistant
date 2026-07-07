// 离线 demo 数据。真实模式下这些由 agent + HRMS 工具返回；此处仅供 MockEngine 与
// 卡片占位使用。命名尽量中性，UI chrome 文案走 i18n。

export const SCOPE = { month: "2026-07", org: "Acme Corp" };

/* ---------- ER · OT 明细（谁最多） ---------- */
export const rdOtTop = {
  title: "研发部 OT Top 5",
  people: [
    { name: "张三 Zhang San", hours: 96, pctOfMax: 100, daily: [
      { date: "07-05 (Sat)", hours: 9 }, { date: "07-06 (Sun)", hours: 8 }, { date: "07-12 (Sat)", hours: 9 },
    ]},
    { name: "李四 Li Si", hours: 41, pctOfMax: 43, daily: [{ date: "07-08", hours: 3 }, { date: "07-15", hours: 4 }] },
    { name: "王五 Wang Wu", hours: 28, pctOfMax: 29, daily: [{ date: "07-09", hours: 2 }] },
    { name: "赵六 Zhao Liu", hours: 17, pctOfMax: 18, daily: [{ date: "07-10", hours: 2 }] },
    { name: "钱七 Qian Qi", hours: 14, pctOfMax: 15, daily: [{ date: "07-11", hours: 1.5 }] },
  ],
};

/* ---------- ER · 待审批 OT ---------- */
export const pendingOt = [
  { id: "ot-zs", name: "张三 Zhang San", dept: "研发 R&D", date: "2026-07-12", hours: 4, reason: "版本上线保障", complianceFlag: "本周 OT 已达 18h，接近上限 20h" },
  { id: "ot-s1", name: "孙一 Sun Yi", dept: "销售 Sales", date: "2026-07-11", hours: 2, reason: "客户投标" },
  { id: "ot-s2", name: "周二 Zhou Er", dept: "销售 Sales", date: "2026-07-11", hours: 3, reason: "月末冲刺" },
  { id: "ot-zheng", name: "郑三 Zheng San", dept: "运营 Ops", date: "2026-07-10", hours: 5, reason: "大促值班", complianceFlag: "连续 6 天出勤，涉嫌违反休息日规定" },
];

/* ---------- ER · 待审批休假 ---------- */
export const pendingLeave = [
  { id: "lv-1", name: "李四 Li Si", dept: "研发 R&D", type: "年假 Annual", from: "2026-07-14", to: "2026-07-15", days: 2, reason: "家庭事务" },
  { id: "lv-2", name: "王五 Wang Wu", dept: "研发 R&D", type: "病假 Sick", from: "2026-07-13", to: "2026-07-13", days: 1, reason: "感冒就医", flag: "无病假条附件" },
  { id: "lv-3", name: "孙一 Sun Yi", dept: "销售 Sales", type: "调休 TOIL", from: "2026-07-16", to: "2026-07-16", days: 0.5, reason: "上午私事(AM)" },
];

/* ---------- ER · daily 考勤 ---------- */
export const dailyAttendance = {
  date: "2026-07-07 (Mon)",
  summary: { present: 128, late: 6, absent: 2, leave: 4, ot: 11 },
  rows: [
    { name: "张三 Zhang San", dept: "研发", in: "09:02", out: "19:30", status: "late", note: "迟到 2min" },
    { name: "李四 Li Si", dept: "研发", in: "08:55", out: "18:10", status: "normal", note: "" },
    { name: "王五 Wang Wu", dept: "研发", in: "—", out: "—", status: "leave", note: "病假" },
    { name: "孙一 Sun Yi", dept: "销售", in: "08:40", out: "20:15", status: "ot", note: "OT 2h" },
    { name: "周二 Zhou Er", dept: "销售", in: "—", out: "—", status: "absent", note: "未打卡" },
  ],
};

/* ---------- ER · 大盘 dashboard ---------- */
export const generatedDashboard = {
  title: "研发部 OT 看板 · 2026-07",
  tiles: [
    { label: "OT 总时长", value: "486h" },
    { label: "人均 OT", value: "17.4h" },
    { label: "OT 成本", value: "¥18.6万", danger: true },
    { label: "预算占用", value: "104%", danger: true },
  ],
  series: [12, 18, 22, 30, 41, 38, 52, 48, 60, 55, 44, 62],
};

/* ---------- EE · 工资单 ---------- */
export const payslip = {
  period: "2026-06",
  currency: "CNY",
  gross: "24,800.00",
  net: "19,536.20",
  items: [
    { label: "基本工资 Basic", amount: "18,000.00", kind: "earning" },
    { label: "加班费 OT Pay", amount: "3,200.00", kind: "earning" },
    { label: "绩效 Bonus", amount: "3,600.00", kind: "earning" },
    { label: "个税 Tax", amount: "-3,180.80", kind: "deduction" },
    { label: "社保公积金 Social", amount: "-2,083.00", kind: "deduction" },
  ],
};

/* ---------- EE · 报销类别 ---------- */
export const expenseCategories = ["差旅 Travel", "餐饮 Meal", "交通 Transport", "办公 Office", "其他 Other"];

/* ---------- EE · 休假余额 / 假期类型 ---------- */
export const leaveTypes = ["年假 Annual", "病假 Sick", "事假 Personal", "调休 TOIL"];
export const leaveBalance = { annual: 8.5, sick: 5, toil: 1.5 };
