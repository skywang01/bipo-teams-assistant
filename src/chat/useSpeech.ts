// 语音录入 —— 按住说话/上滑取消/松开发送。双引擎(同一接口, 按环境切换):
//   · 真实后端模式(VITE_AGENT_MODE=real): MediaRecorder 录音 → POST /api/stt(服务端识别)
//        —— Teams/手机 WebView 都可用(=小程序 /api/stt 的做法)。
//   · 否则(mock/静态): 浏览器原生 Web Speech(仅浏览器可用, 作 demo 兜底)。
//
// /api/stt 契约(对齐小程序): POST JSON { audio: <base64>, format }; 返回 { text | result }。
// service-key 由 Vite 代理 / 线上 BFF 注入, 前端不持密钥。
// ⚠️ 后端 /api/stt 需接受此处发送的音频格式(webm/opus 或 mp4); 若仅支持 mp3, 需后端加转码或改前端为 WAV。

import { useCallback, useRef, useState } from "react";
import type { Lang } from "../i18n";

export interface Speech {
  supported: boolean;
  recording: boolean;
  interim: string;
  start: () => void;
  finish: () => void;
  cancel: () => void;
}

const SERVER_MODE = () => import.meta.env.VITE_AGENT_MODE === "real";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function useSpeech(lang: Lang, onFinal: (text: string) => void, onError?: (reason: string) => void): Speech {
  const server = SERVER_MODE();
  const WebRec = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;
  const supported = server
    ? typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"
    : !!WebRec;

  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  /* ---------- 服务端 STT(MediaRecorder + /api/stt) ---------- */
  const mrRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sendOnStopRef = useRef(false);

  const startServer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      sendOnStopRef.current = false;
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setRecording(false);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (!sendOnStopRef.current) return; // 取消
        const mime = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        setInterim(lang === "zh" ? "识别中…" : "Recognizing…");
        try {
          const audio = await blobToBase64(blob);
          const format = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
          const res = await fetch("/api/stt", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ audio, format }),
          });
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          const text: string = data?.text || data?.result || "";
          if (text) onFinalRef.current(text);
          else onErrorRef.current?.("no-result");
        } catch {
          onErrorRef.current?.("stt-failed");
        } finally {
          setInterim("");
        }
      };
      mrRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setRecording(false);
      onErrorRef.current?.("not-allowed");
    }
  }, [lang]);

  const stopServer = useCallback((send: boolean) => {
    sendOnStopRef.current = send;
    try {
      mrRef.current?.stop();
    } catch {
      setRecording(false);
    }
  }, []);

  /* ---------- 浏览器原生 Web Speech(兜底) ---------- */
  const recRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const sendOnEndRef = useRef(false);
  const gotResultRef = useRef(false);
  const erroredRef = useRef(false);

  const startWeb = useCallback(() => {
    if (!WebRec) return;
    const rec = new WebRec();
    rec.lang = lang === "zh" ? "zh-CN" : "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    transcriptRef.current = "";
    gotResultRef.current = false;
    erroredRef.current = false;
    setInterim("");
    rec.onresult = (e: any) => {
      gotResultRef.current = true;
      let full = "";
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      transcriptRef.current = full;
      setInterim(full);
    };
    rec.onend = () => {
      setRecording(false);
      const text = transcriptRef.current.trim();
      if (sendOnEndRef.current && text) onFinalRef.current(text);
      else if (sendOnEndRef.current && !gotResultRef.current && !erroredRef.current) onErrorRef.current?.("no-result");
      setInterim("");
    };
    rec.onerror = (e: any) => {
      setRecording(false);
      setInterim("");
      erroredRef.current = true;
      onErrorRef.current?.(e?.error || "error");
    };
    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [WebRec, lang]);

  const stopWeb = useCallback((send: boolean) => {
    sendOnEndRef.current = send;
    try {
      recRef.current?.stop();
    } catch {
      setRecording(false);
    }
  }, []);

  /* ---------- 统一接口 ---------- */
  const start = useCallback(() => { void (server ? startServer() : startWeb()); }, [server, startServer, startWeb]);
  const finish = useCallback(() => { server ? stopServer(true) : stopWeb(true); }, [server, stopServer, stopWeb]);
  const cancel = useCallback(() => { server ? stopServer(false) : stopWeb(false); }, [server, stopServer, stopWeb]);

  return { supported, recording, interim, start, finish, cancel };
}
