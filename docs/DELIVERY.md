# 交付说明 · BIPO Assistant（Teams）

## 当前交付物（阶段0：本地可跑）

- React Tab（chat 单一入口 + 全部 EE/ER A2UI 卡片 + HITL），浏览器直接可 demo。
- 引擎单一接缝：默认 `MockEngine`（离线）；`VITE_AGENT_MODE=real` 接真实 `bipo-ai-service`。
- Bot sample（出站审批卡片）。
- Teams manifest + 图标（占位符待替换）。
- 已验证：`npm run build` 通过；浏览器实测 EE 打卡/OT 的 HITL 全链路、ER 待审批 OT 卡片。

## 后端就绪度（务必对客户/团队讲清）

✅ 直连真实 agent：打卡 / OT 申请 / 休假申请 / 批量审批OT / 大盘看板。
⚠️ 先做完整 UI + 占位（待后端工具）：报销 / 工资单 / 今日daily / 批量审批休假。
  - 卡片标注「占位数据 · 待接后端工具」。补齐方式：新增对应 HRMS MCP 工具 +
    `docs/prompts` 片段（让真实 agent 输出对应 ```a2ui``` 块）。engine/UI 零改。

## 上 Teams 计划（0 → 4）

```
阶段0 · 本地可跑(浏览器)            [已完成]
  React Tab + 真实 bipo-ai-service(proxy) 全功能走查, 无需 Teams 环境

阶段1 · Teams 侧载自测             [1–2 天]
  · 生成 Teams App GUID + 注册 Bot(Azure) 得 BotId
  · dev tunnel/ngrok 暴露 HTTPS → 填 manifest 的 contentUrl/validDomains
  · npm run pack:manifest → “上传自定义应用” → 桌面/网页端验证 Tab + Bot

阶段2 · SSO 静默登录接入           [2–4 天]
  · 注册多租户 Entra app(client_id / api://.../access_as_user / 预授权Teams客户端)
  · manifest.webApplicationInfo 填真实值
  · getEntraToken()(teams-js) → BFF 做 Token Exchange 到你们 IDP
    (对齐 /Users/sky/hcm-platform-integration/teams-hcm-sso-design.md)
  · 生产用 BFF 替代 Vite proxy：持 service key + 注 X-HRMS-* + 校 aud/iss
  · 去掉客户端硬编码账号，走真实用户身份 → HRMS

阶段3 · 组织内灰度                 [按客户]
  · 管理员在 Teams 管理中心上传到组织应用目录 + 安装/固定策略
  · 种子客户 admin consent(回调捕获 tid) → tid→companyCode 登记

阶段4 · 公开商店上架               [审核周期]
  · Partner Center 提交：隐私政策/服务条款 URL、商店校验、M365 认证(建议)
```

## 阶段1B · GitHub Pages 免隧道部署（推荐给快速演示）

不想开隧道时，把前端（Mock 模式）部署到 GitHub Pages，contentUrl 指过去即可，Teams 直接加载。

```
1. 建一个 public repo，push 本项目
2. repo Settings → Pages → Source 选 "GitHub Actions"
   (.github/workflows/deploy-pages.yml 已内置：Mock 构建 + base 自动=/<repo>/ + 部署)
3. Actions 跑完 → 得到 https://<用户>.github.io/<repo>/
4. 本地: bash scripts/pack-pages.sh https://<用户>.github.io/<repo>/
   → 生成 bipo-assistant.manifest.zip
5. M365 开发者租户 Teams → 应用 → 管理你的应用 → 上传自定义应用 → 选 zip
```

要点：
- Pages 是纯静态 → 只能 **Mock 模式**（UI/卡片/HITL 全可演示）。接真实后端需另配线上 BFF。
- 关键坑：`vite base` 必须 = `/<repo>/`（工作流已自动处理），否则资源 404 白屏。
- public repo → 确认无密钥入库（`.env.local` 已 gitignore；Mock 构建本就无 key）。
- 稳定地址、无隧道；改代码 push 后 Actions 自动重部署。

## 生产鉴权（重要）

```
本 POC(dev): 浏览器 → Vite proxy(注 x-service-key) → bipo-ai-service
             ✅ 免 CORS / key 不进浏览器；❌ 仅供开发, 无真实用户身份

生产:        浏览器(Tab) → 你们 BFF → bipo-ai-service
             BFF 职责: 持 service key + Teams SSO Token Exchange 得用户身份
                      + 注入 X-HRMS-* 透传 + 校验 aud/iss
             → 真实用户身份进 HRMS, 且 key 不泄露
```

## 依赖 / 前置（阶段1 起）

- 一个多租户 Entra 应用注册（阶段2 SSO）。
- 一个可公网 HTTPS 承载 Tab 静态资源 + BFF 的部署环境（替代 dev proxy）。
- Azure Bot 注册（Bot sample 上 Teams 时）。

## 风险清单

1. ⚠️ 新功能后端缺口（报销/工资单/daily/休假批量）——UI 已完整，待后端工具。
2. 生产必须用 BFF 替代 dev proxy（否则 key 泄露 / 无真实身份）。
3. HRMS 身份透传：从小程序的客户端硬编码账号 → 移到 BFF 用真实用户身份。
4. agent prompt 是双向契约：卡片字段增改必须同步 `docs/prompts`。
5. Teams 加载 Tab 必需公网 HTTPS（dev tunnel）。
```
