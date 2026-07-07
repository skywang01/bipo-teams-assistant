# BIPO Assistant · Teams App

单一入口 = **一个 chat 对话 Agent**。员工(EE)与管理者(ER)都通过对话 + 内联 A2UI 卡片
完成 HCM 事务，而非传统菜单/表单。**Tab 网页聊天为主 + 一个 Bot sample**，接真实 `bipo-ai-service`。

> 参考自 `/Users/sky/workspace/TNA-POC`（微信小程序版），复用其 `AIEngine` 单一接缝、
> A2UI 卡片模型与真实接入协议。Teams Tab 本质就是 Web 应用。

```
入口(单一) ── chat 对话 ──┬── EE: 打卡 / OT / 休假 / 报销 / 工资单
                          └── ER: 批量审批OT / 批量审批休假 / 今日daily / 大盘看板
                                     ↓ 全部以内联 A2UI 卡片呈现, 写操作走 HITL
```

## 快速开始

```bash
npm install
cp .env.local.example .env.local     # 接真实后端时填（见下）；不填则默认离线 mock
npm run dev                          # http://localhost:5180 （浏览器直接可看，无需 Teams）
```

- **默认离线**：不配 `.env.local` → 走 `MockEngine`（脚本化 demo），全部功能可点。
- **接真实后端**：`.env.local` 设 `VITE_AGENT_MODE=real` + `BIPO_TARGET` + `BIPO_SERVICE_KEY`
  （可直接复用 TNA-POC 的同名值）。Vite 代理服务端注入 `x-service-key`，**免 CORS、key 不进浏览器**。

## 架构（一个接缝，传输可换）

```
Chatbot ──engine.invoke(input, {role})──▶ AIEngine
                                          ├─ MockEngine   (VITE_AGENT_MODE≠real, 脚本 demo)
                                          └─ BipoAgentEngine (real): /api/agents/{id}/invoke
                                             JSON-RPC/SSE, [device_now] marker, 解析 ```a2ui``` 块
A2UI 卡片(agent_output) ── HITL: pending卡 → 确认消息 → agent 调工具 → 成功回流
```

- **A2UI 零后端注册**：agent 在回复里内嵌 ` ```a2ui {json}``` `，前端解析成卡片。
- **HITL 铁律**：任何写操作走 `卡片确认 → 结构化消息 → 工具调用`，前端绝不直接写 HRMS。
- **角色隔离**：EE/ER 的会话/历史隔离（App 以 `key=role` 重挂载 + 引擎 session 按角色分桶）。

## 功能 → 卡片 → 后端就绪度（如实）

真实 `attendance-ai` agent **现有支持**：`ot_breakdown / ot_approval / generated_dashboard /
proactive` + 工具 `clock_punch / submit_ot_request / submit_leave_request / approve_ot_request`。

| 角色 | 功能 | A2UI 卡片 | 后端就绪度 |
|---|---|---|---|
| EE | 打卡 | `clock_punch` | ✅ 有工具 |
| EE | OT 申请 | `ot_request` | ✅ 有工具 + prompt |
| EE | 休假申请 | `leave_request` | ✅ 有工具 + prompt |
| EE | 报销 | `reimbursement` | ⚠️ UI 完整 + 占位，待接后端工具 |
| EE | 工资单 | `payslip` | ⚠️ UI 完整 + 占位，待接后端工具 |
| ER | 批量审批 OT | `ot_pending_list` | ✅ 有 `approve_ot_request` |
| ER | 大盘看板 | `generated_dashboard` | ✅ 有 + charts 契约 |
| ER | 今日 daily | `daily_attendance` | ⚠️ UI 完整 + 占位，待接 daily 查询工具 |
| ER | 批量审批休假 | `leave_pending_list` | ⚠️ UI 完整 + 占位，待接休假审批工具 |

> ⚠️ 项卡片以占位数据渲染并标注「占位数据 · 待接后端工具」；engine 层不变，工具就绪后零 UI 改动即生效。
> 新增卡片需同步 `docs/prompts` 片段（agent 侧契约的另一半）。

## Bot sample

`bot/` 是最小 Bot Framework bot，演示**出站/主动推送**（一张 OT 审批 Adaptive Card）。
仅作能力示例，不复刻 Tab 的全部对话。运行见 `bot/`（需 Azure Bot 注册的 AppId/Password）。

## Teams 集成 / 上架

见 `manifest/README.md`（占位符替换 + 打包侧载）与 `docs/DELIVERY.md`（0→4 阶段上架计划、
生产鉴权 BFF、SSO 接入）。

```
目录:
├── src/            React Tab（chat + A2UI 卡片 + engine 接缝 + teams-js）
├── manifest/       Teams 应用包（manifest.json + 图标）
├── bot/            Bot sample（出站通知示例）
├── docs/DELIVERY.md 交付说明 + 上架计划
└── vite.config.ts  同源代理（注入 service key，仅 dev）
```
