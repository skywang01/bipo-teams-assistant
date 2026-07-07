// 后端寻址 + 前端侧鉴权。两种形态,同一套代码:
//
//   ① 同源代理(dev 的 Vite proxy / 生产 BFF)
//        VITE_BIPO_BASE_URL 空, VITE_BIPO_SERVICE_KEY 空
//        → 前端调 /api/*(同源), 代理在服务端注入 x-service-key。key 不进浏览器。
//
//   ② 浏览器直连后端(需后端开 CORS 放行本域名 —— 像小程序的"合法域名")
//        VITE_BIPO_BASE_URL=https://bipo-ai-test.bipocloud.com
//        VITE_BIPO_SERVICE_KEY=sk_xxx
//        → 前端直接调绝对 URL 并带上 x-service-key 头。
//        ⚠️ 此模式下 SERVICE_KEY 会被打进浏览器 bundle(任何人可读) → 仅 POC 用;
//           生产须换成 OAuth/用户令牌, 并轮换这个已暴露的 key。
//
// 未设这两个 env 时,行为与原来完全一致(同源 + 代理)。

export const API_BASE: string = import.meta.env.VITE_BIPO_BASE_URL || "";
const SERVICE_KEY: string = import.meta.env.VITE_BIPO_SERVICE_KEY || "";

/** 直连模式下附带 x-service-key;代理模式下为空(由代理注入)。 */
export function authHeaders(): Record<string, string> {
  return SERVICE_KEY ? { "x-service-key": SERVICE_KEY } : {};
}
