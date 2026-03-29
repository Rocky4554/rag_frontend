"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Upload, X, Search, Loader2, CheckCircle2,
  Clock, ChevronRight, AlertCircle, FolderOpen, Trash2,
} from "lucide-react";
import { historyAPI, uploadAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";

// ── Animation variants ──────────────────────────────────────────
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring", damping: 28, stiffness: 380 },
  },
  exit: {
    opacity: 0, scale: 0.97, y: 8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, type: "spring", damping: 20, stiffness: 300 },
  }),
  exit: {
    opacity: 0,
    x: -30,
    height: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
    transition: {
      opacity: { duration: 0.15 },
      x: { duration: 0.2, ease: "easeIn" },
      height: { duration: 0.25, delay: 0.1, ease: "easeInOut" },
      paddingTop: { duration: 0.25, delay: 0.1 },
      paddingBottom: { duration: 0.25, delay: 0.1 },
    },
  },
};

const confirmBarVariants = {
  hidden: { opacity: 0, width: 0, marginLeft: 0 },
  visible: {
    opacity: 1, width: "auto", marginLeft: 8,
    transition: { type: "spring", damping: 22, stiffness: 350 },
  },
  exit: {
    opacity: 0, width: 0, marginLeft: 0,
    transition: { duration: 0.15 },
  },
};

const tabIndicatorLayout = { type: "spring", damping: 25, stiffness: 350 };

// ── Main Component ──────────────────────────────────────────────
export default function DocumentSwitcher({ open, onClose }) {
  const [tab, setTab] = useState("existing");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { activeSession, setSession, clearSession } = useSession();
  const router = useRouter();

  // Upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Fetch documents when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSearch("");
    setTab("existing");
    setFile(null);
    setUploadError("");
    setConfirmDeleteId(null);
    setDeleting(null);
    historyAPI.getDocuments()
      .then((r) => setDocs(r.data.documents || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        if (confirmDeleteId) setConfirmDeleteId(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, confirmDeleteId]);

  // ── Select existing document ──────────────────────────────────
  const handleSelect = useCallback((doc) => {
    if (confirmDeleteId) return; // Don't select while confirming delete
    setSession({
      sessionId: doc.sessionId,
      filename: doc.originalName || doc.filename,
      uploadedAt: doc.createdAt,
    });
    onClose();
    router.push("/dashboard");
  }, [setSession, onClose, router, confirmDeleteId]);

  // ── Delete handlers ───────────────────────────────────────────
  const handleDeleteClick = useCallback((e, docSessionId) => {
    e.stopPropagation();
    setConfirmDeleteId((prev) => (prev === docSessionId ? null : docSessionId));
  }, []);

  const handleConfirmDelete = useCallback(async (e, doc) => {
    e.stopPropagation();
    setDeleting(doc.sessionId);
    try {
      await historyAPI.deleteDocument(doc.sessionId);
      // If we deleted the active document, clear the session
      if (activeSession?.sessionId === doc.sessionId) {
        clearSession();
      }
      // Remove from local list with animation
      setDocs((prev) => prev.filter((d) => d.sessionId !== doc.sessionId));
      setConfirmDeleteId(null);
    } catch {
      // Revert on error
      setConfirmDeleteId(null);
    } finally {
      setDeleting(null);
    }
  }, [activeSession, clearSession]);

  const handleCancelDelete = useCallback((e) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  }, []);

  // ── Upload handlers ───────────────────────────────────────────
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setUploadError("");
    } else {
      setUploadError("Only PDF files are allowed");
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed");
      return;
    }
    setFile(selected);
    setUploadError("");
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setUploadError("");
    try {
      const { data } = await uploadAPI.uploadPDF(file, (e) => {
        setProgress(Math.round((e.loaded * 100) / e.total));
      });
      setSession({
        sessionId: data.sessionId,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      });
      onClose();
      router.push("/dashboard");
    } catch (err) {
      setUploadError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Filtered docs ─────────────────────────────────────────────
  const filtered = docs.filter((d) => {
    const name = (d.originalName || d.filename || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const isActive = (doc) => activeSession?.sessionId === doc.sessionId;

  // ── Render ────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-lg font-semibold text-text-primary">
                Switch Document
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="mx-5 flex gap-1 p-1 bg-bg-elevated rounded-xl relative">
              {[
                { id: "existing", label: "My Documents", icon: FolderOpen },
                { id: "upload", label: "Upload New", icon: Upload },
              ].map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); setConfirmDeleteId(null); }}
                    className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors z-10 cursor-pointer ${
                      active ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="tab-bg"
                        className="absolute inset-0 bg-bg-card rounded-lg shadow-sm"
                        transition={tabIndicatorLayout}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Content area */}
            <div className="px-5 pb-5 pt-4">
              <AnimatePresence mode="wait">
                {tab === "existing" ? (
                  <motion.div
                    key="existing"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]/50 transition-all"
                      />
                    </div>

                    {/* Document list */}
                    <div className="max-h-[320px] overflow-y-auto rounded-xl border border-border">
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-5 h-5 animate-spin text-[#7C3AED]" />
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                          <FileText className="w-8 h-8 mb-2 opacity-40" />
                          <p className="text-sm">
                            {search ? "No matching documents" : "No documents uploaded yet"}
                          </p>
                          {!search && (
                            <button
                              onClick={() => setTab("upload")}
                              className="mt-3 text-sm text-[#7C3AED] font-medium hover:underline cursor-pointer"
                            >
                              Upload your first document
                            </button>
                          )}
                        </div>
                      ) : (
                        <AnimatePresence initial={false}>
                          {filtered.map((doc, i) => {
                            const isConfirming = confirmDeleteId === doc.sessionId;
                            const isDeleting = deleting === doc.sessionId;

                            return (
                              <motion.div
                                key={doc.sessionId}
                                custom={i}
                                variants={listItemVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                layout
                                className="border-b border-border-subtle last:border-b-0 overflow-hidden"
                              >
                                <motion.div
                                  onClick={() => handleSelect(doc)}
                                  animate={isDeleting ? { opacity: [0.5, 0.3, 0.5] } : { opacity: 1 }}
                                  transition={isDeleting ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : {}}
                                  className={`flex items-center gap-3 px-4 py-3 transition-all group ${
                                    isDeleting
                                      ? "bg-error/5 pointer-events-none"
                                      : isConfirming
                                        ? "bg-error/5"
                                        : isActive(doc)
                                          ? "bg-[#7C3AED]/5 cursor-pointer"
                                          : "hover:bg-bg-elevated cursor-pointer"
                                  }`}
                                >
                                  {/* Icon */}
                                  <motion.div
                                    animate={isConfirming ? { scale: [1, 0.9, 1], rotate: [0, -3, 3, 0] } : { scale: 1, rotate: 0 }}
                                    transition={isConfirming ? { duration: 0.4 } : {}}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                      isConfirming
                                        ? "bg-error/10"
                                        : isActive(doc)
                                          ? "bg-[#7C3AED]/15"
                                          : "bg-[#7C3AED]/8 group-hover:bg-[#7C3AED]/15"
                                    }`}
                                  >
                                    <FileText className={`w-4 h-4 transition-colors ${
                                      isConfirming
                                        ? "text-error"
                                        : isActive(doc)
                                          ? "text-[#7C3AED]"
                                          : "text-[#7C3AED]/70"
                                    }`} />
                                  </motion.div>

                                  {/* Text */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate transition-colors ${
                                      isConfirming ? "text-error" : "text-text-primary"
                                    }`}>
                                      {doc.originalName || doc.filename}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                      <Clock className="w-3 h-3" />
                                      {new Date(doc.createdAt).toLocaleDateString()}
                                      {doc.chunkCount && (
                                        <span>&middot; {doc.chunkCount} chunks</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right side: active badge / confirm buttons / delete icon */}
                                  <div className="flex items-center shrink-0">
                                    {isActive(doc) && !isConfirming && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#7C3AED]/15 text-[#7C3AED]">
                                        Active
                                      </span>
                                    )}

                                    <AnimatePresence mode="wait">
                                      {isConfirming ? (
                                        <motion.div
                                          key="confirm"
                                          variants={confirmBarVariants}
                                          initial="hidden"
                                          animate="visible"
                                          exit="exit"
                                          className="flex items-center gap-1.5"
                                        >
                                          {isDeleting ? (
                                            <motion.div
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-error/10"
                                            >
                                              <Loader2 className="w-3.5 h-3.5 animate-spin text-error" />
                                              <span className="text-xs font-medium text-error">Deleting...</span>
                                            </motion.div>
                                          ) : (
                                            <>
                                              <motion.button
                                                onClick={(e) => handleConfirmDelete(e, doc)}
                                                whileTap={{ scale: 0.92 }}
                                                className="px-2.5 py-1 rounded-md bg-error text-white text-xs font-medium hover:bg-error/90 transition-colors cursor-pointer"
                                              >
                                                Delete
                                              </motion.button>
                                              <motion.button
                                                onClick={handleCancelDelete}
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
                                          onClick={(e) => handleDeleteClick(e, doc.sessionId)}
                                          whileHover={{ scale: 1.15 }}
                                          whileTap={{ scale: 0.85 }}
                                          className="p-1.5 ml-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-error/10 transition-all cursor-pointer"
                                          title="Delete document"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-error transition-colors" />
                                        </motion.button>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </motion.div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Upload error */}
                    <AnimatePresence>
                      {uploadError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2 overflow-hidden"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {uploadError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Dropzone */}
                    {!file ? (
                      <motion.div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        animate={{
                          scale: isDragging ? 1.02 : 1,
                          borderColor: isDragging ? "#7C3AED" : undefined,
                        }}
                        className={`flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                          isDragging
                            ? "border-[#7C3AED] bg-[#7C3AED]/5"
                            : "border-border hover:border-[#7C3AED]/40 bg-bg-elevated/50"
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <motion.div
                          animate={{ y: isDragging ? -6 : 0 }}
                          className="w-12 h-12 rounded-xl bg-linear-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 flex items-center justify-center mb-3"
                        >
                          <Upload className="w-5 h-5 text-[#7C3AED]" />
                        </motion.div>
                        <p className="text-sm text-text-primary font-medium">
                          Drop PDF here or click to browse
                        </p>
                        <p className="text-xs text-text-muted mt-1">PDF only &middot; Max 20MB</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated border border-border">
                          <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#7C3AED]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                            <p className="text-xs text-text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          {!uploading && (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                              <button
                                onClick={() => { setFile(null); setUploadError(""); }}
                                className="p-1 rounded hover:bg-bg-card cursor-pointer"
                              >
                                <X className="w-4 h-4 text-text-muted" />
                              </button>
                            </>
                          )}
                        </div>

                        {uploading && (
                          <div>
                            <div className="flex justify-between text-xs text-text-muted mb-1.5">
                              <span>Processing...</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full rounded-full bg-linear-to-r from-[#7C3AED] to-[#0EA5E9]"
                              />
                            </div>
                          </div>
                        )}

                        {!uploading && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={handleUpload}
                            className="w-full py-2.5 rounded-xl bg-linear-to-r from-[#7C3AED] to-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Upload & Process
                          </motion.button>
                        )}

                        {uploading && (
                          <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            This may take a moment...
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
