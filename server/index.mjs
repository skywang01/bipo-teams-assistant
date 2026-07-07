// 生产 BFF —— 替代 Vite dev proxy。托管前端 dist + 把 /api/* 转发到 bipo-ai-service,
// 并在服务端注入 x-service-key(前端不持密钥)。real 模式下 chat / STT(/api/stt) 皆真。
//
// 环境变量:
//   BIPO_TARGET        真实 service 基址(如 https://bipo-ai-test.bipocloud.com)
//   BIPO_SERVICE_KEY   Service Key(仅服务端, 注入 x-service-key)
//   PORT               监听端口(默认 8080)
//
// 前端需以 real 模式、根路径构建: VITE_AGENT_MODE=real VITE_BASE=/ npm run build
// 详见 server/README.md。

import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "../dist");
const TARGET = process.env.BIPO_TARGET || "http://localhost:8000";
const KEY = process.env.BIPO_SERVICE_KEY || "";
const PORT = process.env.PORT || 8080;

const app = express();

// /api/* → bipo-ai-service(注入 service-key; SSE 流式默认透传)
// 用 pathFilter 且挂在根路径, 保留完整 /api 前缀(挂 app.use("/api",…) 会被 Express 剥掉前缀 → 后端 404/405)。
app.use(
  createProxyMiddleware({
    pathFilter: "/api",
    target: TARGET,
    changeOrigin: true,
    secure: false,
    on: {
      proxyReq: (proxyReq) => {
        if (KEY) proxyReq.setHeader("x-service-key", KEY);
      },
    },
  }),
);

// 静态前端 + SPA 兜底
app.use(express.static(DIST));
app.get("*", (_req, res) => res.sendFile(path.join(DIST, "index.html")));

app.listen(PORT, () => {
  console.log(`BIPO Assistant BFF on :${PORT} → proxy /api → ${TARGET} (service-key ${KEY ? "set" : "MISSING"})`);
});
