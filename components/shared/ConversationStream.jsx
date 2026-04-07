"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, Mic } from "lucide-react";

/**
 * ConversationStream — Live conversation transcript with Netflix-style
 * word highlighting on the currently streaming AI message.
 *
 * Props:
 *   messages      - Array of { id, role: 'ai'|'user', text, streaming?: boolean }
 *   subtitleWords - Array of { time: ms, value: "word" } for Netflix-style highlighting
 *   isAiSpeaking  - true when AI audio is playing
 *   agentLabel    - Label for the AI (default: "AI")
 *   darkMode      - true for dark background (used in active voice sessions)
 */
export default function ConversationStream({
  messages = [],
  subtitleWords = [],
  isAiSpeaking = false,
  agentLabel = "AI",
  darkMode = false,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiSpeaking]);

  const lastStreamingAiIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ai" && messages[i].streaming) return i;
    }
    return -1;
  })();

  // Color classes based on mode
  const colors = darkMode
    ? {
        aiText: "text-gray-100",
        userText: "text-gray-400",
        label: "text-gray-500",
        empty: "text-gray-600",
        cursor: "bg-purple-400",
        userAvatar: "bg-white/10",
        userIcon: "text-gray-500",
        netflixActive: "text-gray-100",
        netflixPast: "text-gray-300",
        netflixFuture: "text-gray-600/40",
      }
    : {
        aiText: "text-text-primary",
        userText: "text-text-secondary",
        label: "text-text-muted",
        empty: "text-text-muted",
        cursor: "bg-[#7C3AED]",
        userAvatar: "bg-bg-elevated",
        userIcon: "text-text-muted",
        netflixActive: "text-text-primary",
        netflixPast: "text-text-primary",
        netflixFuture: "text-text-muted/40",
      };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className={`text-sm text-center py-8 flex items-center gap-2 ${colors.empty}`}>
            <Mic className="w-4 h-4" />
            Waiting for conversation to begin...
          </p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((msg, idx) => {
          const useNetflix =
            idx === lastStreamingAiIdx &&
            isAiSpeaking &&
            subtitleWords.length > 0;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex gap-3"
            >
              {/* Avatar */}
              <div className="shrink-0 mt-0.5">
                {msg.role === "ai" ? (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${colors.userAvatar}`}>
                    <User className={`w-3.5 h-3.5 ${colors.userIcon}`} />
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold mb-1 uppercase tracking-wide ${colors.label}`}>
                  {msg.role === "ai" ? agentLabel : "You"}
                </p>

                {useNetflix ? (
                  <NetflixText words={subtitleWords} colors={colors} />
                ) : (
                  <p className={`text-sm leading-relaxed ${msg.role === "ai" ? colors.aiText : colors.userText}`}>
                    {msg.text}
                    {msg.streaming && (
                      <span className={`inline-block w-1.5 h-4 ml-0.5 ${colors.cursor} animate-pulse rounded-sm align-middle`} />
                    )}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div ref={bottomRef} />
    </div>
  );
}

function NetflixText({ words, colors }) {
  const startTimeRef = useRef(performance.now());
  const [activeIndex, setActiveIndex] = useState(-1);
  const rafRef = useRef(null);

  useEffect(() => {
    startTimeRef.current = performance.now();
    setActiveIndex(-1);

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      let idx = -1;
      for (let i = words.length - 1; i >= 0; i--) {
        if (elapsed >= words[i].time) {
          idx = i;
          break;
        }
      }
      setActiveIndex(idx);
      if (idx < words.length - 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [words]);

  return (
    <p className="text-sm leading-relaxed">
      {words.map((word, i) => {
        const isCurrent = i === activeIndex;
        const isPast = i < activeIndex;
        return (
          <span
            key={`${i}-${word.value}`}
            className={`inline transition-colors duration-100 ${
              isCurrent
                ? `${colors.netflixActive} font-medium`
                : isPast
                  ? colors.netflixPast
                  : colors.netflixFuture
            }`}
            style={
              isCurrent
                ? { textShadow: "0 0 12px rgba(168, 85, 247, 0.6)" }
                : undefined
            }
          >
            {word.value}{" "}
          </span>
        );
      })}
    </p>
  );
}
