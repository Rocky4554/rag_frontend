"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { chatAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { useAuth } from "@/lib/auth-context";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const { activeSession } = useSession();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const sessionId = activeSession?.sessionId;

  // Load chat history on mount
  useEffect(() => {
    if (!sessionId) {
      setLoadingHistory(false);
      return;
    }

    chatAPI.getHistory(sessionId)
      .then(({ data }) => {
        if (data.history?.length) {
          setMessages(
            data.history.map((msg, i) => ({
              id: msg.id || i,
              role: msg.role === "ai" ? "ai" : "user",
              content: msg.content,
            }))
          );
        } else {
          // Welcome message
          setMessages([{
            id: "welcome",
            role: "ai",
            content: `Hello! I've analyzed your document **${activeSession.filename}**. I can help you understand its contents, answer questions, or summarize key sections. What would you like to know?`,
          }]);
        }
      })
      .catch(() => {
        setMessages([{
          id: "welcome",
          role: "ai",
          content: `Hello! I've analyzed your document **${activeSession.filename}**. Ask me anything about it!`,
        }]);
      })
      .finally(() => setLoadingHistory(false));
  }, [sessionId, activeSession?.filename]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!sessionId) {
      setError("No document uploaded. Please upload a PDF first.");
      return;
    }

    const userMsg = { id: Date.now(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError("");
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const { data } = await chatAPI.send(sessionId, userMsg.content);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "ai", content: data.answer },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-[#7C3AED]" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">No Document Loaded</h2>
        <p className="text-sm text-text-muted mb-4">Upload a PDF first to start chatting with it.</p>
        <a href="/upload" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Upload Document
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i < 5 ? i * 0.05 : 0 }}
              className={`flex gap-3 max-w-3xl ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              {msg.role === "ai" ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#9333EA] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-semibold">{initials}</span>
                </div>
              )}

              {/* Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[520px] ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white"
                    : "bg-bg-card border border-border text-text-primary"
                }`}
              >
                {msg.content.split("\n").map((line, j) => (
                  <p key={j} className={j > 0 ? "mt-2" : ""}>
                    {line.split(/(\*\*.*?\*\*)/g).map((part, k) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={k}>{part.slice(2, -2)}</strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                ))}
              </div>
            </motion.div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-bg-card border border-border">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-3xl p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-bg-card px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your document..."
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-xl border border-border bg-bg-surface px-4 py-3 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#7C3AED]/50 focus:ring-1 focus:ring-[#7C3AED]/20 disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center text-white hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
