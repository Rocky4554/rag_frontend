"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Radio, Loader2, AlertCircle } from "lucide-react";
import VoiceOrb from "@/components/shared/VoiceOrb";
import { conversationalAiAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { registerSession, disconnectSocket } from "@/lib/socket";
import { Room, RoomEvent, Track } from "livekit-client";
import ConversationStream from "@/components/shared/ConversationStream";
import { getUserFriendlyError, requestMicrophonePermission, isMobile } from "@/lib/utils";

export default function ConversationalAiPage() {
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
  const streamingIdRef = useRef(null);  // current AI message being built
  const userMsgIdRef = useRef(null);    // current user message being built

  // (auto-scroll handled by ConversationStream)

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
    if (sessionId) conversationalAiAPI.stop(sessionId).catch(() => {});
    setPhase("idle");
    setAgentState("listening");
    setIsMuted(false);
    streamingIdRef.current = null;
  }, [sessionId]);

  // Build synthetic subtitle words from accumulated text for Netflix effect
  const updateSubtitleWords = useCallback((fullText) => {
    const words = fullText.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    const msPerWord = 80;
    setSubtitleWords(words.map((w, i) => ({ time: i * msPerWord, value: w })));
    setIsAiSpeaking(true);
  }, []);

  // Accumulate AI speech fragments into one message per turn
  const appendAiText = useCallback((text) => {
    if (!text || !text.trim()) return;
    const fragment = text.trim();
    const currentId = streamingIdRef.current;
    if (currentId) {
      // Append to existing streaming message with a space separator
      setTranscript((prev) => {
        const updated = prev.map((m) =>
          m.id === currentId ? { ...m, text: m.text + " " + fragment } : m
        );
        // Update Netflix subtitle words with the full accumulated text
        const msg = updated.find((m) => m.id === currentId);
        if (msg) updateSubtitleWords(msg.text);
        return updated;
      });
    } else {
      // Start a new AI message
      const msgId = Date.now() + Math.random();
      streamingIdRef.current = msgId;
      updateSubtitleWords(fragment);
      setTranscript((prev) => [
        ...prev,
        { id: msgId, role: "ai", text: fragment, streaming: true },
      ]);
    }
  }, []);

  const startSession = async () => {
    setPhase("connecting");
    setError("");
    setTranscript([]);
    streamingIdRef.current = null;

    try {
      // REQUEST MICROPHONE PERMISSION FIRST — before any room connection
      await requestMicrophonePermission();

      const socket = registerSession(sessionId);

      socket.on("voice_transcript", (data) => {
        if (data.role === "ai") {
          // Finalize any open user message when AI starts speaking
          if (userMsgIdRef.current) {
            const uid = userMsgIdRef.current;
            userMsgIdRef.current = null;
            setTranscript((prev) =>
              prev.map((m) => (m.id === uid ? { ...m, streaming: false } : m))
            );
          }
          appendAiText(data.text);
        } else {
          // Accumulate user speech fragments into one message
          const fragment = (data.text || "").trim();
          if (!fragment) return;
          if (userMsgIdRef.current) {
            setTranscript((prev) =>
              prev.map((m) =>
                m.id === userMsgIdRef.current ? { ...m, text: m.text + " " + fragment } : m
              )
            );
          } else {
            const msgId = Date.now() + Math.random();
            userMsgIdRef.current = msgId;
            setTranscript((prev) => [
              ...prev,
              { id: msgId, role: "user", text: fragment, streaming: true },
            ]);
          }
        }
      });

      socket.on("voice_state", (data) => {
        const state = data.state || "listening";
        if (state === 'disconnected') {
          endSession();
          return;
        }
        setAgentState(state);
        // When AI starts speaking, finalize any open user message
        if (state === "speaking" && userMsgIdRef.current) {
          const uid = userMsgIdRef.current;
          userMsgIdRef.current = null;
          setTranscript((prev) =>
            prev.map((m) => (m.id === uid ? { ...m, streaming: false } : m))
          );
        }
        // When AI stops speaking, finalize the current AI streaming message
        if (state === "listening" && streamingIdRef.current) {
          const id = streamingIdRef.current;
          streamingIdRef.current = null;
          setTranscript((prev) =>
            prev.map((m) => (m.id === id ? { ...m, streaming: false } : m))
          );
          setIsAiSpeaking(false);
          setSubtitleWords([]);
        }
      });

      socket.on("voice_error", (data) => {
        setError(data.error || "Conversational AI error");
        endSession();
      });

      // Start backend agent + get LiveKit token
      const { data } = await conversationalAiAPI.start(sessionId);

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

      // Microphone is already enabled from permission request, but set it again for LiveKit
      await room.localParticipant.setMicrophoneEnabled(true);

      setPhase("active");
      setAgentState("listening");
    } catch (err) {
      setError(getUserFriendlyError(err, "Failed to start Conversational AI session. Please try again."));
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
        <h2 className="text-lg font-semibold text-text-primary mb-2">Conversational AI</h2>
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
        <p className="text-text-primary font-medium">Starting Conversational AI...</p>
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
            Conversational AI
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
                <div className="flex flex-col gap-1">
                  <span>{error}</span>
                  {isMobile() && error.toLowerCase().includes("permission") && (
                    <a 
                      href="https://support.google.com/chrome/answer/2693767?hl=en&co=GENIE.Platform%3DAndroid" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] underline opacity-80 hover:opacity-100"
                    >
                      Troubleshooting Guide for Android
                    </a>
                  )}
                </div>
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

  // ── Active session — dark mode two-panel layout ──
  const aiSpeaking = isAiSpeaking || agentState === "speaking";

  return (
    <div className="flex flex-col md:flex-row gap-0 h-full -m-4 md:-m-6 overflow-hidden">
      {/* Left panel — Voice orb + controls (dark) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-[340px] shrink-0 flex flex-col items-center justify-between bg-[#0a0a12] p-6 md:p-8"
      >
        {/* Title */}
        <div className="w-full mb-4 flex items-center gap-2">
          <Radio className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-gray-300">Conversational AI</span>
        </div>

        {/* Voice orb */}
        <div className="flex-1 flex items-center justify-center">
          <VoiceOrb
            isActive={true}
            isSpeaking={aiSpeaking}
            isListening={!aiSpeaking && !isMuted}
            isMuted={isMuted}
            size={160}
          />
        </div>

        {/* Status */}
        <motion.p
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-xs text-gray-500 mb-5 tracking-wide"
        >
          {statusText}
        </motion.p>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isMuted ? "bg-red-500/20 ring-1 ring-red-500/30" : "bg-white/5 hover:bg-white/10"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5 text-gray-400" />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={endSession}
            className="px-5 py-3 rounded-full bg-red-500/15 text-red-400 text-sm font-medium flex items-center gap-2 hover:bg-red-500/25 transition-colors cursor-pointer ring-1 ring-red-500/20"
          >
            <PhoneOff className="w-4 h-4" />
            End Session
          </motion.button>
        </div>
      </motion.div>

      {/* Right panel — Conversation stream (dark) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col bg-[#0e0e18] overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Transcript</span>
        </div>
        <ConversationStream
          messages={transcript}
          subtitleWords={subtitleWords}
          isAiSpeaking={isAiSpeaking}
          agentLabel="Conversational AI"
          darkMode={true}
        />
      </motion.div>
    </div>
  );
}
