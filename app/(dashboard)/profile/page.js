"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Mail, FileText, Brain, Mic, Clock, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authAPI, historyAPI } from "@/lib/api";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ documents: 0, interviews: 0, quizzes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authAPI.getProfile().then((r) => r.data).catch(() => null),
      historyAPI.getDocuments().then((r) => r.data.documents?.length || 0).catch(() => 0),
      historyAPI.getInterviews().then((r) => r.data.results?.length || 0).catch(() => 0),
      historyAPI.getQuizzes().then((r) => r.data.results?.length || 0).catch(() => 0),
    ]).then(([profileData, docCount, interviewCount, quizCount]) => {
      if (profileData) setProfile(profileData);
      setStats({ documents: docCount, interviews: interviewCount, quizzes: quizCount });
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  const statItems = [
    { label: "Documents", value: stats.documents, icon: FileText, color: "#7C3AED" },
    { label: "Interviews", value: stats.interviews, icon: Mic, color: "#22C55E" },
    { label: "Quizzes", value: stats.quizzes, icon: Brain, color: "#F59E0B" },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-text-primary mb-8">Profile</h1>

        {/* User card */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#0EA5E9] flex items-center justify-center text-white text-xl font-bold">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {user?.name || "User"}
              </h2>
              <p className="text-sm text-text-muted flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {statItems.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="p-4 rounded-xl bg-bg-elevated text-center">
                  <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                  <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                  <p className="text-xs text-text-muted">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent documents from profile */}
        {profile?.documents?.length > 0 && (
          <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Recent Documents</h3>
            <div className="space-y-3">
              {profile.documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#7C3AED]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {doc.originalName || doc.filename}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-border text-text-primary font-medium flex items-center justify-center gap-2 hover:bg-bg-elevated transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </motion.div>
    </div>
  );
}
