"use client";

import { motion } from "framer-motion";

/**
 * VoiceOrb — Animated fluid blob that reacts to voice state.
 * Recreates the gradient orb animation from the reference GIF
 * using pure CSS gradients + framer-motion.
 *
 * Props:
 *   isActive    - true when a session is active
 *   isSpeaking  - true when AI is speaking (faster/larger animation)
 *   isListening - true when listening to user (gentle pulse)
 *   isMuted     - true when mic is muted (dim/static)
 *   size        - orb diameter in px (default: 140)
 */
export default function VoiceOrb({
  isActive = false,
  isSpeaking = false,
  isListening = false,
  isMuted = false,
  size = 140,
}) {
  const half = size / 2;

  // Animation states
  const orbVariants = {
    idle: {
      scale: 1,
      opacity: 0.6,
      rotate: 0,
      transition: { duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
    },
    listening: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 0.9, 0.7],
      rotate: [0, 5, -5, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    },
    speaking: {
      scale: [1, 1.15, 0.95, 1.1, 1],
      opacity: [0.8, 1, 0.85, 1, 0.8],
      rotate: [0, 10, -8, 5, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
    },
    muted: {
      scale: 0.9,
      opacity: 0.3,
      rotate: 0,
      transition: { duration: 0.5 },
    },
  };

  const currentState = isMuted
    ? "muted"
    : isSpeaking
      ? "speaking"
      : isListening
        ? "listening"
        : "idle";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size + 40, height: size + 40 }}
    >
      {/* Outer glow */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.3, 1] : [1, 1.1, 1],
          opacity: isSpeaking ? [0.15, 0.3, 0.15] : [0.05, 0.12, 0.05],
        }}
        transition={{ duration: isSpeaking ? 1 : 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full"
        style={{
          width: size + 40,
          height: size + 40,
          background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Main orb */}
      <motion.div
        variants={orbVariants}
        animate={currentState}
        className="relative rounded-full"
        style={{
          width: size,
          height: size,
          background: `
            radial-gradient(circle at 30% 40%, rgba(192, 132, 252, 0.9) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, rgba(56, 189, 248, 0.9) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(217, 70, 239, 0.8) 0%, transparent 40%),
            radial-gradient(circle at 60% 20%, rgba(99, 205, 218, 0.7) 0%, transparent 50%),
            linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #06b6d4 100%)
          `,
          filter: "blur(8px)",
          borderRadius: "50%",
        }}
      />

      {/* Inner blob (slightly offset, creates fluid motion effect) */}
      <motion.div
        animate={{
          x: isSpeaking ? [0, 8, -6, 4, 0] : [0, 3, -3, 0],
          y: isSpeaking ? [0, -6, 8, -4, 0] : [0, -2, 3, 0],
          scale: isSpeaking ? [0.85, 0.95, 0.8, 0.9, 0.85] : [0.85, 0.9, 0.85],
          rotate: isSpeaking ? [0, -15, 10, -5, 0] : [0, -5, 5, 0],
        }}
        transition={{
          duration: isSpeaking ? 1.2 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute rounded-full"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          background: `
            radial-gradient(circle at 60% 30%, rgba(236, 72, 153, 0.9) 0%, transparent 60%),
            radial-gradient(circle at 30% 70%, rgba(168, 85, 247, 0.8) 0%, transparent 50%),
            linear-gradient(180deg, rgba(99, 205, 218, 0.6) 0%, rgba(192, 132, 252, 0.8) 100%)
          `,
          filter: "blur(12px)",
          borderRadius: "50%",
        }}
      />

      {/* Sharp center highlight */}
      <motion.div
        animate={{
          opacity: isSpeaking ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3],
          scale: isSpeaking ? [1, 1.1, 1] : [1, 1.03, 1],
        }}
        transition={{ duration: isSpeaking ? 0.8 : 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full"
        style={{
          width: size * 0.3,
          height: size * 0.3,
          background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />
    </div>
  );
}
