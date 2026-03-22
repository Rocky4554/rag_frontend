"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, FileText } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { useAuth } from "@/lib/auth-context";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/upload": "Upload Document",
  "/chat": "Chat with PDF",
  "/quiz": "Quiz",
  "/summary": "Voice Summary",
  "/interview": "AI Interview",
  "/history": "History",
  "/profile": "Profile",
};

export default function Topbar() {
  const pathname = usePathname();
  const { activeSession } = useSession();
  const { user } = useAuth();
  const pageTitle = pageTitles[pathname] || "Dashboard";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-bg-card border-b border-border shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Dashboard</span>
        {pageTitle !== "Dashboard" && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-primary font-medium">{pageTitle}</span>
          </>
        )}
      </div>

      {/* Active document pill */}
      {activeSession && (
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full border border-[#7C3AED]/30 bg-gradient-to-r from-[#7C3AED]/5 to-[#0EA5E9]/5">
          <FileText className="w-4 h-4 text-[#7C3AED]" />
          <span className="text-sm text-text-primary font-medium truncate max-w-[180px]">
            {activeSession.filename}
          </span>
          <Link href="/upload" className="text-xs text-[#7C3AED] font-medium hover:underline">
            Change
          </Link>
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-bg-elevated transition-colors">
          <Bell className="w-5 h-5 text-text-secondary" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center text-white text-xs font-semibold">
          {initials}
        </div>
      </div>
    </header>
  );
}
