"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText, MessageSquare, Brain, Mic, Clock, Loader2, ChevronRight,
} from "lucide-react";
import { historyAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";

const tabs = [
  { id: "documents", label: "Documents", icon: FileText },
  { id: "interviews", label: "Interviews", icon: Mic },
  { id: "quizzes", label: "Quizzes", icon: Brain },
  { id: "activity", label: "Activity", icon: Clock },
];

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState("documents");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setSession } = useSession();

  useEffect(() => {
    setLoading(true);
    const fetchers = {
      documents: () => historyAPI.getDocuments().then((r) => r.data.documents || []),
      interviews: () => historyAPI.getInterviews().then((r) => r.data.results || []),
      quizzes: () => historyAPI.getQuizzes().then((r) => r.data.results || []),
      activity: () => historyAPI.getActivity(50).then((r) => r.data.activity || []),
    };

    fetchers[activeTab]()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  const handleSelectDocument = (doc) => {
    setSession({
      sessionId: doc.sessionId,
      filename: doc.originalName || doc.filename,
      uploadedAt: doc.createdAt,
    });
  };

  const actionLabels = {
    document_uploaded: "Uploaded a document",
    chat_sent: "Chatted with document",
    quiz_generated: "Generated a quiz",
    interview_started: "Started an interview",
    interview_completed: "Completed an interview",
    summary_generated: "Generated a summary",
  };

  return (
    <div className="max-w-4xl mx-auto py-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary mb-2">History</h1>
        <p className="text-text-muted mb-6">View your past documents, interviews, quizzes, and activity</p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-bg-elevated rounded-xl mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-bg-card text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted">No {activeTab} found yet.</p>
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-2xl divide-y divide-border">
            {activeTab === "documents" &&
              data.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDocument(doc)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-bg-elevated transition-colors text-left cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-[#7C3AED]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {doc.originalName || doc.filename}
                    </p>
                    <p className="text-xs text-text-muted">
                      {doc.chunkCount} chunks &middot; {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
              ))}

            {activeTab === "interviews" &&
              data.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-[#22C55E]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        Interview — {item.questionsAsked || 0} questions
                      </p>
                      <p className="text-xs text-text-muted">
                        {item.difficultyLevel || "medium"} &middot; {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {item.finalReport && (
                    <p className="text-xs text-text-secondary pl-11 line-clamp-2">
                      {item.finalReport.slice(0, 200)}...
                    </p>
                  )}
                </div>
              ))}

            {activeTab === "quizzes" &&
              data.map((item) => (
                <div key={item.id} className="px-5 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {item.topic || "General"} Quiz
                    </p>
                    <p className="text-xs text-text-muted">
                      {item.totalQuestions} questions &middot; {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {item.score !== null && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#22C55E]/10 text-[#22C55E]">
                      {item.score}/{item.totalQuestions}
                    </span>
                  )}
                </div>
              ))}

            {activeTab === "activity" &&
              data.map((a) => (
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
        )}
      </motion.div>
    </div>
  );
}
