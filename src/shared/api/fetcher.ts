import { API_BASE_URL } from "./client";

const AUTH_MODE = (process.env.REACT_APP_AUTH_MODE || "header").toLowerCase();
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

type AnyHeaders = HeadersInit & { [key: string]: any };

function withAuth(headers: AnyHeaders = {}): {
  headers: AnyHeaders;
  token: string | null;
} {
  let token: string | null = null;
  try {
    token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("accessToken")
        : null;
    if (token && !("Authorization" in (headers as any))) {
      if (headers instanceof Headers)
        headers.set("Authorization", `Bearer ${token}`);
      else (headers as any)["Authorization"] = `Bearer ${token}`;
    }
  } catch {}
  return { headers, token };
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const { headers, token } = withAuth(init.headers as AnyHeaders);
  // Prefer Korean localization when server supports it
  try {
    const has =
      headers instanceof Headers
        ? headers.get("Accept-Language")
        : (headers as any)["Accept-Language"];
    if (!has) {
      if (headers instanceof Headers) headers.set("Accept-Language", "ko-KR");
      else (headers as any)["Accept-Language"] = "ko-KR";
    }
  } catch {}
  // Default JSON header if body provided and no content-type
  if (init.body && !(headers as any)["Content-Type"]) {
    if (headers instanceof Headers)
      headers.set("Content-Type", "application/json");
    else (headers as any)["Content-Type"] = "application/json";
  }
  const credentials = AUTH_MODE === "cookie" ? "include" : init.credentials;
  if (DEBUG_AUTH) {
    try {
      let authHeader: any;
      if (headers instanceof Headers) authHeader = headers.get("Authorization");
      else authHeader = (headers as any)["Authorization"];
      // eslint-disable-next-line no-console
      console.log(
        `[API][fetch] ${(init.method || "GET").toUpperCase()} ${url} credentials=${credentials || "omit"} ` +
          `header=${maskToken(authHeader || "")} token=${maskToken(token)}`
      );
    } catch {}
  }
  return fetch(url, { ...init, headers, credentials });
}

export async function apiJson<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err: any = new Error(text || `HTTP ${res.status}`);
    err.status = res.status;
    err.responseText = text;
    throw err;
  }
  return res.json() as Promise<T>;
}

export function useApiBase() {
  return API_BASE_URL;
}
