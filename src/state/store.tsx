// 全局 store：引擎（单例）、角色（EE/ER）、语言重渲染、toasts。
// 角色切换会重置聊天会话（会话/历史按角色隔离，见 Chatbot / BipoAgentEngine）。

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createEngine } from "../ai/engine";
import type { AIEngine, Role } from "../ai/types";
import { getLang, onLangChange, setLang } from "../i18n";
import type { Lang } from "../i18n";

interface Store {
  engine: AIEngine;
  role: Role;
  setRole: (r: Role) => void;
  lang: Lang;
  switchLang: () => void;
  toasts: { id: number; text: string }[];
  toast: (text: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => createEngine(), []);
  const [role, setRole] = useState<Role>("ee");
  const [lang, setLangState] = useState<Lang>(getLang());
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => onLangChange(() => setLangState(getLang())), []);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const switchLang = useCallback(() => setLang(getLang() === "en" ? "zh" : "en"), []);

  const value: Store = { engine, role, setRole, lang, switchLang, toasts, toast };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within AppStoreProvider");
  return s;
}
