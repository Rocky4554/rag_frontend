"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { sessionAPI } from "./api";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("active_session");
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [restoring, setRestoring] = useState(false);
  const restoredRef = useRef(false);

  // Auto-restore session on mount if we have a saved sessionId
  useEffect(() => {
    if (!activeSession?.sessionId || restoredRef.current) return;
    restoredRef.current = true;

    const token = localStorage.getItem("access_token");
    if (!token) return; // Not logged in, skip restore

    setRestoring(true);
    sessionAPI.restore(activeSession.sessionId)
      .then(({ data }) => {
        if (data.status === 'not_found') {
          // Session can't be restored — clear it
          setActiveSession(null);
          localStorage.removeItem("active_session");
        }
        // 'active' or 'restored' means we're good
      })
      .catch(() => {
        // Silently fail — session may work if server hasn't restarted
      })
      .finally(() => setRestoring(false));
  }, [activeSession?.sessionId]);

  const setSession = useCallback((session) => {
    setActiveSession(session);
    if (session) {
      localStorage.setItem("active_session", JSON.stringify(session));
    } else {
      localStorage.removeItem("active_session");
    }
  }, []);

  const clearSession = useCallback(() => {
    setActiveSession(null);
    localStorage.removeItem("active_session");
  }, []);

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
