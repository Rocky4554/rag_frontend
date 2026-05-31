"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, PhoneOff, Sparkles, User, Loader2, AlertCircle, Play } from "lucide-react";
import { interviewAPI, tokenAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { registerSession, getSocket, disconnectSocket } from "@/lib/socket";
import { Room, RoomEvent, Track } from "livekit-client";
import ConversationStream from "@/components/shared/ConversationStream";
import VoiceOrb from "@/components/shared/VoiceOrb";
import DotGridVisualizer from "@/components/shared/DotGridVisualizer";
import { getUserFriendlyError, requestMicrophonePermission, isMobile } from "@/lib/utils";

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
  const [agentTrack, setAgentTrack] = useState(null); // AI audio track for the visualizer

  // Refs
  const roomRef = useRef(null);
  const transcriptIdRef = useRef(0);
  const aiSpeechRef = useRef(null);

  // Web Audio Analyser Refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [micVolume, setMicVolume] = useState(0);

  // (auto-scroll handled by ConversationStream)

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicVolume(0);
  }, []);

  const startAudioAnalysis = useCallback((mediaStreamTrack) => {
    try {
      stopAudioAnalysis();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const mediaStream = new MediaStream([mediaStreamTrack]);
      const source = audioContext.createMediaStreamSource(mediaStream);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      analyserRef.current = analyser;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedVolume = Math.min(100, Math.round((average / 128) * 100));
        setMicVolume(normalizedVolume);

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.error("Failed to setup audio analysis:", e);
    }
  }, [stopAudioAnalysis]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      disconnectSocket();
      stopAudioAnalysis();
    };
  }, [stopAudioAnalysis]);

  // Handle Socket Event Registrations with automatic cleanups to prevent duplicate firing or leaks
  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();

    const handleAiSubtitle = (data) => {
      if (data.words?.length > 0) {
        setSubtitleWords(data.words);
        setIsAiSpeaking(true);
      }
    };

    const handleAiSpeech = (data) => {
      if (data.action === "start") {
        const id = ++transcriptIdRef.current;
        aiSpeechRef.current = id;
        setTranscript((prev) => [
          ...prev,
          { id, role: "ai", text: "", streaming: true },
        ]);
        setStatusText("AI is speaking...");
      } else if (data.action === "sentence" && aiSpeechRef.current) {
        setTranscript((prev) =>
          prev.map((m) =>
            m.id === aiSpeechRef.current
              ? { ...m, text: m.text ? m.text + " " + data.text : data.text }
              : m
          )
        );
      } else if (data.action === "end" && aiSpeechRef.current) {
        setTranscript((prev) =>
          prev.map((m) =>
            m.id === aiSpeechRef.current ? { ...m, streaming: false } : m
          )
        );
        aiSpeechRef.current = null;
        setIsAiSpeaking(false);
        setSubtitleWords([]);
        setStatusText("Your turn to speak...");
      }
    };

    const handleTranscriptFinal = (data) => {
      if (data.role === "user") {
        setTranscript((prev) => [
          ...prev,
          { id: ++transcriptIdRef.current, role: data.role, text: data.text, score: data.score },
        ]);
        setStatusText("AI is thinking...");
      }
    };

    const handleAiFeedback = (data) => {
      if (data.difficulty) setDifficulty(data.difficulty);
      if (data.questionNumber) setQuestionNumber(data.questionNumber);
    };

    const handleInterviewDone = (data) => {
      setFinalReport(data);
      setPhase("done");
      roomRef.current?.disconnect();
      stopAudioAnalysis();
    };

    socket.on("ai_subtitle", handleAiSubtitle);
    socket.on("ai_speech", handleAiSpeech);
    socket.on("transcript_final", handleTranscriptFinal);
    socket.on("ai_feedback", handleAiFeedback);
    socket.on("interview_done", handleInterviewDone);

    return () => {
      socket.off("ai_subtitle", handleAiSubtitle);
      socket.off("ai_speech", handleAiSpeech);
      socket.off("transcript_final", handleTranscriptFinal);
      socket.off("ai_feedback", handleAiFeedback);
      socket.off("interview_done", handleInterviewDone);
    };
  }, [sessionId, stopAudioAnalysis]);

  const startInterview = async () => {
    if (!sessionId) return;
    setPhase("connecting");
    setError("");
    setTranscript([]);
    transcriptIdRef.current = 0;

    try {
      // REQUEST MICROPHONE PERMISSION FIRST — before any room connection
      await requestMicrophonePermission();

      // 1. Register socket for real-time events and connection
      const socket = registerSession(sessionId);

      // 2. Start interview on backend
      const { data: interviewData } = await interviewAPI.start(sessionId, maxQuestions);
      setDifficulty(interviewData.difficulty || "medium");

      // 3. Get LiveKit token and connect
      const { data: tokenData } = await tokenAPI.getLiveKitToken(sessionId);

      const room = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          document.body.appendChild(el);
          // Feed the AI's audio track to the dot-grid visualizer
          if (track.mediaStreamTrack) setAgentTrack(track.mediaStreamTrack);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setAgentTrack(null);
        if (phase !== "done") {
          setStatusText("Disconnected");
        }
      });

      await room.connect(tokenData.url, tokenData.token);

      // Microphone is already enabled from permission request, but set it again for LiveKit
      await room.localParticipant.setMicrophoneEnabled(true);

      // Set up real-time mic volume tracking for VoiceOrb feedback
      const localAudioTrack = Array.from(room.localParticipant.audioTrackPublications.values())
        .find(pub => pub.track)?.track;
      
      if (localAudioTrack?.mediaStreamTrack) {
        startAudioAnalysis(localAudioTrack.mediaStreamTrack);
      }

      // Ensure that if track publication is slightly delayed, it gets captured
      const handleLocalTrackPublished = (pub) => {
        if (pub.track?.kind === Track.Kind.Audio && pub.track?.mediaStreamTrack) {
          startAudioAnalysis(pub.track.mediaStreamTrack);
        }
      };
      room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);

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
    stopAudioAnalysis();
    setPhase("done");
  }, [stopAudioAnalysis]);

  const resetInterview = () => {
    setPhase("setup");
    setTranscript([]);
    setFinalReport(null);
    setQuestionNumber(0);
    setError("");
    stopAudioAnalysis();
  };

  const progress = maxQuestions > 0 ? (questionNumber / maxQuestions) * 100 : 0;

  // Check if active session is an image (not supported for interview)
  const filename = activeSession?.filename || "";
  const isImageSession = /\.(png|jpg|jpeg|webp|gif)$/i.test(filename);

  // No session or image session
  if (!sessionId || isImageSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22C55E]/10 to-[#0EA5E9]/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-[#22C55E]" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          {isImageSession ? "Image Not Supported" : "No Document Loaded"}
        </h2>
        <p className="text-sm text-text-muted mb-4">
          {isImageSession
            ? "Interview requires a PDF or text document. Please upload one to get started."
            : "Upload a PDF or text document to start an interview."}
        </p>
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
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">AI Interview</h1>
          <p className="text-text-muted mb-8">Practice with an AI interviewer based on your document</p>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
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
        </div>
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

  // Active interview — dark mode two-panel layout
  const aiSpeaking = isAiSpeaking || statusText === "AI is speaking...";

  return (
    <div className="flex flex-col md:flex-row gap-0 h-full -m-4 md:-m-6 overflow-hidden">
      {/* Left panel — Voice orb + controls (dark) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-[340px] shrink-0 flex flex-col items-center justify-between bg-[#0a0a12] p-6 md:p-8"
      >
        {/* Progress bar */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
              Q {questionNumber}/{maxQuestions}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              difficulty === "easy" ? "bg-emerald-500/15 text-emerald-400" :
              difficulty === "hard" ? "bg-red-500/15 text-red-400" :
              "bg-amber-500/15 text-amber-400"
            }`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
          </div>
          <div className="h-1 rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
            />
          </div>
        </div>

        {/* Agent voice visualizer — LiveKit-style dot grid */}
        <div className="flex-1 flex items-center justify-center">
          <DotGridVisualizer
            track={agentTrack}
            isSpeaking={aiSpeaking}
            size={200}
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
            onClick={endInterview}
            className="px-5 py-3 rounded-full bg-red-500/15 text-red-400 text-sm font-medium flex items-center gap-2 hover:bg-red-500/25 transition-colors cursor-pointer ring-1 ring-red-500/20"
          >
            <PhoneOff className="w-4 h-4" />
            End Interview
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
          agentLabel="Interviewer"
          darkMode={true}
        />
      </motion.div>
    </div>
  );
}
