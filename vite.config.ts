import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// 同源代理到 bipo-ai-service。浏览器只调 /api/...（与 SPA 同源），Vite 服务端转发到
// BIPO_TARGET —— 因此无 CORS，且鉴权头（x-service-key / Bearer）在此注入，
// 绝不进入前端 bundle。生产环境需用真正的 BFF 替代本 dev proxy（见 docs/DELIVERY.md）。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.BIPO_TARGET || "http://localhost:8000";
  const serviceKey = env.BIPO_SERVICE_KEY || "";
  const token = env.BIPO_TOKEN || "";

  const authHeaders: Record<string, string> | undefined = serviceKey
    ? { "x-service-key": serviceKey }
    : token
      ? { Authorization: `Bearer ${token}` }
      : undefined;

  return {
    // GitHub Pages 部署在子路径 /<repo>/ 下，静态资源需带此前缀。
    // 本地 dev 与自有域名部署保持根路径 "/"；Pages 构建时由 CI 传入 VITE_BASE。
    base: env.VITE_BASE || "/",
    plugins: [react()],
    server: {
      port: 5180,
      host: true,
      allowedHosts: true, // 允许 dev tunnel / ngrok 的公网域名（Teams 加载 Tab 必需）
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
          headers: authHeaders,
        },
      },
    },
  };
});
