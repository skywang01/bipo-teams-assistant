# Teams 应用包（manifest）

侧载/上架前，替换 `manifest.json` 里的占位符：

| 占位符 | 含义 | 从哪来 |
|---|---|---|
| `REPLACE_WITH_TEAMS_APP_GUID` | Teams 应用唯一 id（GUID） | 自己生成一个 GUID |
| `REPLACE_WITH_TAB_DOMAIN` | 承载 Tab 的公网 HTTPS 域名 | dev tunnel/ngrok 域名 或 生产部署域名 |
| `REPLACE_WITH_BOT_APP_GUID` | Bot 的 Microsoft App ID | Azure Bot 注册后获得 |
| `REPLACE_WITH_ENTRA_CLIENT_ID` | SSO 用的 Entra 应用 client id | Entra 应用注册（阶段2） |

> `webApplicationInfo` 是 SSO 预留；阶段2 接入静默登录时才需要真实值。
> 仅先侧载看 Tab/Bot，可暂时填一个占位 GUID（SSO 不生效但不影响加载）。

## 打包

```bash
# color.png / outline.png 已随包生成
cd manifest && zip -r ../bipo-assistant.manifest.zip manifest.json color.png outline.png
# 或在项目根：npm run pack:manifest
```

## 侧载

Teams → Apps → Manage your apps → Upload a custom app → 选 `bipo-assistant.manifest.zip`。

> Teams 加载 Tab 要求 **公网 HTTPS**。本地 `npm run dev`(5180) 需经 dev tunnel/ngrok 暴露，
> 并把该域名填进 `contentUrl` / `validDomains`。
