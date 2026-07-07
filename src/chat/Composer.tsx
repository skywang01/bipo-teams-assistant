// 可复用输入组件：从 Chatbot 抽出的输入区(文本框/语音模式/发送)，Home 与 Chat 共用。
// variant 仅影响外层 className（home 居中大号 / chat 底部固定），文本+语音逻辑完全一致。

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useStore } from "../state/store";
import { useChat } from "../state/chat";
import { useSpeech } from "./useSpeech";
import { t } from "../i18n";

export function Composer({ variant = "chat", onSent }: { variant?: "home" | "chat"; onSent?: () => void }) {
  const { lang, toast } = useStore();
  const { send, streaming } = useChat();
  const [voiceMode, setVoiceMode] = useState(false); // 点麦克风进入"按住说话"模式
  const [input, setInput] = useState("");

  const onSubmit = () => {
    const q = input;
    setInput("");
    void send(q).then(() => onSent?.());
  };

  // 语音录入（对齐小程序）：按住说话、上滑取消、松开自动发送
  const speech = useSpeech(
    lang,
    (text) => {
      void send(text).then(() => onSent?.());
    },
    (reason) => {
      const zh = lang === "zh";
      let msg: string;
      if (reason === "not-allowed" || reason === "service-not-allowed")
        msg = zh ? "请允许麦克风权限后重试" : "Please allow microphone access";
      else if (reason === "no-speech" || reason === "no-result")
        msg = zh ? "没听清，请再说一次" : "Didn't catch that, try again";
      else if (reason === "stt-failed")
        msg = zh ? "语音识别服务未就绪，请稍后重试" : "Speech service unavailable, try again";
      else
        msg = zh
          ? "此环境暂不支持浏览器语音识别；请用浏览器打开，或接入服务端识别(/api/stt)"
          : "Speech recognition isn't available here. Use a browser, or wire server STT (/api/stt).";
      toast(msg);
    },
  );
  const [cancelArmed, setCancelArmed] = useState(false);
  const [holding, setHolding] = useState(false); // 手指按住状态(驱动浮层, 与语音引擎解耦)
  const micStartY = useRef(0);
  const micDownTime = useRef(0);
  const micDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    micStartY.current = e.clientY;
    micDownTime.current = Date.now();
    setCancelArmed(false);
    setHolding(true); // 立即显示浮层, 不依赖识别是否成功启动
    speech.start(); // 尝试启动识别(浏览器可用; Teams 桌面端不支持则松开时提示)
  };
  const micMove = (e: ReactPointerEvent) => {
    if (!holding) return;
    setCancelArmed(micStartY.current - e.clientY > 60); // 上滑超过 60px = 取消
  };
  const micUp = () => {
    if (!holding) return;
    setHolding(false);
    const elapsed = Date.now() - micDownTime.current;
    if (cancelArmed) speech.cancel();
    else if (elapsed < 600) {
      speech.cancel(); // 按太短 → 不发送, 提示重试
      toast(lang === "zh" ? "说话时间太短，请重试" : "Too short, try again");
    } else speech.finish();
    setCancelArmed(false);
  };

  return (
    <div className={variant === "home" ? "composer home" : "composer"}>
      {holding && (
        <div className={`rec-overlay ${cancelArmed ? "cancel" : ""}`}>
          <div className="rec-mic">🎙️</div>
          <div className="rec-text">{speech.interim || (lang === "zh" ? "正在聆听…" : "Listening…")}</div>
          <div className="rec-hint">
            {cancelArmed
              ? lang === "zh" ? "松开手指 · 取消" : "Release to cancel"
              : lang === "zh" ? "松开发送 · 上滑取消" : "Release to send · slide up to cancel"}
          </div>
        </div>
      )}
      {voiceMode ? (
        <div className="voice-row">
          <button className="kbd" onClick={() => setVoiceMode(false)} aria-label={lang === "zh" ? "切回键盘" : "Keyboard"}>
            ⌨
          </button>
          <button
            className={`hold-bar ${holding ? (cancelArmed ? "cancel" : "on") : ""}`}
            onPointerDown={micDown}
            onPointerMove={micMove}
            onPointerUp={micUp}
            onPointerCancel={micUp}
            onLostPointerCapture={micUp}
            style={{ touchAction: "none" }}
          >
            {holding
              ? cancelArmed
                ? lang === "zh" ? "松开 取消" : "Release to cancel"
                : lang === "zh" ? "松开 发送" : "Release to send"
              : lang === "zh" ? "按住 说话" : "Hold to talk"}
          </button>
        </div>
      ) : variant === "home" ? (
        // Home: Copilot 式大输入框(多行 textarea + 底部操作行)
        <div className="big-box">
          <textarea
            className="big-input"
            value={input}
            placeholder={t("composerPh")}
            rows={2}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                onSubmit();
              }
            }}
          />
          <div className="big-bar">
            <button className="big-plus" aria-label="+">＋</button>
            <div className="big-right">
              {speech.supported && (
                <button className="mic" onClick={() => setVoiceMode(true)} aria-label={lang === "zh" ? "语音输入" : "Voice input"} title={lang === "zh" ? "语音输入" : "Voice input"}>
                  🎤
                </button>
              )}
              <button className="send" disabled={streaming || !input.trim()} onClick={onSubmit} aria-label={t("send")}>
                ↑
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="box">
          <span style={{ fontSize: 18, color: "var(--mute)" }}>＋</span>
          <input
            value={input}
            placeholder={t("composerPh")}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") onSubmit();
            }}
          />
          {speech.supported && (
            <button
              className="mic"
              onClick={() => setVoiceMode(true)}
              aria-label={lang === "zh" ? "语音输入" : "Voice input"}
              title={lang === "zh" ? "语音输入" : "Voice input"}
            >
              🎤
            </button>
          )}
          <button className="send" disabled={streaming || !input.trim()} onClick={onSubmit} aria-label={t("send")}>
            ↑
          </button>
        </div>
      )}
    </div>
  );
}
