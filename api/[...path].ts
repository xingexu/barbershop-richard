import { createRequire } from "module";

const require = createRequire(import.meta.url);

// We compile the Express backend to server/dist during `npm run build` on Vercel.
// This file stays inside /api so Vercel bundles it as a serverless function.
const mod = require("../server/dist/index.js");
const app = mod?.default || mod;
const ready: Promise<void> = mod?.ready || Promise.resolve();

function ensureApiPrefix(req: any) {
  const url = String(req?.url || "");
  // In some Vercel runtimes, req.url is passed as '/auth/...' even though the
  // function is mounted at '/api'. Our express app routes are under '/api/...'.
  if (!url.startsWith("/api")) {
    const suffix = url.startsWith("/") ? url : `/${url}`;
    req.url = `/api${suffix}`;
  }
}

export default async function handler(req: any, res: any) {
  await ready;
  ensureApiPrefix(req);
  return app(req, res);
}
