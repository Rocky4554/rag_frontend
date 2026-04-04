import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Convert raw API/network errors into user-friendly messages.
 * Never show stack traces, technical details, or raw error strings to users.
 */
const FRIENDLY_MESSAGES = {
  // Auth
  "invalid email or password": "Invalid email or password. Please try again.",
  "email already registered": "This email is already registered. Try signing in instead.",
  "passwords do not match": "Passwords do not match.",
  // Upload
  "only pdf files are allowed": "Only PDF files are allowed.",
  "unsupported file type": "This file type is not supported. Please upload a PDF or image.",
  // Session
  "session not found": "Your session has expired. Please upload your document again.",
  // Mic
  "microphone access denied": "Microphone access was denied. Please allow microphone permission in your browser and try again.",
  // Rate limit
  "too many requests": "You're sending requests too fast. Please wait a moment and try again.",
  "rate limit": "You're sending requests too fast. Please wait a moment and try again.",
  "quota exceeded": "The service is temporarily at capacity. Please try again in a few minutes.",
};

export function getUserFriendlyError(err, fallback = "Something went wrong. Please try again.") {
  // Extract the raw message from various error shapes
  const raw =
    err?.response?.data?.error ||
    err?.message ||
    (typeof err === "string" ? err : "");

  if (!raw) return fallback;

  const lower = raw.toLowerCase();

  // Check for known friendly mappings
  for (const [key, friendly] of Object.entries(FRIENDLY_MESSAGES)) {
    if (lower.includes(key)) return friendly;
  }

  // Network errors
  if (lower.includes("network error") || lower.includes("failed to fetch") || lower.includes("err_connection")) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  // Timeout
  if (lower.includes("timeout")) {
    return "The request took too long. Please try again.";
  }

  // 500-level or generic server errors — don't expose details
  const status = err?.response?.status;
  if (status >= 500) {
    return "Something went wrong on our end. Please try again in a moment.";
  }

  // If the raw message is short and doesn't look technical, use it
  if (raw.length < 100 && !raw.includes("Error:") && !raw.includes("at ") && !raw.includes("http")) {
    return raw;
  }

  return fallback;
}
