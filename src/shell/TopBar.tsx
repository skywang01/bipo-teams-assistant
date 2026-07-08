// 顶部 HCM 式靛蓝标题栏: 当前视图标题 + 搜索(=问AI, 跳聊天) + 区域徽标 + 用户/帮助。
import { useState } from "react";
import { useStore } from "../state/store";
import { MODULES } from "../hcm/hcmModules";
import { t } from "../i18n";

export function TopBar() {
  const { activeView, lang, seedChat, toggleDrawer } = useStore();
  const mod = MODULES.find((m) => m.id === activeView);
  const title = mod ? mod.label[lang] : t("appName");
  const [q, setQ] = useState("");

  const ask = () => {
    const v = q.trim();
    if (v) {
      seedChat(v); // 搜索即问 AI: 跳到聊天并发送
      setQ("");
    }
  };

  return (
    <div className="hbar">
      <button className="hbar-menu" onClick={toggleDrawer} aria-label={lang === "zh" ? "菜单" : "Menu"}>☰</button>
      <div className="hbar-title">{title}</div>
      <div className="hbar-right">
        <input
          className="hbar-search"
          placeholder={lang === "zh" ? "问我任何事…" : "Ask me anything…"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
        />
        <span className="hbar-badge">SG</span>
        <button className="hbar-ic" title={lang === "zh" ? "我的" : "Profile"}>👤</button>
        <button className="hbar-ic" title={lang === "zh" ? "帮助" : "Help"}>?</button>
      </div>
    </div>
  );
}
