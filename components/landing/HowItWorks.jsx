"use client";

import { motion } from "framer-motion";
import { Upload, Cpu, GraduationCap } from "lucide-react";
import GradientText from "@/components/shared/GradientText";

const steps = [
  {
    number: "1",
    icon: Upload,
    title: "Upload Your Documents",
    description:
      "Drag and drop your PDFs, lecture notes, or study materials. We support all major document formats.",
  },
  {
    number: "2",
    icon: Cpu,
    title: "AI Processes & Indexes",
    description:
      "Our AI analyzes, chunks, and indexes your content using state-of-the-art retrieval-augmented generation.",
  },
  {
    number: "3",
    icon: GraduationCap,
    title: "Learn & Practice",
    description:
      "Chat with your docs, take quizzes, listen to summaries, or run mock interviews — all powered by your content.",
  },
];

function StepCard({ step, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="flex flex-col items-center text-center"
    >
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
          <step.icon className="h-7 w-7 text-white" />
        </div>
        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-bg-card text-xs font-bold text-primary shadow-md ring-2 ring-border">
          {step.number}
        </span>
      </div>

      <h3 className="mb-3 text-xl font-semibold text-text-primary">
        {step.title}
      </h3>
      <p className="max-w-xs text-text-secondary leading-relaxed">
        {step.description}
      </p>
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative bg-bg-surface py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold tracking-wider text-primary">
            HOW IT WORKS
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl md:text-5xl">
            Get started in <GradientText>three simple steps</GradientText>
          </h2>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3 md:gap-12">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
