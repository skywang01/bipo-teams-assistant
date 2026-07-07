# 设计：BIPO Assistant → Copilot 式 HCM Shell（AI 对话 + 资源页）

日期：2026-07-07
状态：已通过头脑风暴，待用户复核

## Context（为什么）

当前 BIPO Assistant 只有一个对话框，功能单一。目标是参考 M365 Copilot，把它改造成一个
**HCM 应用外壳**：可折叠左侧边栏 + 主区；默认落地是 AI 对话 Home（可跨域执行全部 HCM 操作），
侧边栏另有若干 **HCM 资源页**（展示该域数据 + 功能，mock），资源页可"快捷入口"跳回聊天让
Agent 代执行。保持现有 AI 对话、A2UI 卡片、HITL、语音、双语、EE/ER 角色、Teams/Pages 部署不变。

## 头脑风暴已定决策

1. **模块 = 独立资源页**（展示数据 + 功能，mock 数据），**不复用聊天线程**。
2. 首批 4 个模块：**Attendance / Leave / Claim / Payroll**。
3. **默认落地页 = AI 对话 Home**，可跨域执行全部资源操作。
4. 资源页带**快捷入口**：点击可跳到聊天并预置 prompt，让 Agent 代执行（唯一的页→聊天桥）。
5. **保留 EE/ER 角色**，资源页内容随角色变。
6. **不做聊天历史列表**（仅"新建聊天"回 Home）。
7. 资源页数据前期全 **mock**；不接真实后端。

## 架构

```
┌─────────────┬──────────────────────────────────────┐
│ Sidebar     │  Main = 按 activeView 渲染其一         │
│ ✎ 新建聊天   │   · "chat"      → Home/对话(AI Agent)  │
│ ─ 模块 ─     │   · "attendance"→ 考勤资源页           │
│ 🕐 Attendance│   · "leave"     → 休假资源页           │
│ 🌴 Leave    │   · "claim"     → 报销资源页           │
│ 🧾 Claim    │   · "payroll"   → 薪资资源页           │
│ 💰 Payroll  │                                        │
│ ─────────── │                                        │
│ 员工/管理者  │  (折叠时侧栏只剩图标)                  │
│ EN/中       │                                        │
└─────────────┴──────────────────────────────────────┘
```

## 组件设计

```
新增
  shell/Sidebar.tsx        可折叠导航: 新建聊天 + 模块列表(按角色) + 角色/语言
  views/Home.tsx           AI 对话着陆: 大问候 + 居中输入 + 建议 chips
  views/Chat.tsx           对话线程(由现 Chatbot 抽出, 只管消息流 + 底部输入)
  chat/Composer.tsx        输入组件(＋/文本/🎤/↑), Home 与 Chat 共用
  modules/AttendancePage.tsx / LeavePage.tsx / ClaimPage.tsx / PayrollPage.tsx
  modules/ResourcePage.tsx 资源页通用骨架(标题 + 区块 + 快捷入口栏)
  data/hcmMock.ts          4 域的 mock 数据(按角色)
  hcmModules.ts            模块配置(id/图标/标签/角色可见/快捷入口 prompt)

改造
  App.tsx                  = Sidebar + Main(switch activeView)
  state/store.tsx          增 activeView / collapsed; 会话状态提升为共享
  ChatProvider(新)          持有会话(entries/streaming/send/reset/session),
                           Home 与 Chat 共享; 从 Home 发送即入会话并切到 chat 视图

复用(不动内部)
  ai/*(engine/BipoAgentEngine/MockEngine/scripts) · a2ui/components ·
  chat/useSpeech · i18n · roles
```

## 状态与数据流

```
store: { role, lang, activeView, collapsed, toast }
ChatProvider: { entries, streaming, send(text), reset(), sessionId }

默认            activeView="chat" → Home(空会话)
点侧栏模块      activeView=<module> → 渲染该资源页(读 hcmMock, 按 role)
新建聊天        reset() + activeView="chat" → 回 Home
资源页快捷入口  seedChat(prompt): send(prompt) + activeView="chat"  ← 唯一"页→聊天"桥
Home 首次发送   send(text) → 追加会话 + activeView 保持 chat(Home 与 Chat 同属 chat 视图,
               有消息即从"大问候态"切到"线程态")
```

## 资源页内容（mock，按角色）

复用 A2UI 卡片组件直接渲染（不经聊天）：`payslip / daily_attendance / leave_pending_list /
clock_punch / reimbursement / ot_pending_list`，加少量列表/统计块。

```
🕐 Attendance
   EE: 今日打卡状态 + [打卡]  · 本月考勤记录(表) · 出勤/迟到/OT 统计
       快捷入口→聊天: "帮我打卡" / "申请OT"
   ER: 今日团队 daily(出勤/迟到/缺勤) · 异常提醒 · OT 大盘
       快捷入口→聊天: "看今天出勤" / "做个OT大盘"
🌴 Leave
   EE: 假期余额 · 我的申请列表 · [申请休假]
       快捷入口→聊天: "帮我请假"
   ER: 待审批休假(逐条/批量) · 团队休假概览
       快捷入口→聊天: "批量审批休假"
🧾 Claim
   EE: 我的报销单列表(状态/金额) · [新建报销] · 额度统计
       快捷入口→聊天: "帮我报销"
   ER: 待审批报销列表 · 部门报销统计
💰 Payroll
   EE: 最新工资单(明细) · 历史工资单列表
       快捷入口→聊天: "查工资单"
   ER: 发薪概览(总额/人数/趋势)
```

- 资源页内的**本地功能**（打卡/申请/新建/审批）= 页面内 mock 动作（弹表单卡 → 成功提示），不跳聊天。
- **快捷入口** = 跳到聊天并 `send(prompt)`，让 Agent 代执行（走现有 engine/HITL）。

## 保持不变

- 接真实 bipo-ai-service / Mock 引擎切换（engine 接缝不动）。
- A2UI 卡片全套、HITL、语音、Teams 品牌去重、GitHub Pages 部署、双语、EE/ER。
- manifest / 侧载流程不变（本次纯前端内容改动，Reload Tab 即生效，无需重传 zip）。

## 非目标（YAGNI）

- 不做聊天历史列表 / 多线程持久化。
- 资源页不接真实后端（全 mock）。
- 不做 Life Cycle / Personnel 模块（本批只 4 个）。
- 不改鉴权（生产 BFF / SSO 仍属后续阶段）。

## 验证

1. `npm run dev` 浏览器：默认进 AI 对话 Home；侧栏点 4 个模块分别渲染对应资源页(mock)。
2. 切 EE/ER：各资源页内容随角色变。
3. 资源页本地功能：打卡/申请/新建/审批 → 弹卡 → 成功提示（mock）。
4. 快捷入口：点击 → 跳到聊天并自动发出 prompt → Agent 走现有流程（mock/真实）。
5. 折叠侧栏：展开↔图标栏正常。
6. 语音/双语/A2UI/HITL 回归正常。
7. `npm run build` 通过；push → Pages 自动部署；Teams Reload Tab 生效。
```
