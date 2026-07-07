// Shell: 可折叠 Sidebar + 主区(按 activeView 渲染)。
// activeView="chat" → Chat(内部空态渲染 Home, 有消息渲染线程); 其余 → 对应资源页。

import { useStore } from "./state/store";
import { Sidebar } from "./shell/Sidebar";
import { Chat } from "./views/Chat";
import { AttendancePage } from "./hcm/AttendancePage";
import { LeavePage } from "./hcm/LeavePage";
import { ClaimPage } from "./hcm/ClaimPage";
import { PayrollPage } from "./hcm/PayrollPage";

export function App() {
  const { activeView, toasts } = useStore();

  const main =
    activeView === "attendance" ? <AttendancePage /> :
    activeView === "leave" ? <LeavePage /> :
    activeView === "claim" ? <ClaimPage /> :
    activeView === "payroll" ? <PayrollPage /> :
    <Chat />;

  return (
    <div className="shell">
      <Sidebar />
      <main className="content">{main}</main>
      <div className="toasts">
        {toasts.map((x) => (
          <div className="toast" key={x.id}>{x.text}</div>
        ))}
      </div>
    </div>
  );
}
