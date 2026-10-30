"use client";

import { io } from "socket.io-client";
import { authAPI } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

let socket = null;
let registeredSessionId = null;
const refreshRetried = new Set(); // sessionIds already retried after register_error (retry once, no loops)

export function getSocket() {
  if (!socket) {
    socket = io(API_BASE_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true, // send auth cookie so the server can verify session ownership
    });
    // Server-side rooms don't survive a reconnect — re-join after every (re)connect
    socket.on("connect", () => {
      if (registeredSessionId) socket.emit("register_session", registeredSessionId);
    });
    // Registration refused (missing/expired auth cookie): refresh it, then reconnect so the
    // new cookie is sent in the handshake; the "connect" handler above re-registers.
    socket.on("register_error", async (payload) => {
      const id = payload?.sessionId || registeredSessionId;
      if (!id || id !== registeredSessionId || refreshRetried.has(id)) return;
      refreshRetried.add(id);
      try {
        await authAPI.refresh();
      } catch {
        return; // refresh failed — the api layer handles redirecting to login
      }
      if (registeredSessionId !== id) return; // session changed or socket torn down meanwhile
      socket.disconnect();
      socket.connect();
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  registeredSessionId = null;
  refreshRetried.clear();
  // Also covers a socket still mid-handshake (connected is false until it finishes)
  socket?.disconnect();
}

export function registerSession(sessionId) {
  registeredSessionId = sessionId;
  const s = connectSocket();
  // If still connecting, the "connect" handler registers it
  if (s.connected) s.emit("register_session", sessionId);
  return s;
}
