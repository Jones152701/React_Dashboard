import axios from "axios";

/**
 * Central API configuration.
 *
 * - LOCAL DEV  (npm run dev)  → .env.development  → VITE_API_BASE_URL=http://localhost:8000
 * - PRODUCTION (npm run build) → .env.production  → VITE_API_BASE_URL=""  (relative, Nginx proxies)
 */
export const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Pre-configured axios instance — import this everywhere instead of plain fetch().
 *
 *   import api from "../config";
 *   const { data } = await api.get("/social_media/", { params: { from_date, to_date } });
 */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // send cookies on every request (auth)
  timeout: 30_000,         // 30 s safety net
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
