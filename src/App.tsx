// Shell：单一入口 = 一个 chat 对话 Agent。顶部有角色切换(EE/ER)与语言切换；
// 主体是 Chatbot。ER 的“大盘/daily/审批”都以对话内 A2UI 卡片呈现，不另设页面。

import { useStore } from "./state/store";
import { Chatbot } from "./chat/Chatbot";
import { isInTeams } from "./teams/teamsCtx";
import { t } from "./i18n";

export function App() {
  const { role, setRole, lang, switchLang, toasts } = useStore();

  // 在 Teams 宿主内：Teams 标签栏已显示 app 名+图标，隐藏我们自己的品牌块避免重复；
  // 独立访问(浏览器/Pages)：保留完整品牌块。角色/语言控件两种情况都保留。
  const inTeams = isInTeams();

  return (
    <div className="app">
      <header className="topbar">
        {inTeams ? (
          <div className="brand-slim" />
        ) : (
          <div className="brand">
            <div className="logo">B</div>
            <div>
              <div className="name">{t("appName")}</div>
              <div className="sub">{t("online")}</div>
            </div>
          </div>
        )}
        <div className="controls">
          <div className="role-seg" role="tablist" aria-label={t("switchRole")}>
            <button className={role === "ee" ? "on" : ""} onClick={() => setRole("ee")}>
              {t("roleEE")}
            </button>
            <button className={role === "manager" ? "on" : ""} onClick={() => setRole("manager")}>
              {t("roleER")}
            </button>
          </div>
          <button className="lang" onClick={switchLang} title="EN / 中文">
            {lang === "en" ? "EN" : "中"}
          </button>
        </div>
      </header>

      {/* key=role：切角色时重挂载聊天，天然隔离历史/会话 */}
      <Chatbot key={role} />

      <div className="toasts">
        {toasts.map((x) => (
          <div className="toast" key={x.id}>
            {x.text}
          </div>
        ))}
      </div>
    </div>
  );
}
