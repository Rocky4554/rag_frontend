"use client";

import Sidebar, { SidebarProvider } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="flex h-[100dvh] overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <main className="flex-1 overflow-y-auto bg-bg-page p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
