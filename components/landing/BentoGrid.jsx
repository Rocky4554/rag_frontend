"use client";

import {
  MessageCircle,
  Headphones,
  Brain,
  Mic,
  FolderOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import GradientText from "@/components/shared/GradientText";

const features = [
  {
    icon: MessageCircle,
    title: "Chat with Your PDFs",
    description:
      "Ask questions about your documents and get accurate, cited answers in real-time. Powered by retrieval-augmented generation.",
    large: true,
  },
  {
    icon: Headphones,
    title: "Voice Summaries",
    description:
      "Listen to AI-generated audio summaries of your documents while on the go.",
    large: false,
  },
  {
    icon: Brain,
    title: "Smart Quizzes",
    description:
      "Auto-generated quizzes that test your comprehension and adapt to your learning pace.",
    large: false,
  },
  {
    icon: Mic,
    title: "Mock Interviews",
    description:
      "Practice interviews with an AI interviewer that references your study materials.",
    large: false,
  },
  {
    icon: FolderOpen,
    title: "Document Library",
    description:
      "Organize, search, and manage all your uploaded documents in one place.",
    large: false,
  },
];

function FeatureCard({ feature, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 ${
        feature.large ? "md:col-span-2" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative z-10">
        <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-3">
          <feature.icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-text-primary">
          {feature.title}
        </h3>
        <p className="text-text-secondary leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function BentoGrid() {
  return (
    <section id="features" className="relative bg-bg-page py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold tracking-wider text-primary">
            FEATURES
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl md:text-5xl">
            Everything you need to{" "}
            <GradientText>learn smarter</GradientText>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-secondary">
            Our AI-powered platform transforms your documents into interactive
            learning tools — from quizzes to voice summaries and beyond.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.slice(0, 2).map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
          {features.slice(2).map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i + 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
