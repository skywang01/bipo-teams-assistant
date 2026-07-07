// 语音录入 —— 对齐小程序交互：按住说话、上滑取消、松开自动发送。
// 引擎用浏览器原生 Web Speech API（webkitSpeechRecognition），客户端识别，
// 无需后端/service key，静态 Pages 亦可用。
//
// 与小程序差异（如实）：小程序录音后 POST /api/stt(带 service key) 服务端识别；
// 此处交互一致(按住→松开发送)，但识别在浏览器本地完成，更适合静态部署。
// 若将来接线上 BFF，可把识别切回 /api/stt 模式与小程序完全一致。

import { useCallback, useRef, useState } from "react";
import type { Lang } from "../i18n";

export interface Speech {
  supported: boolean;
  recording: boolean;
  interim: string; // 实时识别文本（录音浮层展示）
  start: () => void; // 开始录音（按下）
  finish: () => void; // 松开：停止并发送
  cancel: () => void; // 上滑取消：停止并丢弃
}

export function useSpeech(lang: Lang, onFinal: (text: string) => void): Speech {
  const Rec = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;
  const supported = !!Rec;

  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const sendOnEndRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const start = useCallback(() => {
    if (!supported || recording) return;
    const rec = new Rec();
    rec.lang = lang === "zh" ? "zh-CN" : "en-US";
    rec.interimResults = true;
    rec.continuous = true; // 按住期间持续识别
    transcriptRef.current = "";
    setInterim("");
    rec.onresult = (e: any) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      transcriptRef.current = full;
      setInterim(full);
    };
    rec.onend = () => {
      setRecording(false);
      const text = transcriptRef.current.trim();
      if (sendOnEndRef.current && text) onFinalRef.current(text); // 松开且有内容 → 发送
      setInterim("");
    };
    rec.onerror = () => {
      setRecording(false);
      setInterim("");
    };
    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [Rec, supported, recording, lang]);

  const finish = useCallback(() => {
    sendOnEndRef.current = true;
    try {
      recRef.current?.stop();
    } catch {
      setRecording(false);
    }
  }, []);

  const cancel = useCallback(() => {
    sendOnEndRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      setRecording(false);
    }
  }, []);

  return { supported, recording, interim, start, finish, cancel };
}
