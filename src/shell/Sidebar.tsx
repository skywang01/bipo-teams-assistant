// 可折叠侧边栏: 折叠钮 + (非Teams)品牌 + 新建聊天 + HCM 模块(按角色高亮/切换) + 角色/语言。
import { useStore } from "../state/store";
import { useChat } from "../state/chat";
import { MODULES } from "../hcm/hcmModules";
import { t } from "../i18n";

export function Sidebar() {
  const { activeView, setActiveView, collapsed, toggleCollapsed, role, setRole, lang, switchLang } = useStore();
  const { reset } = useChat();

  const newChat = () => { reset(); setActiveView("chat"); };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* 顶部金色 banner(对齐 HCM "BIPO" 金头) */}
      <div className="side-top">
        <div className="side-brand">
          <span className="side-name">
            {collapsed ? "B" : <>BIPO<span className="sub">{lang === "zh" ? "助手" : "Assistant"}</span></>}
          </span>
        </div>
        <button className="side-collapse" onClick={toggleCollapsed} aria-label="toggle">
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <button className={`side-newchat ${activeView === "chat" ? "on" : ""}`} onClick={newChat} title={t("newChat")}>
        <span className="ic">🏠</span>{!collapsed && <span>{t("newChat")}</span>}
      </button>

      <div className="side-group">
        {!collapsed && <div className="side-group-label">{t("modules")}</div>}
        {MODULES.map((m) => (
          <button
            key={m.id}
            className={`side-item ${activeView === m.id ? "on" : ""}`}
            onClick={() => setActiveView(m.id)}
            title={m.label[lang]}
          >
            <span className="ic">{m.icon}</span>
            {!collapsed && <span>{m.label[lang]}</span>}
          </button>
        ))}
      </div>

      <div className="side-foot">
        {!collapsed ? (
          <>
            <div className="role-seg">
              <button className={role === "ee" ? "on" : ""} onClick={() => setRole("ee")}>{t("roleEE")}</button>
              <button className={role === "manager" ? "on" : ""} onClick={() => setRole("manager")}>{t("roleER")}</button>
            </div>
            <button className="lang" onClick={switchLang}>{lang === "en" ? "EN" : "中"}</button>
          </>
        ) : (
          <button className="lang" onClick={switchLang} title="EN/中">{lang === "en" ? "EN" : "中"}</button>
        )}
      </div>
    </aside>
  );
}
