"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, Upload, MessageSquare, Brain, AudioLines, Mic,
  History, User, LogOut, X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload Document", href: "/upload", icon: Upload },
  { label: "Chat with PDF", href: "/chat", icon: MessageSquare },
  { label: "Quiz", href: "/quiz", icon: Brain },
  { label: "Voice Summary", href: "/summary", icon: AudioLines },
  { label: "AI Interview", href: "/interview", icon: Mic },
];

const bottomNavItems = [
  { label: "History", href: "/history", icon: History },
  { label: "Profile", href: "/profile", icon: User },
];

// Context so Topbar can toggle the sidebar
const SidebarContext = createContext({ open: false, toggle: () => {}, close: () => {} });
export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <SidebarContext.Provider value={{ open, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { open, close } = useSidebar();

  function isActive(href) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9]" />
          <span className="text-lg font-bold text-text-primary">RAG Learn</span>
        </div>
        {/* Close button — mobile only */}
        <button onClick={close} className="md:hidden p-1 rounded-lg hover:bg-bg-elevated transition-colors cursor-pointer">
          <X className="w-5 h-5 text-text-muted" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col px-3 py-2 gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-gradient-to-r from-[#7C3AED]/10 to-[#0EA5E9]/5 text-[#7C3AED]"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-3 border-t border-border-subtle" />

        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-gradient-to-r from-[#7C3AED]/10 to-[#0EA5E9]/5 text-[#7C3AED]"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Log out</span>
        </button>
      </nav>

      {/* User card */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-text-muted truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen bg-bg-card border-r border-border shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={close}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />
          {/* Drawer */}
          <aside
            className="relative z-50 flex flex-col w-[280px] h-full bg-bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
