// Teams 适配层（脚手架）。
// - 若运行在 Teams 宿主内：初始化 teams-js，并（阶段2）用 getAuthToken() 静默取 Entra 令牌，
//   交由 BFF 做 Token Exchange 到你们 IDP（对齐 hcm-platform-integration/teams-hcm-sso-design.md）。
// - 若运行在普通浏览器（本地 dev / demo）：优雅降级，不阻塞渲染。
//
// 本 POC 的后端鉴权走 service-key 代理，SSO 仅用于“身份识别”，故此处只做初始化 + 令牌获取脚手架，
// 真正的 Token Exchange 在阶段2 的 BFF 落地。

import { app, authentication } from "@microsoft/teams-js";

export interface TeamsBoot {
  inTeams: boolean;
  context?: app.Context;
}

// 尝试初始化 Teams SDK；非 Teams 环境返回 inTeams:false，不抛错。
export async function bootTeams(): Promise<TeamsBoot> {
  try {
    await app.initialize();
    const context = await app.getContext();
    app.notifySuccess();
    return { inTeams: true, context };
  } catch {
    return { inTeams: false };
  }
}

// 阶段2 用：静默取 Entra 令牌（getAuthToken）。当前仅脚手架，失败返回 null。
export async function getEntraToken(): Promise<string | null> {
  try {
    const token = await authentication.getAuthToken();
    return token ?? null;
  } catch {
    return null;
  }
}
