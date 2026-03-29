"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, MessageSquare, Brain, Mic, Clock, Loader2, ChevronRight, Trash2,
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
  const { activeSession, setSession, clearSession } = useSession();
  const router = useRouter();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(null);

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
    router.push('/chat');
  };

  const handleSelectInterview = (item) => {
    setSession({
      sessionId: item.sessionId,
      filename: item.documentName || 'Document',
      uploadedAt: item.createdAt,
    });
    router.push('/interview');
  };

  const handleSelectQuiz = (item) => {
    if (!item.sessionId) return;
    setSession({
      sessionId: item.sessionId,
      filename: item.documentName || 'Document',
      uploadedAt: item.createdAt,
    });
    router.push('/quiz');
  };

  const handleDeleteDocument = async (e, doc) => {
    e.stopPropagation();
    if (confirmDeleteId !== doc.sessionId) {
      setConfirmDeleteId(doc.sessionId);
      return;
    }
    setDeleting(doc.sessionId);
    try {
      await historyAPI.deleteDocument(doc.sessionId);
      if (activeSession?.sessionId === doc.sessionId) clearSession();
      setData((prev) => prev.filter((d) => d.sessionId !== doc.sessionId));
      setConfirmDeleteId(null);
    } catch {
      setConfirmDeleteId(null);
    } finally {
      setDeleting(null);
    }
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
            {activeTab === "documents" && (
              <AnimatePresence initial={false}>
                {data.map((doc) => {
                  const isConfirming = confirmDeleteId === doc.sessionId;
                  const isDeleting = deleting === doc.sessionId;
                  return (
                    <motion.div
                      key={doc.sessionId}
                      layout
                      exit={{ opacity: 0, x: -30, height: 0, transition: { opacity: { duration: 0.15 }, height: { duration: 0.25, delay: 0.1 } } }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        animate={isDeleting ? { opacity: [0.5, 0.3, 0.5] } : { opacity: 1 }}
                        transition={isDeleting ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : {}}
                        onClick={() => !isConfirming && !isDeleting && handleSelectDocument(doc)}
                        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors group ${
                          isDeleting
                            ? "bg-error/5 pointer-events-none"
                            : isConfirming
                              ? "bg-error/5"
                              : "hover:bg-bg-elevated cursor-pointer"
                        }`}
                      >
                        <motion.div
                          animate={isConfirming ? { scale: [1, 0.9, 1], rotate: [0, -3, 3, 0] } : {}}
                          transition={isConfirming ? { duration: 0.4 } : {}}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isConfirming ? "bg-error/10" : "bg-[#7C3AED]/10"
                          }`}
                        >
                          <FileText className={`w-5 h-5 transition-colors ${isConfirming ? "text-error" : "text-[#7C3AED]"}`} />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate transition-colors ${isConfirming ? "text-error" : "text-text-primary"}`}>
                            {doc.originalName || doc.filename}
                          </p>
                          <p className="text-xs text-text-muted">
                            {doc.chunkCount} chunks &middot; {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <AnimatePresence mode="wait">
                          {isConfirming ? (
                            <motion.div
                              key="confirm"
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ type: "spring", damping: 22, stiffness: 350 }}
                              className="flex items-center gap-1.5 shrink-0"
                            >
                              {isDeleting ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-error/10">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-error" />
                                  <span className="text-xs font-medium text-error">Deleting...</span>
                                </motion.div>
                              ) : (
                                <>
                                  <motion.button
                                    onClick={(e) => handleDeleteDocument(e, doc)}
                                    whileTap={{ scale: 0.92 }}
                                    className="px-2.5 py-1 rounded-md bg-error text-white text-xs font-medium hover:bg-error/90 transition-colors cursor-pointer"
                                  >
                                    Delete
                                  </motion.button>
                                  <motion.button
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                    whileTap={{ scale: 0.92 }}
                                    className="px-2.5 py-1 rounded-md bg-bg-elevated text-text-secondary text-xs font-medium hover:bg-border transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </motion.button>
                                </>
                              )}
                            </motion.div>
                          ) : (
                            <motion.button
                              key="trash"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(doc.sessionId); }}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.85 }}
                              className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-error/10 transition-all cursor-pointer shrink-0"
                              title="Delete document"
                            >
                              <Trash2 className="w-5 h-5 text-text-muted hover:text-error transition-colors" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {activeTab === "interviews" &&
              data.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectInterview(item)}
                  className="w-full px-5 py-4 hover:bg-bg-elevated transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                      <Mic className="w-4 h-4 text-[#22C55E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {item.documentName || "Interview"} — {item.questionsAsked || 0} questions
                      </p>
                      <p className="text-xs text-text-muted">
                        {item.difficultyLevel || "medium"} &middot; {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  </div>
                  {item.finalReport && (
                    <p className="text-xs text-text-secondary pl-11 line-clamp-2">
                      {item.finalReport.slice(0, 200)}...
                    </p>
                  )}
                </button>
              ))}

            {activeTab === "quizzes" &&
              data.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectQuiz(item)}
                  disabled={!item.sessionId}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-bg-elevated transition-colors text-left cursor-pointer disabled:cursor-default disabled:opacity-60"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                    <Brain className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.documentName ? `${item.documentName} — ` : ""}{item.topic || "General"} Quiz
                    </p>
                    <p className="text-xs text-text-muted">
                      {item.totalQuestions} questions &middot; {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {item.score !== null && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#22C55E]/10 text-[#22C55E] shrink-0">
                      {item.score}/{item.totalQuestions}
                    </span>
                  )}
                  {item.sessionId && <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />}
                </button>
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
