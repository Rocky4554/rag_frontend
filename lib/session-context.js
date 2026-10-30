"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { sessionAPI } from "./api";
import { useAuth } from "./auth-context";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [storedSession, setStoredSession] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("active_session");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // A stored document belongs to whoever was logged in when it was picked (ownerUserId);
  // after logout or an account switch it's hidden, so the next user never inherits it.
  // Anonymous uploads (ownerUserId null/absent) stay visible.
  const userId = user?.id ?? null;
  const activeSession =
    storedSession && (authLoading || !storedSession.ownerUserId || storedSession.ownerUserId === userId)
      ? storedSession
      : null;

  const [restoreDone, setRestoreDone] = useState(false);
  const restoredRef = useRef(false);
  const restoring = !restoreDone && !authLoading && !!activeSession?.sessionId;

  const clearSession = useCallback(() => {
    setStoredSession(null);
    localStorage.removeItem("active_session");
  }, []);

  // Auto-restore session on mount if we have a saved sessionId.
  // Waits for auth so the (possibly refreshed) cookie is sent — the server
  // only restores documents owned by the requesting user.
  useEffect(() => {
    if (authLoading || !activeSession?.sessionId || restoredRef.current) return;
    restoredRef.current = true;

    sessionAPI.restore(activeSession.sessionId)
      .then(({ data }) => {
        // Session can't be restored — clear it. 'active' or 'restored' means we're good
        if (data.status === 'not_found') clearSession();
      })
      .catch(() => {
        // Silently fail — session may work if server hasn't restarted
      })
      .finally(() => setRestoreDone(true));
  }, [authLoading, activeSession?.sessionId, clearSession]);

  const setSession = useCallback((session) => {
    if (!session) {
      clearSession();
      return;
    }
    const owned = { ...session, ownerUserId: userId };
    setStoredSession(owned);
    localStorage.setItem("active_session", JSON.stringify(owned));
  }, [userId, clearSession]);

  return (
    <SessionContext.Provider value={{ activeSession, setSession, clearSession, restoring }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
