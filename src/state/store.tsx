// 全局 store：引擎（单例）、角色（EE/ER）、语言重渲染、toasts。
// 角色切换会重置聊天会话（会话/历史按角色隔离，见 Chatbot / BipoAgentEngine）。

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Role } from "../ai/types";
import { getLang, onLangChange, setLang } from "../i18n";
import type { Lang } from "../i18n";

export type ViewId = "chat" | "attendance" | "leave" | "claim" | "payroll";

interface Store {
  role: Role;
  setRole: (r: Role) => void;
  lang: Lang;
  switchLang: () => void;
  toasts: { id: number; text: string }[];
  toast: (text: string) => void;
  activeView: ViewId;
  setActiveView: (v: ViewId) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  drawerOpen: boolean;      // 移动端: 侧栏改抽屉(off-canvas), 此为开合状态
  toggleDrawer: () => void;
  closeDrawer: () => void;
  seedText: string | null;
  seedChat: (t: string) => void;
  consumeSeed: () => string | null;
}

const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("ee");
  const [lang, setLangState] = useState<Lang>(getLang());
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [activeView, setActiveViewState] = useState<ViewId>("chat");
  // 桌面端默认展开侧栏; 移动端侧栏走抽屉(off-canvas), 由 CSS 隐藏, 与 collapsed 无关
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [seedText, setSeedText] = useState<string | null>(null);

  useEffect(() => onLangChange(() => setLangState(getLang())), []);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const switchLang = useCallback(() => setLang(getLang() === "en" ? "zh" : "en"), []);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((o) => !o), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  // 导航即关抽屉(移动端点菜单项后自动收起)
  const setActiveView = useCallback((v: ViewId) => { setActiveViewState(v); setDrawerOpen(false); }, []);
  const seedChat = useCallback((t: string) => { setSeedText(t); setActiveViewState("chat"); setDrawerOpen(false); }, []);
  const consumeSeed = useCallback(() => {
    let s: string | null = null;
    setSeedText((c) => { s = c; return null; });
    return s;
  }, []);

  const value: Store = {
    role, setRole, lang, switchLang, toasts, toast,
    activeView, setActiveView, collapsed, toggleCollapsed,
    drawerOpen, toggleDrawer, closeDrawer,
    seedText, seedChat, consumeSeed,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within AppStoreProvider");
  return s;
}
