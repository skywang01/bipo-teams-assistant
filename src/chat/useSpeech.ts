// 语音录入（参考小程序的"语音→文字"能力）。
// 用浏览器原生 Web Speech API（webkitSpeechRecognition），客户端识别，
// 无需后端/service key —— 静态 Pages 部署也能用。
// 说明：
//  · 支持度：Chromium 系(Chrome/Edge/Teams 桌面 WebView2)与 Safari 支持;不支持则隐藏麦克风。
//  · Teams 里用麦克风需宿主授予权限(首次会弹权限请求);若被 iframe 策略拦截, 浏览器 demo 仍可用。
//  · 与小程序的差异：小程序走 POST /api/stt(带 service key);此处纯前端, 更适合静态部署。

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";

export interface Speech {
  supported: boolean;
  listening: boolean;
  toggle: () => void;
}

export function useSpeech(lang: Lang, onText: (text: string) => void): Speech {
  const Rec = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;
  const supported = !!Rec;
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {}
    };
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    const rec = new Rec();
    rec.lang = lang === "zh" ? "zh-CN" : "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onTextRef.current(text); // 实时把识别文本填进输入框，用户可复核后发送
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [Rec, supported, lang]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  const toggle = useCallback(() => (listening ? stop() : start()), [listening, start, stop]);

  return { supported, listening, toggle };
}
