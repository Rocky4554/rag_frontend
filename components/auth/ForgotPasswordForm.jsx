"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, KeyRound, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authAPI } from "@/lib/api";

export default function ForgotPasswordForm() {
  // Steps: email → otp → newPassword → done
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const otpRefs = useRef([]);
  const router = useRouter();

  // ── Step 1: Send OTP ──
  async function handleSendOtp(e) {
    e.preventDefault();
    if (!email) { setError("Please enter your email"); return; }
    setError("");
    setIsLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset code");
    } finally {
      setIsLoading(false);
    }
  }

  // ── OTP input handling ──
  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  }

  // ── Step 2: Verify OTP ──
  async function handleVerifyOtp(e) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { setError("Please enter the 6-digit code"); return; }
    setError("");
    setIsLoading(true);
    try {
      await authAPI.verifyOtp(email, code);
      setStep("newPassword");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired code");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 3: Reset Password ──
  async function handleResetPassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setIsLoading(true);
    try {
      await authAPI.resetPassword(email, otp.join(""), newPassword);
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = cn(
    "w-full rounded-lg border border-border bg-bg-card pl-11 pr-4 py-3",
    "text-text-primary placeholder:text-text-muted",
    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
    "transition-colors disabled:opacity-50"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      <AnimatePresence mode="wait">
        {/* ── Step: Email ── */}
        {step === "email" && (
          <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-7 h-7 text-[#7C3AED]" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Reset Password</h1>
              <p className="text-text-secondary">Enter your email to receive a verification code</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full rounded-lg py-3 px-4 font-semibold text-white cursor-pointer",
                  "bg-gradient-to-r from-primary to-accent",
                  "hover:opacity-90 transition-opacity",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>

            <p className="mt-6 text-center">
              <Link href="/login" className="text-sm font-medium text-primary hover:text-primary-light transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to login
              </Link>
            </p>
          </motion.div>
        )}

        {/* ── Step: OTP ── */}
        {step === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-[#7C3AED]" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Check Your Email</h1>
              <p className="text-text-secondary">
                We sent a 6-digit code to <strong className="text-text-primary">{email}</strong>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* OTP boxes */}
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={isLoading}
                    className={cn(
                      "w-12 h-14 rounded-lg border border-border bg-bg-card text-center text-xl font-bold text-text-primary",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                      "transition-colors disabled:opacity-50"
                    )}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.join("").length !== 6}
                className={cn(
                  "w-full rounded-lg py-3 px-4 font-semibold text-white cursor-pointer",
                  "bg-gradient-to-r from-primary to-accent",
                  "hover:opacity-90 transition-opacity",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Verifying..." : "Verify Code"}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-text-muted">
              Didn&apos;t receive the code?{" "}
              <button
                onClick={handleSendOtp}
                disabled={isLoading}
                className="text-primary font-medium hover:text-primary-light transition-colors cursor-pointer"
              >
                Resend
              </button>
            </p>
          </motion.div>
        )}

        {/* ── Step: New Password ── */}
        {step === "newPassword" && (
          <motion.div key="newPassword" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED]/10 to-[#0EA5E9]/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-[#7C3AED]" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">New Password</h1>
              <p className="text-text-secondary">Set a strong password for your account</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">{error}</div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full rounded-lg py-3 px-4 font-semibold text-white cursor-pointer",
                  "bg-gradient-to-r from-primary to-accent",
                  "hover:opacity-90 transition-opacity",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#22C55E]/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#22C55E]" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Password Reset!</h1>
              <p className="text-text-secondary mb-8">
                Your password has been changed successfully. You can now log in with your new password.
              </p>
              <button
                onClick={() => router.push("/login")}
                className={cn(
                  "w-full rounded-lg py-3 px-4 font-semibold text-white cursor-pointer",
                  "bg-gradient-to-r from-primary to-accent",
                  "hover:opacity-90 transition-opacity"
                )}
              >
                Go to Login
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
