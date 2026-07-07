# BIPO Assistant · 生产 BFF

GitHub Pages 是**纯静态 + mock 构建**:没有 `/api` 后端,语音走浏览器 Web Speech(Teams/手机 WebView 不支持 → 弹"Speech recognition isn't available here")。

本 BFF = 生产版的 Vite dev proxy:**托管前端 `dist` + 把 `/api/*` 转发到 bipo-ai-service 并在服务端注入 `x-service-key`**。以 real 模式部署后,**chat 与语音(/api/stt)皆真**,Teams/手机里录音可用。

```
浏览器/Teams Tab ──▶ BFF(本服务) ──▶ bipo-ai-service
  录音WAV/对话         注入 x-service-key      腾讯ASR / agent
  (不持密钥)           SSE 流式透传
```

## 部署步骤

```
1. 以 real 模式、根路径构建前端(在仓库根目录):
     VITE_AGENT_MODE=real VITE_BASE=/ npm run build
   → 产出 dist/(BFF 会托管它)

2. 装 BFF 依赖:
     cd server && npm install

3. 配环境变量并启动:
     BIPO_TARGET=https://<你的 bipo-ai-service 基址> \
     BIPO_SERVICE_KEY=<service key> \
     PORT=8080 \
     npm start
   启动日志确认 "service-key set"(不能是 MISSING)。

4. 该服务需公网 HTTPS(Teams 加载 Tab 强制)。把它部署到你们的托管
   (与 bipo-ai-service 同环境最简单),再把 Teams manifest 的 contentUrl 指向它。
```

## 要点

- **密钥只在服务端**:`BIPO_SERVICE_KEY` 走环境变量,绝不进前端 bundle。
- **语言**:后端腾讯引擎为 `16k_zh`(中文)。英文语音需 bipo-ai-service 侧按 lang 切 `16k_en`。
- **麦克风**:Teams 里首次录音需 manifest 增 `"devicePermissions": ["media"]`(改后重打 zip 重传)。
- **依赖**:仅 `express` + `http-proxy-middleware`,SSE 默认透传(chat 流式不受影响)。
- 本地可跑:`BIPO_TARGET`/`BIPO_SERVICE_KEY` 用 `/Users/sky/workspace/TNA-POC/.env.local` 里的值。
