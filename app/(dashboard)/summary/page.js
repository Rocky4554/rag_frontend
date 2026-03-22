"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { summaryAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";

export default function SummaryPage() {
  const { activeSession } = useSession();
  const sessionId = activeSession?.sessionId;

  const [summaryText, setSummaryText] = useState("");
  const [audioSrc, setAudioSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  const generateSummary = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await summaryAPI.generate(sessionId);
      setSummaryText(data.summary);
      if (data.audio) {
        setAudioSrc(`data:audio/mp3;base64,${data.audio}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Generate on mount if session exists
  useEffect(() => {
    if (sessionId && !summaryText) {
      generateSummary();
    }
  }, [sessionId, summaryText, generateSummary]);

  // Audio time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioSrc]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    if (audioRef.current && duration) {
      audioRef.current.currentTime = pct * duration;
    }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate waveform bars
  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const seed = Math.sin(i * 3.14) * 20 + 25;
    return Math.max(8, seed + Math.sin(i * 0.7) * 12);
  });

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0EA5E9]/10 to-[#7C3AED]/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-[#0EA5E9]" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">No Document Loaded</h2>
        <p className="text-sm text-text-muted mb-4">Upload a PDF first to generate a summary.</p>
        <a href="/upload" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Upload Document
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED] mb-4" />
        <p className="text-text-muted">Generating summary and audio...</p>
        <p className="text-xs text-text-muted mt-1">This may take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
        <button onClick={generateSummary} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-sm font-medium">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" />}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Voice Summary</h1>
        <p className="text-text-muted mb-8">Listen to an AI-generated audio summary of your document</p>
      </motion.div>

      {/* Audio player card */}
      {audioSrc && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            {activeSession?.filename || "Document"} — Summary
          </h3>
          <p className="text-xs text-text-muted mb-5">AI-generated voice summary</p>

          {/* Waveform */}
          <div className="flex items-end justify-center gap-[3px] h-12 mb-5">
            {waveformBars.map((h, i) => {
              const barProgress = i / waveformBars.length;
              const isPlayed = barProgress < progressPct / 100;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 4 }}
                  animate={{ height: h }}
                  transition={{ delay: i * 0.02, duration: 0.3 }}
                  className="w-[5px] rounded-full cursor-pointer"
                  style={{
                    backgroundColor: isPlayed ? "#7C3AED" : barProgress < 0.5 ? "#0EA5E9" : "var(--border)",
                  }}
                />
              );
            })}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center text-white hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-text-muted font-mono">{formatTime(currentTime)}</span>
              <div className="flex-1 h-1.5 rounded-full bg-bg-elevated cursor-pointer" onClick={handleSeek}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-text-muted font-mono">{formatTime(duration)}</span>
            </div>

            <Volume2 className="w-4 h-4 text-text-muted" />
          </div>
        </motion.div>
      )}

      {/* Summary text card */}
      {summaryText && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-bg-card border border-border rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Text Summary</h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {summaryText}
          </div>
        </motion.div>
      )}
    </div>
  );
}
