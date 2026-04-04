"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, PhoneOff, Sparkles, User, Loader2, AlertCircle, Play } from "lucide-react";
import { interviewAPI, tokenAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { registerSession, getSocket, disconnectSocket } from "@/lib/socket";
import { Room, RoomEvent, Track } from "livekit-client";
import SubtitleHighlighter from "@/components/interview/SubtitleHighlighter";
import { getUserFriendlyError } from "@/lib/utils";

export default function InterviewPage() {
  const { activeSession } = useSession();
  const sessionId = activeSession?.sessionId;

  // Interview phases: setup | connecting | active | done
  const [phase, setPhase] = useState("setup");
  const [maxQuestions, setMaxQuestions] = useState(5);

  // Active interview state
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [difficulty, setDifficulty] = useState("medium");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [finalReport, setFinalReport] = useState(null);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("Connecting...");
  const [subtitleWords, setSubtitleWords] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // Refs
  const roomRef = useRef(null);
  const transcriptEndRef = useRef(null);

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

  const startInterview = async () => {
    if (!sessionId) return;
    setPhase("connecting");
    setError("");
    setTranscript([]);

    try {
      // 1. Register socket for real-time events
      const socket = registerSession(sessionId);

      // Listen for transcript events
      // ai_speech: speech-synchronized transcript events emitted by worker.js
      // { action: 'start' }           — new AI turn beginning, create empty entry
      // { action: 'sentence', text }  — one sentence finished playing, append it
      // { action: 'end' }             — turn complete, mark entry as done
      const aiSpeechRef = { id: null };

      socket.on("ai_subtitle", (data) => {
        if (data.words?.length > 0) {
          setSubtitleWords(data.words);
          setIsAiSpeaking(true);
        }
      });

      socket.on("ai_speech", (data) => {
        if (data.action === "start") {
          const id = Date.now();
          aiSpeechRef.id = id;
          setTranscript((prev) => [
            ...prev,
            { id, role: "ai", text: "", streaming: true },
          ]);
          setStatusText("AI is speaking...");
        } else if (data.action === "sentence" && aiSpeechRef.id) {
          setTranscript((prev) =>
            prev.map((m) =>
              m.id === aiSpeechRef.id
                ? { ...m, text: m.text ? m.text + " " + data.text : data.text }
                : m
            )
          );
        } else if (data.action === "end" && aiSpeechRef.id) {
          setTranscript((prev) =>
            prev.map((m) =>
              m.id === aiSpeechRef.id ? { ...m, streaming: false } : m
            )
          );
          aiSpeechRef.id = null;
          setIsAiSpeaking(false);
          setSubtitleWords([]);
          setStatusText("Your turn to speak...");
        }
      });

      socket.on("transcript_final", (data) => {
        if (data.role === "user") {
          setTranscript((prev) => [
            ...prev,
            { id: Date.now(), role: data.role, text: data.text, score: data.score },
          ]);
          setStatusText("AI is thinking...");
        }
      });

      socket.on("ai_feedback", (data) => {
        if (data.difficulty) setDifficulty(data.difficulty);
        if (data.questionNumber) setQuestionNumber(data.questionNumber);
      });

      socket.on("interview_done", (data) => {
        setFinalReport(data);
        setPhase("done");
        roomRef.current?.disconnect();
      });

      // 2. Start interview on backend
      const { data: interviewData } = await interviewAPI.start(sessionId, maxQuestions);
      setDifficulty(interviewData.difficulty || "medium");

      // 3. Get LiveKit token and connect
      const { data: tokenData } = await tokenAPI.getLiveKitToken(sessionId);

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        if (phase !== "done") {
          setStatusText("Disconnected");
        }
      });

      await room.connect(tokenData.url, tokenData.token);

      // Request mic permission — handle denial gracefully
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (micErr) {
        room.disconnect();
        throw new Error(
          "Microphone access denied. Please allow microphone permission in your browser settings and try again."
        );
      }

      // Signal client ready
      socket.emit("client_audio_ready", sessionId);

      setPhase("active");
      setStatusText("AI is preparing first question...");
    } catch (err) {
      setError(getUserFriendlyError(err, "Failed to start the interview. Please try again."));
      setPhase("setup");
    }
  };

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const endInterview = useCallback(() => {
    roomRef.current?.disconnect();
    disconnectSocket();
    setPhase("done");
  }, []);

  const resetInterview = () => {
    setPhase("setup");
    setTranscript([]);
    setFinalReport(null);
    setQuestionNumber(0);
    setError("");
  };

  const progress = maxQuestions > 0 ? (questionNumber / maxQuestions) * 100 : 0;

  // No session
  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22C55E]/10 to-[#0EA5E9]/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-[#22C55E]" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">No Document Loaded</h2>
        <p className="text-sm text-text-muted mb-4">Upload a PDF first to start an interview.</p>
        <a href="/upload" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Upload Document
        </a>
      </div>
    );
  }

  // Setup screen
  if (phase === "setup") {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-text-primary mb-2">AI Interview</h1>
          <p className="text-text-muted mb-8">Practice with an AI interviewer based on your document</p>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">Number of Questions</label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxQuestions(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      maxQuestions === n
                        ? "bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white"
                        : "bg-bg-elevated text-text-secondary hover:bg-border"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20">
              <p className="text-sm text-text-secondary">
                <strong className="text-[#F59E0B]">Note:</strong> This feature requires microphone access. You'll have a voice conversation with the AI interviewer in real-time.
              </p>
            </div>

            <button
              onClick={startInterview}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Start Interview
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Connecting
  if (phase === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED] mb-4" />
        <p className="text-text-primary font-medium">Setting up interview...</p>
        <p className="text-xs text-text-muted mt-1">Connecting to voice server</p>
      </div>
    );
  }

  // Done - show report
  if (phase === "done") {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-text-primary mb-6">Interview Complete</h1>

          {finalReport ? (
            <div className="space-y-6">
              {finalReport.topicScores && Object.keys(finalReport.topicScores).length > 0 && (
                <div className="bg-bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Performance Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(finalReport.topicScores).map(([topic, scoreArr]) => {
                      const arr = Array.isArray(scoreArr) ? scoreArr : [scoreArr];
                      const avg = arr.length
                        ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
                        : "N/A";
                      const color = parseFloat(avg) >= 7 ? "#22C55E" : parseFloat(avg) >= 4 ? "#F59E0B" : "#EF4444";
                      return (
                        <div key={topic} className="p-3 rounded-xl bg-bg-elevated">
                          <p className="text-xs text-text-muted mb-1 capitalize">{topic}</p>
                          <p className="text-lg font-bold" style={{ color }}>{avg}/10</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {finalReport.report && (
                <div className="bg-bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Detailed Report</h3>
                  <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {finalReport.report}
                  </div>
                </div>
              )}

              {/* Transcript */}
              {transcript.length > 0 && (
                <div className="bg-bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Full Transcript</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {transcript.map((msg) => (
                      <div key={msg.id} className="space-y-1.5">
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
                            {msg.role === "ai" ? "AI Interviewer" : "You"}
                          </span>
                          {msg.score && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/10 text-[#22C55E]">
                              {msg.score}/10
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed pl-7 text-text-secondary">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={resetInterview}
                className="w-full py-3 rounded-xl border border-border text-text-primary font-medium hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                Start New Interview
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-text-muted mb-4">Interview ended without a report.</p>
              <button onClick={resetInterview} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white font-medium cursor-pointer">
                Try Again
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Active interview
  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full -m-4 md:-m-6 p-4 md:p-6 overflow-y-auto md:overflow-hidden">
      {/* Voice panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex flex-col items-center bg-bg-card border border-border rounded-2xl p-6 md:p-8 min-h-[400px]"
      >
        {/* Progress */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">Interview Progress</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              difficulty === "easy" ? "bg-[#22C55E]/10 text-[#22C55E]" :
              difficulty === "hard" ? "bg-[#EF4444]/10 text-[#EF4444]" :
              "bg-[#F59E0B]/10 text-[#F59E0B]"
            }`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-elevated">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9]"
            />
          </div>
        </div>

        {/* Concentric circles with mic */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {[160, 128, 96].map((size, i) => (
              <motion.div
                key={size}
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.3 - i * 0.08, 0.5 - i * 0.08, 0.3 - i * 0.08],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                className="absolute rounded-full border"
                style={{
                  width: size,
                  height: size,
                  top: `calc(50% - ${size / 2}px)`,
                  left: `calc(50% - ${size / 2}px)`,
                  borderColor: i === 0 ? "#0EA5E9" : "#7C3AED",
                  background: i === 2 ? "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(14,165,233,0.1))" : "transparent",
                }}
              />
            ))}
            <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center">
              {isMuted ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
            </div>
          </div>
        </div>

        {/* Subtitles — Netflix-style word highlighting */}
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
            className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center hover:bg-border transition-colors cursor-pointer"
          >
            {isMuted ? <MicOff className="w-5 h-5 text-text-muted" /> : <Mic className="w-5 h-5 text-text-secondary" />}
          </button>
          <button
            onClick={endInterview}
            className="px-6 py-3 rounded-full bg-[#EF4444] text-white text-sm font-medium flex items-center gap-2 hover:bg-[#DC2626] transition-colors cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            End Interview
          </button>
        </div>
      </motion.div>

      {/* Transcript panel */}
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
            <p className="text-sm text-text-muted text-center py-8">Waiting for conversation to begin...</p>
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
                  {msg.role === "ai" ? "AI Interviewer" : "You"}
                </span>
                {msg.score && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/10 text-[#22C55E]">
                    {msg.score}/10
                  </span>
                )}
              </div>
              <p className={`text-sm leading-relaxed pl-7 ${msg.role === "ai" ? "text-text-primary" : "text-text-secondary"}`}>
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
