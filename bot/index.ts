// BIPO Assistant · Bot sample（出站能力演示）
// ----------------------------------------------------------------------------
// 这是一个最小 Bot Framework bot，仅用于演示 Teams 里“出站/主动推送”的能力：
// 收到任意消息 → 回一张 OT 审批 Adaptive Card；用户点“批准/驳回”→ 回确认。
// 它不复刻 Tab 里的全部对话能力（那是 Tab 网页聊天的职责），只作 sample。
//
// 与主方案的关系：
//   Tab(主) = 富交互对话 + A2UI 卡片（入站登录 + 全功能）
//   Bot(本 sample) = 主动通知/审批推送（出站），如“你有 1 笔待审批 OT”
//
// 运行：
//   cd bot && npm install && npm run dev
//   用 Bot Framework Emulator 连 http://localhost:3978/api/messages，或在 Teams 侧载。
// 需要环境变量（Azure Bot 注册后获得）：MicrosoftAppId / MicrosoftAppPassword。

import * as restify from "restify";
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  ActivityHandler,
  CardFactory,
  TurnContext,
  MessageFactory,
} from "botbuilder";

// ---- 一张 OT 审批 Adaptive Card（示例）----
function otApprovalCard() {
  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "📝 待审批 OT", weight: "Bolder", size: "Medium", color: "Accent" },
      {
        type: "FactSet",
        facts: [
          { title: "申请人", value: "张三 Zhang San" },
          { title: "部门", value: "研发 R&D" },
          { title: "日期", value: "2026-07-12" },
          { title: "时长", value: "4 小时" },
          { title: "事由", value: "版本上线保障" },
        ],
      },
      { type: "TextBlock", text: "⚠️ 本周 OT 已达 18h，接近上限 20h", wrap: true, color: "Warning", size: "Small" },
    ],
    actions: [
      { type: "Action.Submit", title: "✓ 批准", style: "positive", data: { verb: "approve", id: "ot-zs" } },
      { type: "Action.Submit", title: "驳回", data: { verb: "reject", id: "ot-zs" } },
    ],
  });
}

class AssistantBot extends ActivityHandler {
  constructor() {
    super();

    // 任意消息 → 推一张审批卡（演示主动/出站）
    this.onMessage(async (context: TurnContext, next) => {
      await context.sendActivity(MessageFactory.text("你有 1 笔待审批 OT，请处理："));
      await context.sendActivity(MessageFactory.attachment(otApprovalCard()));
      await next();
    });

    // 新成员加入 → 欢迎
    this.onMembersAdded(async (context, next) => {
      await context.sendActivity("👋 我是 BIPO Assistant 通知助手。发任意消息试试审批卡片。完整功能请打开 Assistant 标签页。");
      await next();
    });
  }

  // 处理 Adaptive Card 的 Action.Submit（批准/驳回）
  async onAdaptiveCardInvoke(context: TurnContext, invokeValue: any) {
    const verb = invokeValue?.action?.data?.verb;
    const text = verb === "approve" ? "✅ 已批准张三的 OT，已通知申请人。" : "已驳回张三的 OT。";
    await context.sendActivity(text);
    return { statusCode: 200, type: "application/vnd.microsoft.activity.message", value: text };
  }
}

// ---- restify server ----
const auth = new ConfigurationBotFrameworkAuthentication(process.env as any);
const adapter = new CloudAdapter(auth);
adapter.onTurnError = async (context, error) => {
  console.error("[onTurnError]", error);
  await context.sendActivity("抱歉，出错了。");
};

const bot = new AssistantBot();
const server = restify.createServer();
server.use(restify.plugins.bodyParser());
server.listen(process.env.PORT || 3978, () => {
  console.log(`Bot sample listening on ${server.url}/api/messages`);
});
server.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});
