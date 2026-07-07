// 语音录入 —— 按住说话/上滑取消/松开发送。双引擎(同一接口, 按环境切换):
//   · 真实后端模式(VITE_AGENT_MODE=real): Web Audio 采集 PCM → 编码 16kHz 单声道 WAV
//        → POST /api/stt(服务端腾讯 ASR 一句话识别)→ 文本。Teams/手机 WebView 均可用。
//   · 否则(mock/静态): 浏览器原生 Web Speech(仅浏览器可用, 作 demo 兜底)。
//
// 后端 /api/stt = 腾讯云 ASR SentenceRecognition, VoiceFormat 透传。
// 腾讯支持 wav/pcm/mp3/m4a/ogg-opus(不支持 webm), 故前端产 16kHz WAV。
// 契约: POST { audio:<base64>, format:"wav", lang:"zh"|"en" } → { text }; service-key 由代理/BFF 注入。
// lang 透传当前界面语言, 供后端选 EngSerViceType(zh→16k_zh / en→16k_en); 后端未读该参数则回退默认。

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
const TARGET_RATE = 16000;

/* ---- PCM(Float32) → 降采样到 16k → 16-bit WAV Blob ---- */
function downsample(buf: Float32Array, srcRate: number, dstRate: number): Float32Array {
  if (dstRate >= srcRate) return buf;
  const ratio = srcRate / dstRate;
  const outLen = Math.round(buf.length / ratio);
  const out = new Float32Array(outLen);
  let oi = 0, bi = 0;
  while (oi < outLen) {
    const next = Math.round((oi + 1) * ratio);
    let acc = 0, cnt = 0;
    for (let i = bi; i < next && i < buf.length; i++) { acc += buf[i]; cnt++; }
    out[oi++] = cnt ? acc / cnt : 0;
    bi = next;
  }
  return out;
}
function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const w = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  w(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE");
  w(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, "data"); view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
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
  const AudioCtx = typeof window !== "undefined" ? (window as any).AudioContext || (window as any).webkitAudioContext : undefined;
  const supported = server
    ? typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && !!AudioCtx
    : !!WebRec;

  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const onFinalRef = useRef(onFinal); onFinalRef.current = onFinal;
  const onErrorRef = useRef(onError); onErrorRef.current = onError;

  /* ---------- 服务端 STT(Web Audio → WAV → /api/stt) ---------- */
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmRef = useRef<Float32Array[]>([]);
  const sendRef = useRef(false);

  const teardown = useCallback(() => {
    try { procRef.current?.disconnect(); } catch {}
    try { srcRef.current?.disconnect(); } catch {}
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { ctxRef.current?.close(); } catch {}
    procRef.current = null; srcRef.current = null; streamRef.current = null; ctxRef.current = null;
  }, []);

  const startServer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx: AudioContext = new AudioCtx();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      srcRef.current = src;
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      pcmRef.current = [];
      sendRef.current = false;
      proc.onaudioprocess = (e) => { pcmRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
      src.connect(proc);
      proc.connect(ctx.destination);
      setRecording(true);
    } catch {
      teardown();
      setRecording(false);
      onErrorRef.current?.("not-allowed");
    }
  }, [AudioCtx, teardown]);

  const stopServer = useCallback(async (send: boolean) => {
    setRecording(false);
    const rate = ctxRef.current?.sampleRate || 48000;
    const chunks = pcmRef.current;
    teardown();
    if (!send) return;
    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (!total) { onErrorRef.current?.("no-result"); return; }
    const merged = new Float32Array(total);
    let o = 0; for (const c of chunks) { merged.set(c, o); o += c.length; }
    const wav = encodeWav(downsample(merged, rate, TARGET_RATE), TARGET_RATE);
    setInterim(lang === "zh" ? "识别中…" : "Recognizing…");
    try {
      const audio = await blobToBase64(wav);
      const res = await fetch("/api/stt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audio, format: "wav", lang }),
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
  }, [lang, teardown]);

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
    transcriptRef.current = ""; gotResultRef.current = false; erroredRef.current = false;
    setInterim("");
    rec.onresult = (e: any) => {
      gotResultRef.current = true;
      let full = ""; for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      transcriptRef.current = full; setInterim(full);
    };
    rec.onend = () => {
      setRecording(false);
      const text = transcriptRef.current.trim();
      if (sendOnEndRef.current && text) onFinalRef.current(text);
      else if (sendOnEndRef.current && !gotResultRef.current && !erroredRef.current) onErrorRef.current?.("no-result");
      setInterim("");
    };
    rec.onerror = (e: any) => { setRecording(false); setInterim(""); erroredRef.current = true; onErrorRef.current?.(e?.error || "error"); };
    recRef.current = rec;
    try { rec.start(); setRecording(true); } catch { setRecording(false); }
  }, [WebRec, lang]);

  const stopWeb = useCallback((send: boolean) => {
    sendOnEndRef.current = send;
    try { recRef.current?.stop(); } catch { setRecording(false); }
  }, []);

  /* ---------- 统一接口 ---------- */
  const start = useCallback(() => { void (server ? startServer() : startWeb()); }, [server, startServer, startWeb]);
  const finish = useCallback(() => { if (server) { sendRef.current = true; void stopServer(true); } else stopWeb(true); }, [server, stopServer, stopWeb]);
  const cancel = useCallback(() => { if (server) { sendRef.current = false; void stopServer(false); } else stopWeb(false); }, [server, stopServer, stopWeb]);

  return { supported, recording, interim, start, finish, cancel };
}
