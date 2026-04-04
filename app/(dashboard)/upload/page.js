"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Image,
  Type,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ClipboardPaste,
} from "lucide-react";
import { uploadAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { getUserFriendlyError } from "@/lib/utils";

const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
};

const ACCEPT_STRING = ".pdf,.png,.jpg,.jpeg,.webp,.gif";
const MAX_SIZE_MB = 20;

function getFileTypeIcon(file) {
  if (!file) return Upload;
  if (file.type === "application/pdf") return FileText;
  if (file.type.startsWith("image/")) return Image;
  return FileText;
}

function getFileTypeLabel(file) {
  if (!file) return "";
  if (file.type === "application/pdf") return "PDF Document";
  if (file.type.startsWith("image/")) return "Image";
  return "File";
}

const tabs = [
  { id: "upload", label: "Upload Files", icon: Upload },
  { id: "text", label: "Paste Text", icon: ClipboardPaste },
];

// Stagger children animation
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  // Text tab state
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [processingText, setProcessingText] = useState(false);

  const { setSession } = useSession();
  const router = useRouter();

  const validateFile = useCallback((f) => {
    if (!f) return "No file selected";
    if (!ACCEPTED_TYPES[f.type]) {
      return "Unsupported file type. Please upload a PDF or image file.";
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File size exceeds ${MAX_SIZE_MB}MB limit.`;
    }
    return null;
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      const err = validateFile(droppedFile);
      if (err) {
        setError(err);
      } else {
        setFile(droppedFile);
        setError("");
      }
    },
    [validateFile]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const selected = e.target.files[0];
      if (selected) {
        const err = validateFile(selected);
        if (err) {
          setError(err);
          return;
        }
        setFile(selected);
        setError("");
      }
    },
    [validateFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError("");

    try {
      const { data } = await uploadAPI.uploadFile(file, (progressEvent) => {
        const pct = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(pct);
      });

      setSession({
        sessionId: data.sessionId,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      });

      router.push("/dashboard");
    } catch (err) {
      setError(
        getUserFriendlyError(err, "Upload failed. Please try again.")
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      setError("Please enter some text to process.");
      return;
    }
    if (!textTitle.trim()) {
      setError("Please enter a title for your text.");
      return;
    }

    setProcessingText(true);
    setError("");

    try {
      const { data } = await uploadAPI.uploadText(
        textContent.trim(),
        textTitle.trim()
      );

      setSession({
        sessionId: data.sessionId,
        filename: textTitle.trim(),
        uploadedAt: new Date().toISOString(),
      });

      router.push("/dashboard");
    } catch (err) {
      setError(
        getUserFriendlyError(err, "Processing failed. Please try again.")
      );
    } finally {
      setProcessingText(false);
    }
  };

  const FileIcon = file ? getFileTypeIcon(file) : Upload;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto py-8 px-4"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Upload Content
            </h1>
            <p className="text-sm text-gray-400">
              Add files or text to start learning with AI
            </p>
          </div>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <motion.div variants={item} className="mb-6">
        <div className="inline-flex gap-1 p-1 bg-gray-100 rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError("");
              }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeUploadTab"
                  className="absolute inset-0 bg-white rounded-xl shadow-sm"
                  transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={item}>
        <AnimatePresence mode="wait">
          {activeTab === "upload" ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Dropzone */}
              <motion.div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                animate={{ scale: isDragging ? 1.01 : 1 }}
                className={`relative flex flex-col items-center justify-center p-16 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer group ${
                  isDragging
                    ? "border-teal-400 bg-teal-50/60"
                    : "border-gray-200 hover:border-teal-300 hover:bg-gray-50/50 bg-white"
                }`}
                onClick={() =>
                  !uploading &&
                  document.getElementById("file-input")?.click()
                }
              >
                <input
                  id="file-input"
                  type="file"
                  accept={ACCEPT_STRING}
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Decorative ring */}
                <motion.div
                  animate={{
                    y: isDragging ? -8 : 0,
                    scale: isDragging ? 1.1 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative mb-6"
                >
                  <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-teal-400/20 blur-xl group-hover:bg-teal-400/30 transition-colors" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/25">
                    <Upload className="w-7 h-7 text-white" />
                  </div>
                </motion.div>

                <p className="text-gray-800 font-semibold text-lg mb-1">
                  Drop your files here
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  or click anywhere to browse
                </p>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-xs font-medium text-orange-600">
                    <FileText className="w-3.5 h-3.5" />
                    PDF
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-100 text-xs font-medium text-sky-600">
                    <Image className="w-3.5 h-3.5" />
                    Images
                  </span>
                  <span className="text-xs text-gray-300 ml-1">
                    Up to {MAX_SIZE_MB}MB
                  </span>
                </div>
              </motion.div>

              {/* Selected file card */}
              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    className="mt-4 flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <FileIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {getFileTypeLabel(file)} &middot;{" "}
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    {!uploading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setError("");
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress bar */}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        Processing your file...
                      </span>
                      <span className="text-sm font-semibold text-teal-600">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload button */}
              <AnimatePresence>
                {file && !uploading && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload}
                    className="mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-600/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    Upload & Process
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>

              {uploading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                  This may take a moment for large files...
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                {/* Title input */}
                <div className="mb-5">
                  <label
                    htmlFor="text-title"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Title
                  </label>
                  <input
                    id="text-title"
                    type="text"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="e.g. Meeting notes, Study material..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all"
                  />
                </div>

                {/* Textarea */}
                <div className="mb-6">
                  <label
                    htmlFor="text-content"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Content
                  </label>
                  <textarea
                    id="text-content"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste or type your text here..."
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all resize-y min-h-[200px]"
                  />
                  {textContent.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 text-xs text-gray-400"
                    >
                      {textContent.length.toLocaleString()} characters
                    </motion.p>
                  )}
                </div>

                {/* Process Text button */}
                <motion.button
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTextSubmit}
                  disabled={processingText || !textContent.trim() || !textTitle.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-300 text-white font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingText ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Type className="w-4 h-4" />
                      Process Text
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
