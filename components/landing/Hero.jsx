"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import GradientText from "@/components/shared/GradientText";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-page">
      {/* Mesh gradient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 50% at 80% 50%, rgba(14,165,233,0.10) 0%, transparent 60%), " +
            "radial-gradient(ellipse 50% 40% at 20% 80%, rgba(124,58,237,0.08) 0%, transparent 60%)",
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 py-32 text-center"
      >
        {/* Beta badge */}
        <motion.div variants={item}>
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-1.5 text-sm text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            Beta — Now Available
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="mt-6 text-4xl font-bold leading-tight tracking-tight text-text-primary sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Turn Any Document Into an{" "}
          <GradientText>Interactive Learning Experience</GradientText>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl"
        >
          Upload your PDFs and let AI create quizzes, voice summaries,
          interactive chats, and mock interviews — all in one platform.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <a
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-accent px-8 py-3 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-transform hover:scale-105"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </a>

          <a
            href="#demo"
            className="group relative inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-semibold text-text-primary transition-transform hover:scale-105"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent p-[1.5px]">
              <span className="flex h-full w-full rounded-full bg-bg-page" />
            </span>
            <span className="relative flex items-center gap-2">
              <Play className="h-4 w-4" />
              Watch Demo
            </span>
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
