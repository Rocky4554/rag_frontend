"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText, MessageSquare, Brain, AudioLines, Mic, ArrowRight,
  Calendar, FileType2, Layers, Upload, AlertCircle,
} from "lucide-react";
import { useSession } from "@/lib/session-context";
import { useAuth } from "@/lib/auth-context";
import { historyAPI } from "@/lib/api";
import DocumentSwitcher from "@/components/dashboard/DocumentSwitcher";

const features = [
  {
    title: "Chat with PDF",
    description: "Ask questions and get instant AI-powered answers from your document.",
    icon: MessageSquare,
    color: "#7C3AED",
    href: "/chat",
  },
  {
    title: "Smart Quiz",
    description: "Test your understanding with AI-generated questions and explanations.",
    icon: Brain,
    color: "#F59E0B",
    href: "/quiz",
  },
  {
    title: "Voice Summary",
    description: "Listen to a concise audio summary of your document's key points.",
    icon: AudioLines,
    color: "#0EA5E9",
    href: "/summary",
  },
  {
    title: "AI Interview",
    description: "Practice interview questions generated from your document content.",
    icon: Mic,
    color: "#22C55E",
    href: "/interview",
  },
];

export default function DashboardPage() {
  const { activeSession } = useSession();
  const { user } = useAuth();
  const [recentActivity, setRecentActivity] = useState([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    historyAPI.getActivity(5)
      .then(({ data }) => setRecentActivity(data.activity || []))
      .catch(() => {});
  }, []);

  const actionLabels = {
    document_uploaded: "Uploaded a document",
    chat_sent: "Chatted with document",
    quiz_generated: "Generated a quiz",
    interview_started: "Started an interview",
    interview_completed: "Completed an interview",
    summary_generated: "Generated a summary",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {activeSession ? "Continue learning from your document" : "Upload a document to get started"}
        </p>
      </motion.div>

      {/* Active Document Card */}
      {activeSession ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative rounded-2xl border border-[#7C3AED]/20 bg-gradient-to-r from-[#7C3AED]/5 via-transparent to-[#0EA5E9]/5 p-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {activeSession.filename}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-text-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(activeSession.uploadedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileType2 className="w-3.5 h-3.5" />
                    PDF
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSwitcherOpen(true)}
              className="px-5 py-2 rounded-lg border border-[#7C3AED]/30 text-sm font-medium text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors cursor-pointer"
            >
              Change Document
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative rounded-2xl border-2 border-dashed border-border bg-bg-card p-8 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 flex items-center justify-center mb-4">
            <Upload className="w-7 h-7 text-[#7C3AED]" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No document selected</h3>
          <p className="text-sm text-text-muted mb-4">Select a document or add a new one to unlock all learning features</p>
          <button
            onClick={() => setSwitcherOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Select Document
          </button>
        </motion.div>
      )}

      {/* Section title */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary">
          What would you like to do?
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Choose a feature to start learning from your document
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature, i) => {
          const Icon = feature.icon;
          const disabled = !activeSession;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className={`group bg-bg-card border border-border rounded-2xl p-5 transition-all ${
                disabled
                  ? "opacity-50"
                  : "hover:border-[#7C3AED]/30 hover:shadow-lg hover:shadow-[#7C3AED]/5"
              }`}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${feature.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: feature.color }} />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1.5">
                {feature.title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                {feature.description}
              </p>
              {disabled ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bg-elevated text-text-muted text-xs font-medium">
                  Upload first
                </span>
              ) : (
                <Link
                  href={feature.href}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Start
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
          <div className="bg-bg-card border border-border rounded-2xl divide-y divide-border">
            {recentActivity.map((a) => (
              <div key={a.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <span className="text-sm text-text-primary flex-1">
                  {actionLabels[a.action] || a.action}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Document switcher modal */}
      <DocumentSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}
