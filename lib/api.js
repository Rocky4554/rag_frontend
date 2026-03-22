import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send cookies with every request
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, success = false) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
        processQueue(null, true);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, false);
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth ──
export const authAPI = {
  signup: (email, password, name) =>
    api.post("/api/auth/signup", { email, password, name }),
  login: (email, password) =>
    api.post("/api/auth/login", { email, password }),
  logout: () => api.post("/api/auth/logout"),
  refresh: () => api.post("/api/auth/refresh"),
  getProfile: () => api.get("/api/auth/profile"),
  forgotPassword: (email) =>
    api.post("/api/auth/forgot-password", { email }),
  verifyOtp: (email, otp) =>
    api.post("/api/auth/verify-otp", { email, otp }),
  resetPassword: (email, otp, newPassword) =>
    api.post("/api/auth/reset-password", { email, otp, newPassword }),
};

// ── Upload ──
export const uploadAPI = {
  uploadPDF: (file, onProgress) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return api.post("/api/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
    });
  },
};

// ── Chat ──
export const chatAPI = {
  send: (sessionId, question) =>
    api.post("/api/chat", { sessionId, question }),
  getHistory: (sessionId) =>
    api.get(`/api/chat/history/${sessionId}`),
};

// ── Quiz ──
export const quizAPI = {
  generate: (sessionId, topic = "general", numQuestions = 5) =>
    api.post("/api/quiz", { sessionId, topic, numQuestions }),
};

// ── Summary ──
export const summaryAPI = {
  generate: (sessionId) =>
    api.post("/api/summary", { sessionId }),
};

// ── Interview ──
export const interviewAPI = {
  start: (sessionId, maxQuestions = 5) =>
    api.post("/api/interview/start", { sessionId, maxQuestions }),
};

// ── Tokens ──
export const tokenAPI = {
  getLiveKitToken: (sessionId) =>
    api.post("/api/livekit/token", { sessionId }),
  getDeepgramToken: () =>
    api.get("/api/deepgram/token"),
};

// ── History ──
export const historyAPI = {
  getDocuments: () => api.get("/api/history/documents"),
  getInterviews: (documentId) =>
    api.get("/api/history/interviews", { params: documentId ? { documentId } : {} }),
  getQuizzes: (documentId) =>
    api.get("/api/history/quizzes", { params: documentId ? { documentId } : {} }),
  getActivity: (limit = 20) =>
    api.get("/api/history/activity", { params: { limit } }),
};

// ── Session ──
export const sessionAPI = {
  restore: (sessionId) =>
    api.post("/api/session/restore", { sessionId }),
  status: (sessionId) =>
    api.get(`/api/session/status/${sessionId}`),
  getUserSessions: () =>
    api.get("/api/session/user-sessions"),
};

export default api;
