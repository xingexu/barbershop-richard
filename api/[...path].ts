import { createRequire } from "module";

const require = createRequire(import.meta.url);

// We compile the Express backend to server/dist during `npm run build` on Vercel.
// This file stays inside /api so Vercel bundles it as a serverless function.
const mod = require("../server/dist/index.js");
const app = mod?.default || mod;
const ready: Promise<void> = mod?.ready || Promise.resolve();

export default async function handler(req: any, res: any) {
  await ready;
  return app(req, res);
}
