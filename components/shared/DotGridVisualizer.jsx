"use client";

import { useEffect, useRef } from "react";

/**
 * DotGridVisualizer — LiveKit-style audio visualizer.
 *
 * Renders a grid of dots on a canvas. A horizontal band centered vertically
 * lights up and expands outward in real time with the audio amplitude of the
 * supplied MediaStreamTrack (the AI agent's voice). When idle it shows a faint,
 * gently shimmering centre row.
 *
 * Self-contained: it owns its AudioContext + AnalyserNode and cleans them up.
 *
 * @param {MediaStreamTrack} track   - The agent audio track to visualize
 * @param {boolean} isSpeaking       - Whether the agent is currently speaking
 * @param {number} size              - Canvas size in px (square)
 * @param {number} cols              - Number of dot columns
 * @param {number} rows              - Number of dot rows
 * @param {string} color             - "r,g,b" string for the lit dots
 */
export default function DotGridVisualizer({
  track = null,
  isSpeaking = false,
  size = 200,
  cols = 15,
  rows = 9,
  color = "14,165,233", // cyan-blue
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);
  const levelsRef = useRef(new Array(cols).fill(0)); // smoothed per-column levels
  const speakingRef = useRef(isSpeaking);

  // Keep live props in refs so the draw loop never needs to restart
  useEffect(() => { speakingRef.current = isSpeaking; }, [isSpeaking]);

  // ── Set up / tear down the analyser when the track changes ────────
  useEffect(() => {
    cleanupAudio();
    if (!track) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      // AudioContext may start suspended — resume (we're inside a user-gesture chain)
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      const stream = new MediaStream([track]);
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // small FFT → low latency, plenty for a visualizer
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);

      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      cleanupAudio();
    }
    return cleanupAudio;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  function cleanupAudio() {
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    dataRef.current = null;
  }

  // ── Draw loop (set up once) ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const gapX = size / (cols + 1);
    const gapY = size / (rows + 1);
    const centerRow = (rows - 1) / 2;
    const halfSpan = centerRow + 0.5;
    let t = 0;

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, size, size);

      const analyser = analyserRef.current;
      const data = dataRef.current;
      const speaking = speakingRef.current && !!analyser;

      // Per-column target levels from the frequency bands
      const targets = new Array(cols).fill(0);
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        const binsPerCol = Math.max(1, Math.floor(data.length / cols));
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          for (let b = 0; b < binsPerCol; b++) sum += data[c * binsPerCol + b] || 0;
          targets[c] = sum / binsPerCol / 255; // 0..1
        }
      }

      const levels = levelsRef.current;
      for (let c = 0; c < cols; c++) {
        let target = targets[c];
        if (!speaking) {
          // Idle: gentle low-amplitude wave so the centre row softly shimmers
          target = 0.05 + 0.04 * Math.abs(Math.sin(t / 30 + c * 0.5));
        } else {
          // Boost a touch so quiet speech still reads
          target = Math.min(1, target * 1.4);
        }
        levels[c] += (target - levels[c]) * 0.28; // smoothing
      }

      for (let c = 0; c < cols; c++) {
        const L = levels[c];
        const x = gapX * (c + 1);
        const reach = L * halfSpan; // how many rows out from centre light up
        for (let r = 0; r < rows; r++) {
          const y = gapY * (r + 1);
          const dist = Math.abs(r - centerRow);
          const lit = dist <= reach;
          let alpha, radius;
          if (lit) {
            const prox = 1 - dist / halfSpan; // 1 at centre → 0 at edge of reach
            alpha = 0.35 + 0.65 * prox * Math.min(1, L * 1.6);
            radius = 1.5 + 1.5 * prox;
            if (alpha > 0.55) {
              ctx.shadowBlur = 8;
              ctx.shadowColor = `rgba(${color}, 0.85)`;
            } else {
              ctx.shadowBlur = 0;
            }
          } else {
            alpha = 0.06; // dim baseline dot
            radius = 1.2;
            ctx.shadowBlur = 0;
          }
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [size, cols, rows, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
