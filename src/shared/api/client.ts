import axios from "axios";

// Prefer env; otherwise default to "/api" (works with Vercel rewrites)
// You can point to local by setting REACT_APP_API_LOCAL_URL.
// Additionally, a runtime override is supported for quick toggling without rebuild:
//   localStorage.setItem('API_BASE_OVERRIDE', 'http://localhost:5001'); location.reload();
let baseURL =
  process.env.REACT_APP_API_LOCAL_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  "/api";
try {
  const override = typeof localStorage !== 'undefined' ? localStorage.getItem('API_BASE_OVERRIDE') : null;
  if (override && /^https?:\/\//i.test(override)) baseURL = override;
} catch {}
const AUTH_MODE = (process.env.REACT_APP_AUTH_MODE || "header").toLowerCase(); // 'header' | 'cookie'
const DEBUG_AUTH =
  String(process.env.REACT_APP_DEBUG_AUTH || "").toLowerCase() === "true" ||
  process.env.REACT_APP_DEBUG_AUTH === "1";

function maskToken(t?: string | null) {
  if (!t) return "null";
  const s = String(t);
  return s.length > 12
    ? `${s.slice(0, 6)}...${s.slice(-4)}`
    : s.replace(/./g, "*");
}

// Debug: confirm which API base is used at runtime
// Safe in browser; remove if too verbose
// eslint-disable-next-line no-console
console.log(
  "[API] Base URL:",
  baseURL,
  "| Auth:",
  AUTH_MODE,
  "| Debug:",
  DEBUG_AUTH ? "on" : "off"
);

export const API_BASE_URL = baseURL;

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
});

// If server uses HttpOnly cookies for auth, enable credentials
apiClient.defaults.withCredentials = AUTH_MODE === "cookie";

// Prefer Korean localization when server supports it
try {
  (apiClient.defaults.headers.common as any)["Accept-Language"] = "ko-KR";
} catch {}

// Attach Authorization header automatically if available
apiClient.interceptors.request.use((config) => {
  try {
    const token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken")
        : null;
    if (token) {
      // Respect existing Authorization header if explicitly provided
      const hasAuth =
        (config.headers as any)?.Authorization ||
        (typeof (config.headers as any)?.get === "function" &&
          (config.headers as any).get("Authorization"));

      if (!hasAuth) {
        // Axios v1: headers can be AxiosHeaders or plain object
        if (typeof (config.headers as any)?.set === "function") {
          (config.headers as any).set("Authorization", `Bearer ${token}`);
        } else {
          if (!config.headers) config.headers = {} as any;
          (config.headers as any)["Authorization"] = `Bearer ${token}`;
        }
      }

      if (DEBUG_AUTH) {
        try {
          const method = (config.method || "get").toUpperCase();
          const url = `${config.baseURL || baseURL}${config.url || ""}`;
          let authHeader: string | undefined;
          if (typeof (config.headers as any)?.get === "function") {
            authHeader = (config.headers as any).get("Authorization");
          } else {
            authHeader = (config.headers as any)?.Authorization;
          }
          // eslint-disable-next-line no-console
          console.log(
            `[API][axios] ${method} ${url} credentials=${AUTH_MODE === "cookie" ? "include" : "omit"} ` +
              `header=${maskToken(authHeader || "")} token=${maskToken(token)}`
          );
        } catch {}
      }
    }
  } catch {}
  return config;
});

// (No runtime fallback here; switch base by env)

export default apiClient;
