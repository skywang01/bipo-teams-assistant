# Copilot 式 HCM Shell 实现计划

> **For agentic workers:** 用 superpowers:executing-plans 或 subagent-driven-development 逐任务实现。步骤用 `- [ ]` 复选框跟踪。

**Goal:** 把单一对话框改造为「可折叠侧边栏 + 主区」的 Copilot 式 HCM 外壳：默认 AI 对话 Home（可跨域执行），侧栏另有 4 个 HCM 资源页（Attendance/Leave/Claim/Payroll，mock 数据+功能+快捷入口跳聊天）。

**Architecture:** App = Sidebar + Main(按 `activeView` 渲染)。会话状态提升到 `ChatProvider`，Home 与 Chat 共享。资源页复用现有 A2UI 卡片组件 + mock 数据渲染，本地功能走 mock，快捷入口 `seedChat(prompt)` 跳到 chat 视图并发送。

**Tech Stack:** React 18 + Vite + TS；复用现有 engine/A2UI/useSpeech/i18n/store。

## Global Constraints

- 无单元测试框架：每任务验证 = `npm run build`(tsc+vite) 通过 + 必要处 Playwright；末任务 E2E。
- 复用不动内部：`src/ai/*`、`src/a2ui/components.tsx`、`src/chat/useSpeech.ts`、`src/i18n.ts`。
- 双语（en/zh）：面向用户文案走 `i18n.ts`，不硬编码；代码注释用中文。
- 角色 `Role = "ee" | "manager"`；配色 navy `#20307D` / blue `#2A63E6`。
- 每任务结束 `git commit`；末任务 `git push`（触发 Pages 部署）。
- 纯前端内容改动，无需重传 Teams zip。

---

## 文件结构（先锁定边界）

```
新增
  src/state/chat.tsx          ChatProvider: 会话状态(entries/streaming/send/reset/sessionId)
  src/chat/Composer.tsx       输入组件(＋/文本/🎤/↑ + 按住说话), Home 与 Chat 共用
  src/views/Home.tsx          AI 对话着陆(大问候 + 居中 Composer + 建议 chips)
  src/views/Chat.tsx          对话线程(消息流 + 底部 Composer), 由现 Chatbot 抽出
  src/shell/Sidebar.tsx       可折叠导航
  src/hcm/hcmModules.ts       模块配置(id/图标/标签/角色可见/建议/快捷入口 prompt)
  src/hcm/hcmMock.ts          4 域 mock 数据(按角色)
  src/hcm/ResourcePage.tsx    资源页骨架(标题栏 + 区块容器 + 快捷入口栏)
  src/hcm/AttendancePage.tsx / LeavePage.tsx / ClaimPage.tsx / PayrollPage.tsx

改造
  src/state/store.tsx         增 activeView / collapsed / seedText; role/lang/toast 保留
  src/App.tsx                 = Sidebar + Main(switch activeView)
  src/chat/Chatbot.tsx        拆分: 会话逻辑→chat.tsx, 视图→Chat.tsx/Home.tsx (删除或改薄)
  src/styles.css              增 shell/sidebar/home/resource 样式

复用(不改)
  src/ai/* · src/a2ui/components.tsx · src/chat/useSpeech.ts · src/i18n.ts · src/data/mockData.ts
```

---

### Task 1: store 扩展 + ChatProvider（状态基座）

**Files:**
- Modify: `src/state/store.tsx`（增 `activeView` / `collapsed` / `seedText`）
- Create: `src/state/chat.tsx`（ChatProvider）

**Interfaces:**
- Produces（store）：`activeView: ViewId`（`"chat"|"attendance"|"leave"|"claim"|"payroll"`）、`setActiveView(v)`、`collapsed: boolean`、`toggleCollapsed()`、`seedText: string|null`、`seedChat(text)`（设 seedText 且 activeView="chat"）、`consumeSeed(): string|null`。保留 `role/setRole/lang/switchLang/toast`。
- Produces（chat）：`useChat()` → `{ entries, streaming, send(text), reset(), role }`；`ChatProvider` 内部持有 `sessionId`（按 role 重置），`send` 调 `engine.invoke(input,{sessionId,role})`。

- [ ] **Step 1: store 增字段**（`src/state/store.tsx`）

```tsx
export type ViewId = "chat" | "attendance" | "leave" | "claim" | "payroll";
// 在 Store 接口增:
//   activeView: ViewId; setActiveView: (v: ViewId) => void;
//   collapsed: boolean; toggleCollapsed: () => void;
//   seedText: string | null; seedChat: (t: string) => void; consumeSeed: () => string | null;
// Provider 内:
const [activeView, setActiveView] = useState<ViewId>("chat");
const [collapsed, setCollapsed] = useState(false);
const [seedText, setSeedText] = useState<string | null>(null);
const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
const seedChat = useCallback((t: string) => { setSeedText(t); setActiveView("chat"); }, []);
const consumeSeed = useCallback(() => { let s: string | null = null; setSeedText((c) => { s = c; return null; }); return s; }, []);
// value 里补齐以上字段
```

- [ ] **Step 2: ChatProvider**（`src/state/chat.tsx`）——把 Chatbot 里的会话逻辑抽出

```tsx
import { createContext, useContext, useMemo, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { createEngine } from "../ai/engine";
import type { AgentMessage, Role } from "../ai/types";
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
```

- [ ] **Step 3: 构建通过**

Run: `npm run build`　Expected: PASS（此时 App 尚未用到，仅类型编译）

- [ ] **Step 4: Commit**

```bash
git add src/state/store.tsx src/state/chat.tsx
git commit -m "feat(shell): store 增 activeView/collapsed/seed + ChatProvider 抽出会话状态"
```

---

### Task 2: Composer（抽出可复用输入组件）

**Files:**
- Create: `src/chat/Composer.tsx`
- Test: 构建 + 后续视图内验证

**Interfaces:**
- Consumes：`useChat().send/streaming`、`useStore().lang`、`useSpeech`（现有）。
- Produces：`<Composer variant="home" | "chat" />`（home 居中大号；chat 底部）。内部含文本框、语音模式(按住说话/上滑取消/松开发送)、发送。发送后清空。

- [ ] **Step 1: 实现 Composer**——把现 `Chatbot.tsx` 的输入区(box/voice-row/mic 逻辑/useSpeech)整体搬入，`send` 改从 `useChat()` 取；建议 chips 不在此(放 Home)。

```tsx
// 关键: 复用现有 useSpeech + holding/cancelArmed/micDown/micMove/micUp + voiceMode 逻辑
// props: { variant?: "home" | "chat"; onSent?: () => void }
// 发送: const { send, streaming } = useChat(); onSubmit → send(input); setInput(""); onSent?.()
// variant 仅影响外层 className(.composer vs .composer.home)
```

- [ ] **Step 2: 构建通过**　Run: `npm run build`　Expected: PASS
- [ ] **Step 3: Commit**

```bash
git add src/chat/Composer.tsx
git commit -m "feat(shell): 抽出 Composer(文本+语音+发送), Home/Chat 共用"
```

---

### Task 3: Home 与 Chat 视图

**Files:**
- Create: `src/views/Home.tsx`、`src/views/Chat.tsx`
- Modify: `src/chat/Chatbot.tsx`（保留 `AgentRender`/`ToolCall`/`mdBold` 供 Chat 复用，或迁入 Chat.tsx 后删旧文件）

**Interfaces:**
- Consumes：`useChat()`、`useStore()`、`<Composer/>`、`A2UIRenderer`。
- Produces：`<Home/>`（大问候 + 居中 Composer + 建议 chips，按 role/lang）；`<Chat/>`（消息流 + 底部 Composer）。

- [ ] **Step 1: Chat.tsx**——消息流渲染（搬现 Chatbot 的 stream + AgentRender + 底部 `<Composer variant="chat"/>`），消费 `useChat().entries/streaming`。挂 `useEffect` 消费 `store.consumeSeed()` → 若有则 `send(seed)`。

```tsx
// 结构: <div class="main"><div class="stream">{entries.map(渲染)}</div><Composer variant="chat"/></div>
// AgentRender/ToolCall/mdBold 从旧 Chatbot 迁来
// useEffect(()=>{ const s = consumeSeed(); if (s) void send(s); }, []) // 挂载时消费快捷入口种子
```

- [ ] **Step 2: Home.tsx**——大问候 + 居中 Composer + 建议 chips

```tsx
// <div class="home"><h1>{t("homeGreet")}</h1><Composer variant="home"/><div class="sug">{SUGGEST[role][lang].map(chip→ onClick=send)}</div></div>
// SUGGEST 复用现 Chatbot 的双语建议表(迁到 Home 或 hcmModules)
```

- [ ] **Step 3: i18n 增 `homeGreet`**（`src/i18n.ts`）：`{ en: "How can I help?", zh: "有什么可以帮你？" }`
- [ ] **Step 4: 构建通过**　Run: `npm run build`　Expected: PASS
- [ ] **Step 5: Commit**

```bash
git add src/views/Home.tsx src/views/Chat.tsx src/chat/Chatbot.tsx src/i18n.ts
git commit -m "feat(shell): Home(对话着陆) + Chat(线程) 视图拆分"
```

---

### Task 4: HCM 模块配置 + mock 数据

**Files:**
- Create: `src/hcm/hcmModules.ts`、`src/hcm/hcmMock.ts`

**Interfaces:**
- Produces：`MODULES: {id: ViewId; icon: string; label:{en,zh}; roles: Role[]}[]`（仅 attendance/leave/claim/payroll）；`SHORTCUTS: Record<ViewId, Record<Role, {label:{en,zh}; prompt:string}[]>>`（快捷入口→聊天 prompt）；`hcmMock` 导出各域按角色的数据（复用/扩展 `src/data/mockData.ts`）。

- [ ] **Step 1: hcmModules.ts**

```ts
import type { Role } from "../ai/types";
import type { ViewId } from "../state/store";
export const MODULES: { id: ViewId; icon: string; label: { en: string; zh: string } }[] = [
  { id: "attendance", icon: "🕐", label: { en: "Attendance", zh: "考勤" } },
  { id: "leave",      icon: "🌴", label: { en: "Leave", zh: "休假" } },
  { id: "claim",      icon: "🧾", label: { en: "Claim", zh: "报销" } },
  { id: "payroll",    icon: "💰", label: { en: "Payroll", zh: "薪资" } },
];
export const SHORTCUTS: Record<string, Record<Role, { label: { en: string; zh: string }; prompt: string }[]>> = {
  attendance: { ee: [{ label: { en: "Clock in via AI", zh: "让AI帮我打卡" }, prompt: "我要打卡" }],
                manager: [{ label: { en: "Today's attendance", zh: "看今天出勤" }, prompt: "看今天的出勤 daily" }] },
  leave:      { ee: [{ label: { en: "Request leave via AI", zh: "让AI帮我请假" }, prompt: "请下周三年假一天" }],
                manager: [{ label: { en: "Batch approve leave", zh: "批量审批休假" }, prompt: "有待审批的休假吗" }] },
  claim:      { ee: [{ label: { en: "New claim via AI", zh: "让AI帮我报销" }, prompt: "报销昨天打车 68 元" }],
                manager: [{ label: { en: "Approve claims", zh: "审批报销" }, prompt: "有待审批的报销吗" }] },
  payroll:    { ee: [{ label: { en: "Explain my payslip", zh: "解读我的工资单" }, prompt: "查上月工资单" }],
                manager: [{ label: { en: "Payroll overview", zh: "发薪概览" }, prompt: "做个发薪大盘" }] },
};
```

- [ ] **Step 2: hcmMock.ts**——各域数据（复用 `data/mockData.ts` 的 payslip/pendingOt/pendingLeave/dailyAttendance/leaveBalance，新增：EE 考勤记录、我的休假/报销列表、历史工资单、报销/发薪统计）。全部导出为按 role 取用的对象或函数。

```ts
// 例:
export const myAttendance = { today: { in: "09:02", out: "—", status: "working" }, month: { present: 18, late: 1, ot: 6 }, records: [{date:"07-06",in:"08:55",out:"18:10",status:"normal"}, ...] };
export const myLeaveRequests = [{ id:"L1", type:"年假 Annual", from:"2026-07-14", to:"2026-07-15", days:2, status:"pending" }, ...];
export const myClaims = [{ id:"C1", category:"差旅 Travel", amount:"1,280.00", date:"2026-06-28", status:"approved" }, ...];
export const payslipHistory = [{ period:"2026-06", net:"19,536.20" }, { period:"2026-05", net:"19,210.00" }];
export const payrollOverview = { total:"¥2,480,000", headcount:128, series:[...] };
export const claimStats = { pendingCount: 5, monthTotal: "¥42,600" };
// leaveBalance/pendingLeave/pendingOt/dailyAttendance/payslip 从 ../data/mockData 复用
```

- [ ] **Step 3: 构建通过**　Run: `npm run build`　Expected: PASS
- [ ] **Step 4: Commit**

```bash
git add src/hcm/hcmModules.ts src/hcm/hcmMock.ts
git commit -m "feat(hcm): 模块配置 + 4域 mock 数据 + 快捷入口 prompt"
```

---

### Task 5: ResourcePage 骨架 + 4 个模块页

**Files:**
- Create: `src/hcm/ResourcePage.tsx`、`AttendancePage.tsx`、`LeavePage.tsx`、`ClaimPage.tsx`、`PayrollPage.tsx`

**Interfaces:**
- Consumes：`useStore().role/lang/seedChat/toast`、`hcmMock`、`SHORTCUTS`、`A2UIRenderer`（复用卡片）。
- Produces：`<AttendancePage/>` 等 4 个；`<ResourcePage title icon shortcuts>{children}</ResourcePage>` 骨架（标题栏 + 快捷入口栏[点击 `seedChat(prompt)`] + 内容区块）。

- [ ] **Step 1: ResourcePage.tsx**——通用骨架

```tsx
// props: { title: string; icon: string; shortcuts: {label:string; prompt:string}[]; children }
// 渲染: 顶部标题(icon+title) + 快捷入口 chips(onClick=seedChat(prompt)) + <div class="res-body">{children}</div>
```

- [ ] **Step 2: 4 个模块页**——按 role 渲染数据(复用 A2UI 卡片) + 本地功能(mock 弹卡/提示)

```tsx
// AttendancePage:
//   EE: 今日打卡块(<A2UIRenderer outputType="clock_punch" .../> 或本地按钮→toast) + 本月统计tile + 记录表
//   ER: <A2UIRenderer outputType="daily_attendance" data=dailyAttendance/> + OT大盘(generated_dashboard)
// LeavePage:
//   EE: 假期余额tile + 我的申请列表 + [申请休假]→展开 leave_request 卡(本地, 提交toast)
//   ER: <A2UIRenderer outputType="leave_pending_list" data={rows:pendingLeave}/>
// ClaimPage:
//   EE: 我的报销列表 + [新建报销]→reimbursement 卡(本地) + 额度统计
//   ER: 待审批报销列表 + 部门统计
// PayrollPage:
//   EE: <A2UIRenderer outputType="payslip" data=payslip/> + 历史列表
//   ER: 发薪概览(tiles + spark, 复用 generated_dashboard 或自绘)
// 每页顶部用 <ResourcePage title icon shortcuts={SHORTCUTS[id][role]}>
```

- [ ] **Step 3: 构建通过**　Run: `npm run build`　Expected: PASS
- [ ] **Step 4: Commit**

```bash
git add src/hcm/ResourcePage.tsx src/hcm/AttendancePage.tsx src/hcm/LeavePage.tsx src/hcm/ClaimPage.tsx src/hcm/PayrollPage.tsx
git commit -m "feat(hcm): 4 资源页(数据+本地功能+快捷入口), 复用 A2UI 卡片"
```

---

### Task 6: Sidebar（可折叠导航）

**Files:**
- Create: `src/shell/Sidebar.tsx`

**Interfaces:**
- Consumes：`useStore()`（activeView/setActiveView/collapsed/toggleCollapsed/role/setRole/lang/switchLang）、`useChat().reset`、`MODULES`、`isInTeams`。
- Produces：`<Sidebar/>`。

- [ ] **Step 1: 实现 Sidebar**

```tsx
// 结构:
//  顶部: 折叠按钮 (⟨⟩) ; 非Teams 时显示 "B BIPO Assistant"
//  新建聊天: onClick → reset(); setActiveView("chat")
//  分组"模块": MODULES.map → 项(icon + label[lang]) onClick=setActiveView(id); active 高亮
//  底部: 角色段(员工/管理者) + 语言(EN/中)
//  collapsed 时: 仅图标, label 隐藏, 宽度收窄
```

- [ ] **Step 2: 构建通过**　Run: `npm run build`　Expected: PASS
- [ ] **Step 3: Commit**

```bash
git add src/shell/Sidebar.tsx
git commit -m "feat(shell): 可折叠 Sidebar(新建聊天 + 模块 + 角色/语言)"
```

---

### Task 7: App 壳组装 + 样式

**Files:**
- Modify: `src/App.tsx`、`src/main.tsx`（包 `ChatProvider`）、`src/styles.css`

**Interfaces:**
- Consumes：全部上面组件。
- Produces：`<App/>` = `<Sidebar/> + <Main/>`；Main 按 `activeView`：`chat`→ `hasStarted? <Chat/> : <Home/>`；模块→ 对应 Page。

- [ ] **Step 1: main.tsx 包 ChatProvider**

```tsx
// <AppStoreProvider><ChatProvider><App/></ChatProvider></AppStoreProvider>
```

- [ ] **Step 2: App.tsx 组装**

```tsx
// const { activeView } = useStore(); const { hasStarted } = useChat();
// <div class="shell"><Sidebar/><main class="content">
//   {activeView==="chat" ? (hasStarted ? <Chat/> : <Home/>)
//    : activeView==="attendance" ? <AttendancePage/> : ... }
// </main><Toasts/></div>
```

- [ ] **Step 3: styles.css**——增 `.shell`(flex 行) / `.sidebar`(宽度 + collapsed 收窄) / `.side-item`(active 态) / `.home`(居中大问候) / `.composer.home`(居中大号) / `.res-*`(资源页标题/区块/统计tile/表格) / `.res-shortcuts`(快捷入口 chips)。沿用 BIPO 配色与现有卡片样式。

- [ ] **Step 4: 构建通过**　Run: `npm run build`　Expected: PASS
- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx src/styles.css
git commit -m "feat(shell): App = Sidebar + Main(按 activeView), 壳样式"
```

---

### Task 8: 端到端验证 + 部署

**Files:** 无（验证 + push）

- [ ] **Step 1: 构建**　Run: `npm run build`　Expected: PASS
- [ ] **Step 2: dev + Playwright 冒烟**——`npm run dev`，浏览器验证：
  - 默认进 AI 对话 Home（大问候 + 输入 + 建议）；发一条 → 切到 Chat 线程 + A2UI 卡片。
  - 侧栏点 4 个模块 → 各资源页渲染 mock 数据；切 EE/ER → 内容变。
  - 资源页本地功能(打卡/申请/新建)弹卡 + 提示；快捷入口 → 跳聊天并自动发送。
  - 折叠侧栏正常；语音按住浮层正常（浏览器）。
- [ ] **Step 3: Commit（若验证中有微调）+ Push**

```bash
git push origin main   # 触发 GitHub Pages 部署
```

- [ ] **Step 4: 部署校验**　Pages 跑绿后开 `https://skywang01.github.io/bipo-teams-assistant/` 复验；Teams 内 Reload Tab（无需重传 zip）。

---

## Self-Review（对照 spec）

- 覆盖：默认Home✓(T3/T7) 4资源页✓(T5) 角色随变✓(T4/T5) 本地功能✓(T5) 快捷入口跳聊天✓(T1 seedChat + T3 consumeSeed + T5) 折叠侧栏✓(T6/T7) 复用卡片✓(T5) 不做历史✓ 全mock✓。
- 类型一致：`ViewId`(store) 贯穿 hcmModules/App；`seedChat/consumeSeed` 定义于 store(T1)、用于 T5/T3；`useChat` 定义 T1、用于 T2/T3/T7。
- 无占位：各任务给出关键代码骨架与签名；组件内部细节在执行时按骨架补全（本仓库无单测，验证走 build+Playwright）。
