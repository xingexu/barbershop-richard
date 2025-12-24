// Default to same-origin /api (works on Vercel when backend is deployed as serverless functions)
// You can override with VITE_API_BASE (e.g. https://your-backend.com/api)
export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export const ADMIN_TOKEN_KEY = "adminToken";

function normalizePath(path) {
  let p = String(path || "");
  if (p.startsWith("/api/")) p = p.slice(4); // prevent /api/api
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = { "Content-Type": "application/json" };
  if (options.headers && typeof options.headers === "object") {
    for (const [k, v] of Object.entries(options.headers)) headers[k] = v;
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${String(API_BASE).replace(/\/+$/, "")}${normalizePath(path)}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export async function apiFetchAdmin(path, options = {}) {
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);

  const headers = { "Content-Type": "application/json" };
  if (options.headers && typeof options.headers === "object") {
    for (const [k, v] of Object.entries(options.headers)) headers[k] = v;
  }
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

  const url = `${String(API_BASE).replace(/\/+$/, "")}${normalizePath(path)}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);

  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
