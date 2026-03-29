"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Netflix-style subtitle highlighter.
 *
 * Props:
 *   words     - Array of { time: ms, value: "word" } from backend ai_subtitle event
 *   isPlaying - true when AI audio is playing (between ai_speech start → end)
 *   onComplete - called when all words have been highlighted
 *
 * How it works:
 *   1. Backend emits ai_subtitle with word-level timestamps right before audio starts
 *   2. This component starts a timer synced to audio playback
 *   3. Words highlight one by one based on their timestamp
 *   4. Previous words fade to a dimmer color, current word glows
 */
export default function SubtitleHighlighter({ words = [], isPlaying = false, onComplete }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);
  const completedRef = useRef(false);

  const tick = useCallback(() => {
    if (!startTimeRef.current || !words.length) return;

    const elapsed = performance.now() - startTimeRef.current;

    // Find current word: the last word whose time <= elapsed
    let idx = -1;
    for (let i = words.length - 1; i >= 0; i--) {
      if (elapsed >= words[i].time) {
        idx = i;
        break;
      }
    }

    setActiveIndex(idx);

    // Check if we've reached the last word
    if (idx >= words.length - 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        // Keep last word highlighted for 600ms, then signal complete
        setTimeout(() => onComplete?.(), 600);
      }
      return; // Stop the loop
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [words, onComplete]);

  // Start/stop the highlight timer based on isPlaying + words availability
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      startTimeRef.current = performance.now();
      completedRef.current = false;
      setActiveIndex(-1);
      rafRef.current = requestAnimationFrame(tick);
    } else if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, words, tick]);

  // Reset when new words arrive
  useEffect(() => {
    setActiveIndex(-1);
    completedRef.current = false;
  }, [words]);

  if (!words.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className="px-4 py-3 rounded-xl bg-black/80 backdrop-blur-sm max-w-lg mx-auto"
      >
        <p className="text-sm leading-relaxed text-center font-medium">
          {words.map((word, i) => {
            const isPast = i < activeIndex;
            const isCurrent = i === activeIndex;
            const isFuture = i > activeIndex;

            return (
              <span
                key={`${i}-${word.value}`}
                className={`inline-block transition-all duration-150 ${
                  isCurrent
                    ? "text-white scale-105"
                    : isPast
                      ? "text-white/60"
                      : isFuture
                        ? "text-white/25"
                        : "text-white/25"
                }`}
                style={isCurrent ? {
                  textShadow: "0 0 12px rgba(124, 58, 237, 0.8), 0 0 4px rgba(255,255,255,0.5)",
                } : undefined}
              >
                {word.value}{" "}
              </span>
            );
          })}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
