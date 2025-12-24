import { createRequire } from "module";

const require = createRequire(import.meta.url);

const mod = require("../../server/dist/index.js");
const app = mod?.default || mod;
const ready: Promise<void> = mod?.ready || Promise.resolve();

function ensureAdminPrefix(req: any) {
  const url = String(req?.url || "");
  // Vercel sometimes passes '/login' instead of '/api/admin/login'
  if (!url.startsWith("/api/admin")) {
    const suffix = url.startsWith("/") ? url : `/${url}`;
    req.url = `/api/admin${suffix}`;
  }
}

export default async function handler(req: any, res: any) {
  await ready;
  ensureAdminPrefix(req);
  return app(req, res);
}
