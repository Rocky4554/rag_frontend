"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password || !name) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await signup(email, password, name);
      router.push("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Create your account
        </h1>
        <p className="text-text-secondary">
          Join thousands of learners and start your journey
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full name */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className={cn(
              "w-full rounded-lg border border-border bg-bg-card pl-11 pr-4 py-3",
              "text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "transition-colors disabled:opacity-50"
            )}
          />
        </div>

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={cn(
              "w-full rounded-lg border border-border bg-bg-card pl-11 pr-4 py-3",
              "text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "transition-colors disabled:opacity-50"
            )}
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className={cn(
              "w-full rounded-lg border border-border bg-bg-card pl-11 pr-4 py-3",
              "text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "transition-colors disabled:opacity-50"
            )}
          />
        </div>

        {/* Confirm password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            className={cn(
              "w-full rounded-lg border border-border bg-bg-card pl-11 pr-4 py-3",
              "text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "transition-colors disabled:opacity-50"
            )}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full rounded-lg py-3 px-4 font-semibold text-white cursor-pointer",
            "bg-gradient-to-r from-primary to-accent",
            "hover:opacity-90 transition-opacity",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary-light transition-colors"
        >
          Log in
        </Link>
      </p>
    </motion.div>
  );
}
