// AI 对话着陆(空态): 大问候 + 居中输入 + 建议 chips。建议随角色/语言变。
// 由 Chat 在无消息时渲染; 发送/点建议后 Chat 自动切到线程态。

import { useChat } from "../state/chat";
import { useStore } from "../state/store";
import { Composer } from "../chat/Composer";
import { t } from "../i18n";
import type { Lang } from "../i18n";
import type { Role } from "../ai/types";

const SUGGEST: Record<Role, Record<Lang, string[]>> = {
  ee: {
    zh: ["我要打卡", "申请明天 19:00-21:00 OT", "请下周三年假一天", "报销昨天打车 68 元", "查上月工资单"],
    en: ["Clock me in", "File OT tomorrow 19:00-21:00", "Request annual leave next Wed", "Reimburse taxi expense", "Show last month's payslip"],
  },
  manager: {
    zh: ["有哪些待审批 OT", "看今天的出勤 daily", "有待审批的休假吗", "做个研发部 OT 大盘", "研发部谁 OT 最多"],
    en: ["Pending OT approvals", "Today's attendance (daily)", "Pending leave approvals", "Build an R&D OT dashboard", "Who has the most OT?"],
  },
};

export function Home() {
  const { role, lang } = useStore();
  const { send } = useChat();
  return (
    <div className="home">
      <div className="home-inner">
        <h1 className="home-greet">{t("homeGreet")}</h1>
        <Composer variant="home" />
        <div className="sug">
          {SUGGEST[role][lang].map((q) => (
            <span className="q" key={q} onClick={() => void send(q)}>
              {q}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
