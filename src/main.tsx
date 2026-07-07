import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppStoreProvider } from "./state/store";
import { ChatProvider } from "./state/chat";
import { bootTeams } from "./teams/teamsCtx";
import "./styles.css";

// 先尝试初始化 Teams SDK(在 Teams 宿主内); 普通浏览器优雅降级, 不阻塞渲染。
bootTeams().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppStoreProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </AppStoreProvider>
    </StrictMode>,
  );
});
