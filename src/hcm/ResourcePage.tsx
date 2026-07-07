// 资源页通用骨架: 标题栏 + "让 AI 代办"快捷入口栏(点击 seedChat 跳聊天) + 内容区。
import type { ReactNode } from "react";
import { useStore } from "../state/store";
import type { Shortcut } from "./hcmModules";

export function ResourcePage({
  icon,
  title,
  shortcuts,
  children,
}: {
  icon: string;
  title: string;
  shortcuts: Shortcut[];
  children: ReactNode;
}) {
  const { seedChat, lang } = useStore();
  return (
    <div className="res">
      <div className="res-head">
        <span className="res-ic">{icon}</span>
        <h2>{title}</h2>
      </div>
      {shortcuts.length > 0 && (
        <div className="res-shortcuts">
          <span className="res-sc-label">{lang === "zh" ? "让 AI 代办：" : "Ask AI:"}</span>
          {shortcuts.map((s) => (
            <button key={s.prompt} className="res-sc" onClick={() => seedChat(s.prompt)}>
              {s.label[lang]}
            </button>
          ))}
        </div>
      )}
      <div className="res-body">{children}</div>
    </div>
  );
}

// 统计块(通用小组件)
export function StatTiles({ tiles }: { tiles: { label: string; value: string; danger?: boolean }[] }) {
  return (
    <div className="res-tiles">
      {tiles.map((t) => (
        <div className="res-tile" key={t.label}>
          <div className="l">{t.label}</div>
          <div className="v" style={t.danger ? { color: "var(--red)" } : undefined}>
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// 区块标题
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="res-section">
      <div className="res-section-h">{title}</div>
      {children}
    </div>
  );
}
