import { createRequire } from "module";

const require = createRequire(import.meta.url);

const mod = require("../../server/dist/index.js");
const app = mod?.default || mod;
const ready: Promise<void> = mod?.ready || Promise.resolve();

function ensureAuthPrefix(req: any) {
  const url = String(req?.url || "");
  // Vercel sometimes passes '/me' instead of '/api/auth/me'
  if (!url.startsWith("/api/auth")) {
    const suffix = url.startsWith("/") ? url : `/${url}`;
    req.url = `/api/auth${suffix}`;
  }
}

export default async function handler(req: any, res: any) {
  await ready;
  ensureAuthPrefix(req);
  return app(req, res);
}
