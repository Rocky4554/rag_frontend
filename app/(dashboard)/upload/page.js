"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, FileText, X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { uploadAPI } from "@/lib/api";
import { useSession } from "@/lib/session-context";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const { setSession } = useSession();
  const router = useRouter();

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setError("");
    } else {
      setError("Only PDF files are allowed");
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return;
      }
      setFile(selected);
      setError("");
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError("");

    try {
      const { data } = await uploadAPI.uploadPDF(file, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(pct);
      });

      // Store the session info
      setSession({
        sessionId: data.sessionId,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Upload Document
        </h1>
        <p className="text-text-muted mb-8">
          Upload a PDF to start learning with AI-powered tools
        </p>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Dropzone */}
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          animate={{
            scale: isDragging ? 1.02 : 1,
            borderColor: isDragging ? "#7C3AED" : undefined,
          }}
          className={`relative flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed transition-colors cursor-pointer ${
            isDragging
              ? "border-[#7C3AED] bg-[#7C3AED]/5"
              : "border-border hover:border-[#7C3AED]/40 bg-bg-card"
          }`}
          onClick={() => !uploading && document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileSelect}
          />

          <motion.div
            animate={{ y: isDragging ? -8 : 0 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 flex items-center justify-center mb-5"
          >
            <Upload className="w-7 h-7 text-[#7C3AED]" />
          </motion.div>

          <p className="text-text-primary font-medium mb-1">
            Drag & drop your PDF here
          </p>
          <p className="text-sm text-text-muted mb-4">
            or click to browse files
          </p>

          <span className="inline-flex items-center px-3 py-1 rounded-full bg-bg-elevated text-xs text-text-muted">
            PDF only &middot; Max 20MB
          </span>
        </motion.div>

        {/* Uploaded file */}
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-4 p-4 rounded-xl bg-bg-card border border-border"
          >
            <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {file.name}
              </p>
              <p className="text-xs text-text-muted">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!uploading && (
              <>
                <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError("");
                  }}
                  className="p-1 rounded hover:bg-bg-elevated"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Progress bar */}
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">Processing document...</span>
              <span className="text-sm text-text-muted">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9]"
              />
            </div>
          </motion.div>
        )}

        {/* Upload button */}
        {file && !uploading && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleUpload}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#0EA5E9] text-white font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Upload & Process Document
          </motion.button>
        )}

        {uploading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            This may take a moment for large documents...
          </div>
        )}
      </motion.div>
    </div>
  );
}
