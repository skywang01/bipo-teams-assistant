// Shell：单一入口 = 一个 chat 对话 Agent。顶部有角色切换(EE/ER)与语言切换；
// 主体是 Chatbot。ER 的“大盘/daily/审批”都以对话内 A2UI 卡片呈现，不另设页面。

import { useStore } from "./state/store";
import { Chatbot } from "./chat/Chatbot";
import { t } from "./i18n";

export function App() {
  const { role, setRole, lang, switchLang, toasts } = useStore();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">✦</div>
          <div>
            <div className="name">{t("appName")}</div>
            <div className="sub">{t("online")}</div>
          </div>
        </div>
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
