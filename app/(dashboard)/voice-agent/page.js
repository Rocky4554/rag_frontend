"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Radio, Loader2, AlertCircle, User, Sparkles } from "lucide-react";
import { voiceAgentAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { registerSession, disconnectSocket } from "@/lib/socket";
import { Room, RoomEvent, Track } from "livekit-client";
import SubtitleHighlighter from "@/components/interview/SubtitleHighlighter";
import { getUserFriendlyError } from "@/lib/utils";

export default function VoiceAgentPage() {
  const { activeSession } = useSession();
  const sessionId = activeSession?.sessionId;

  const [phase, setPhase] = useState("idle"); // idle | connecting | active
  const [agentState, setAgentState] = useState("listening"); // listening | speaking
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState("");
  const [subtitleWords, setSubtitleWords] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const roomRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const streamingIdRef = useRef(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      disconnectSocket();
    };
  }, []);

  const endSession = useCallback(async () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    disconnectSocket();
    if (sessionId) voiceAgentAPI.stop(sessionId).catch(() => {});
    setPhase("idle");
    setAgentState("listening");
    setIsMuted(false);
    streamingIdRef.current = null;
  }, [sessionId]);

  // Typewriter effect for AI messages — same word-by-word animation as interview agent
  const addAiMessage = useCallback((text) => {
    const msgId = Date.now() + Math.random();
    streamingIdRef.current = msgId;
    const words = text.split(/(\s+)/);
    let shown = "";

    setTranscript((prev) => [
      ...prev,
      { id: msgId, role: "ai", text: "", streaming: true },
    ]);

    let i = 0;
    const typeTimer = setInterval(() => {
      if (i >= words.length) {
        clearInterval(typeTimer);
        streamingIdRef.current = null;
        setTranscript((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, streaming: false } : m))
        );
        return;
      }
      shown += words[i];
      i++;
      setTranscript((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: shown } : m))
      );
    }, 25);
  }, []);

  const startSession = async () => {
    setPhase("connecting");
    setError("");
    setTranscript([]);
    streamingIdRef.current = null;

    try {
      const socket = registerSession(sessionId);

      socket.on("voice_transcript", (data) => {
        if (data.role === "ai") {
          addAiMessage(data.text);
        } else {
          setTranscript((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), role: "user", text: data.text },
          ]);
        }
      });

      socket.on("ai_subtitle", (data) => {
        if (data.words?.length > 0) {
          setSubtitleWords(data.words);
          setIsAiSpeaking(true);
        }
      });

      socket.on("voice_state", (data) => {
        setAgentState(data.state || "listening");
      });

      socket.on("voice_error", (data) => {
        setError(data.error || "Voice agent error");
        endSession();
      });

      // Start backend agent + get LiveKit token
      const { data } = await voiceAgentAPI.start(sessionId);

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.autoplay = true;
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setPhase("idle");
        setAgentState("listening");
      });

      await room.connect(data.url, data.token);

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        room.disconnect();
        throw new Error("Microphone access denied. Please allow microphone permission and try again.");
      }

      setPhase("active");
      setAgentState("listening");
    } catch (err) {
      setError(getUserFriendlyError(err, "Failed to start voice session. Please try again."));
      setPhase("idle");
    }
  };

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted((v) => !v);
    }
  }, [isMuted]);

  const statusText =
    phase === "idle"
      ? "Ready to start"
      : phase === "connecting"
      ? "Connecting..."
      : agentState === "speaking"
      ? "AI is speaking..."
      : isMuted
      ? "Microphone muted"
      : "Listening...";

  // ── Idle / No session ──────────────────────────────────────────
  if (!sessionId && phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 flex items-center justify-center mb-4">
          <Radio className="w-7 h-7 text-[#7C3AED]" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Voice Agent</h2>
        <p className="text-sm text-text-muted mb-4">Upload a PDF to give the agent document context, or start directly for general chat.</p>
        <a href="/upload" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Upload Document
        </a>
      </div>
    );
  }

  // ── Connecting ─────────────────────────────────────────────────
  if (phase === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED] mb-4" />
        <p className="text-text-primary font-medium">Starting voice agent...</p>
        <p className="text-xs text-text-muted mt-1">Connecting to Gemini Live</p>
      </div>
    );
  }

  // ── Idle start screen ──────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div className="max-w-md mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-2">
            <Radio className="w-6 h-6 text-[#7C3AED]" />
            Voice Agent
          </h1>
          <p className="text-text-muted mb-8">Real-time voice conversation powered by Gemini Live</p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="p-4 rounded-xl bg-[#7C3AED]/5 border border-[#7C3AED]/20">
              <p className="text-sm text-text-secondary">
                <strong className="text-[#7C3AED]">Tip:</strong> The agent knows about your uploaded document and can also search the web. Just speak naturally.
              </p>
            </div>
            <button
              onClick={startSession}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Mic className="w-4 h-4" />
              Start Conversation
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Active session — two-panel layout identical to interview agent ──
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full -m-4 md:-m-6 p-4 md:p-6 overflow-y-auto md:overflow-hidden">
      {/* Left panel — voice controls */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col items-center bg-bg-card border border-border rounded-2xl p-6 md:p-8 min-h-[400px]"
      >
        {/* Concentric pulse rings */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {[160, 128, 96].map((size, i) => (
              <motion.div
                key={size}
                animate={{
                  scale: isAiSpeaking ? [1, 1.12, 1] : [1, 1.04, 1],
                  opacity: isAiSpeaking
                    ? [0.4 - i * 0.08, 0.7 - i * 0.1, 0.4 - i * 0.08]
                    : [0.15 - i * 0.03, 0.25 - i * 0.05, 0.15 - i * 0.03],
                }}
                transition={{ duration: isAiSpeaking ? 0.7 : 2, repeat: Infinity, delay: i * 0.25 }}
                className="absolute rounded-full border"
                style={{
                  width: size,
                  height: size,
                  top: `calc(50% - ${size / 2}px)`,
                  left: `calc(50% - ${size / 2}px)`,
                  borderColor: i === 0 ? "#0EA5E9" : "#7C3AED",
                  background:
                    i === 2
                      ? "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(14,165,233,0.1))"
                      : "transparent",
                }}
              />
            ))}
            <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center shadow-lg shadow-[#7C3AED]/30">
              {isMuted ? (
                <MicOff className="w-7 h-7 text-white" />
              ) : (
                <Mic className="w-7 h-7 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Netflix-style subtitles */}
        <div className="w-full mb-4 min-h-12">
          <SubtitleHighlighter
            words={subtitleWords}
            isPlaying={isAiSpeaking}
            onComplete={() => setIsAiSpeaking(false)}
          />
        </div>

        {/* Status */}
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm text-text-secondary mb-6"
        >
          {statusText}
        </motion.p>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMute}
            className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center hover:bg-border transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 text-red-400" />
            ) : (
              <Mic className="w-5 h-5 text-text-secondary" />
            )}
          </button>
          <button
            onClick={endSession}
            className="px-6 py-3 rounded-full bg-[#EF4444] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#DC2626] transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            End Session
          </button>
        </div>
      </motion.div>

      {/* Right panel — transcript (same as interview agent) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-[400px] flex flex-col bg-bg-card border border-border rounded-2xl shrink-0 max-h-[50vh] md:max-h-none"
      >
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Live Transcript</h3>
          <p className="text-xs text-text-muted mt-0.5">Real-time conversation log</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {transcript.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">
              Waiting for conversation to begin...
            </p>
          )}

          {transcript.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1.5"
            >
              <div className="flex items-center gap-2">
                {msg.role === "ai" ? (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center">
                    <User className="w-3 h-3 text-text-muted" />
                  </div>
                )}
                <span className="text-xs font-medium text-text-secondary">
                  {msg.role === "ai" ? "Voice Agent" : "You"}
                </span>
              </div>
              <p
                className={`text-sm leading-relaxed pl-7 ${
                  msg.role === "ai" ? "text-text-primary" : "text-text-secondary"
                }`}
              >
                {msg.text}
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#7C3AED] animate-pulse rounded-sm align-middle" />
                )}
              </p>
            </motion.div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </motion.div>
    </div>
  );
}
