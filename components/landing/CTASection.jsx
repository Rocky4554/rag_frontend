"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import GradientText from "@/components/shared/GradientText";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-bg-page py-24 md:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 30% 50%, rgba(124,58,237,0.12) 0%, transparent 60%), " +
            "radial-gradient(ellipse 60% 50% at 70% 60%, rgba(14,165,233,0.10) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl md:text-5xl">
          Ready to Transform{" "}
          <GradientText>How You Learn?</GradientText>
        </h2>

        <p className="mt-6 max-w-xl text-lg text-text-secondary">
          Join thousands of students and professionals who are already using RAG
          Learn to study smarter, not harder.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
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
        </div>

        <p className="mt-6 text-sm text-text-muted">
          No credit card required &middot; Free forever for individuals
        </p>
      </motion.div>
    </section>
  );
}
