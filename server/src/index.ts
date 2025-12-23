import express = require("express");
import cors = require("cors");
import { config as dotenvConfig } from "dotenv";
import bcrypt = require("bcrypt");
import jwt = require("jsonwebtoken");
import { z } from "zod";
import nodemailer = require("nodemailer");
import { PrismaClient, Prisma } from "@prisma/client";

dotenvConfig();

const prisma = new PrismaClient();
const app = express();

// CORS (GitHub Pages + local dev + Vercel)
const ALLOWED_ORIGINS = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://richardl128.github.io",
  "https://richardl128.github.io/BarbershopWeb",
]);

// Optionally allow additional origins via env (comma-separated)
const EXTRA_CORS_ORIGINS = new Set<string>(
  String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function isAllowedOrigin(origin: string) {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (EXTRA_CORS_ORIGINS.has(origin)) return true;
  // Allow Vercel preview/prod domains
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, cb) => {
      // allow curl / server-to-server (no Origin header)
      if (!origin) return cb(null, true);
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// respond to preflight
app.options("*", cors());

app.use(express.json());


const API = "/api";

// Root route (Render default) — helps confirm the service is up in a browser
app.get("/", (_req, res) => {
  res.type("text").send("BarbershopWeb backend is running. Try /api/health");
});

/* ---------------- Email ---------------- */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

async function emailOwnerOnBooking(
  appt: {
    startTime: Date;
    name: string;
    email: string;
    phone?: string | null;
    notes?: string | null;
    intake?: Prisma.JsonValue | null;
  },
  serviceLabel: string
) {
  const owner = process.env.OWNER_EMAIL;
  if (!owner) return;

  const when = new Date(appt.startTime).toLocaleString("en-CA", {
    timeZone: "America/Toronto",
  });

  await transporter.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: owner,
    subject: `New booking: ${serviceLabel} (${when})`,
    text:
      `New appointment booked!\n\n` +
      `Service: ${serviceLabel}\n` +
      `When: ${when}\n` +
      `Name: ${appt.name}\n` +
      `Email: ${appt.email}\n` +
      `Phone: ${appt.phone || "-"}\n` +
      `Notes: ${appt.notes || "-"}\n` +
      `Haircut questions: ${appt.intake ? JSON.stringify(appt.intake) : "-"}\n`,
  });
}

/* ---------------- Simple customer auth (JWT) ---------------- */
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string; phone: string | null };
    }
  }
}

function mustJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return secret;
}

function signToken(user: { id: string; email: string; name: string }) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, mustJWTSecret(), {
    expiresIn: "7d",
  });
}

// If Authorization: Bearer <token> exists, attach user to req.user
app.use(async (req, _res, next) => {
  const header = (req.headers.authorization || "").toString();
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return next();

  try {
    const payload = jwt.verify(token, mustJWTSecret()) as any;
    const customerId = String(payload.sub || "");
    if (!customerId) return next();

    const user = await prisma.customerUser.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (user) req.user = user;
  } catch {
    // invalid/expired token -> treat as logged out
  }

  next();
});

/* ---------------- Health check ---------------- */
app.get(`${API}/health`, (_req, res) => {
  res.json({ ok: true });
});

/* ---------------- Optional barber info ---------------- */
app.get(`${API}/barber`, (_req, res) => {
  res.json({
    name: "Richard",
    bio: "Precision cuts, clean fades, and a calm, one-on-one studio experience.",
  });
});

/* ---------------- Auth routes ---------------- */
app.post(`${API}/auth/signup`, async (req, res) => {
  const Schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(6),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { name, email, phone, password } = parsed.data;

  const exists = await prisma.customerUser.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.customerUser.create({
    data: { name, email, phone: phone || null, password: hash },
    select: { id: true, name: true, email: true, phone: true },
  });

  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.json({ ok: true, token, user });
});

app.post(`${API}/auth/login`, async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const user = await prisma.customerUser.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(parsed.data.password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.json({ ok: true, token, user: { name: user.name, email: user.email, phone: user.phone } });
});

app.post(`${API}/auth/logout`, (_req, res) => {
  // JWT logout is client-side (delete token)
  res.json({ ok: true });
});

app.get(`${API}/auth/me`, (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  res.json(req.user);
});

/* ---------------- Admin auth (JWT) ---------------- */
function mustAdminCreds() {
  const email = process.env.ADMIN_EMAIL;
  const pass = process.env.ADMIN_PASSWORD;
  const passHash = process.env.ADMIN_PASSWORD_HASH;
  if (!email) throw new Error("ADMIN_EMAIL not set");
  if (!pass && !passHash) throw new Error("Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH");
  return { email, pass, passHash };
}

function signAdminToken(adminEmail: string) {
  return jwt.sign(
    { sub: "admin", email: adminEmail, role: "admin" },
    mustJWTSecret(),
    { expiresIn: "7d" }
  );
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = (req.headers.authorization || "").toString();
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing admin token" });

  try {
    const payload = jwt.verify(token, mustJWTSecret()) as any;
    if (payload?.role !== "admin") return res.status(403).json({ error: "Not admin" });
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function ensureDefaultAvailabilityWindows() {
  const count = await prisma.availabilityWindow.count();
  if (count > 0) return;
  await prisma.availabilityWindow.createMany({
    data: [
      { weekday: 1, startMin: 600, endMin: 1140 }, // Mon 10:00–19:00
      { weekday: 2, startMin: 600, endMin: 1140 }, // Tue
      { weekday: 3, startMin: 600, endMin: 1140 }, // Wed
      { weekday: 4, startMin: 600, endMin: 1140 }, // Thu
      { weekday: 5, startMin: 600, endMin: 1140 }, // Fri
      { weekday: 6, startMin: 600, endMin: 1140 }, // Sat
    ],
  });
}

app.post(`${API}/admin/login`, async (req, res) => {
  const Schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { email: adminEmail, pass, passHash } = mustAdminCreds();
  const { email, password } = parsed.data;

  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (passHash) {
    const ok = await bcrypt.compare(password, passHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  } else {
    if (password !== pass) return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAdminToken(adminEmail);
  return res.json({ ok: true, token });
});

app.get(`${API}/admin/bookings`, requireAdmin, async (_req, res) => {
  const bookings = await prisma.appointment.findMany({
    orderBy: { startTime: "desc" },
    include: { service: true },
  });
  res.json(bookings);
});

app.get(`${API}/admin/availability/windows`, requireAdmin, async (_req, res) => {
  const windows = await prisma.availabilityWindow.findMany({ orderBy: [{ weekday: "asc" }, { startMin: "asc" }] });
  res.json(windows);
});

app.post(`${API}/admin/availability/windows`, requireAdmin, async (req, res) => {
  const Schema = z.object({
    weekday: z.number().int().min(0).max(6),
    startMin: z.number().int().min(0).max(24 * 60),
    endMin: z.number().int().min(0).max(24 * 60),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  if (parsed.data.endMin <= parsed.data.startMin) return res.status(400).json({ error: "endMin must be > startMin" });

  const w = await prisma.availabilityWindow.create({ data: parsed.data });
  res.status(201).json({ ok: true, id: w.id });
});

app.delete(`${API}/admin/availability/windows/:id`, requireAdmin, async (req, res) => {
  const id = String(req.params.id || "");
  try {
    await prisma.availabilityWindow.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

app.get(`${API}/admin/availability/blocks`, requireAdmin, async (_req, res) => {
  const blocks = await prisma.availabilityBlock.findMany({ orderBy: { startTime: "asc" } });
  res.json(blocks);
});

app.post(`${API}/admin/availability/blocks`, requireAdmin, async (req, res) => {
  const Schema = z.object({
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    reason: z.string().optional(),
  });
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(parsed.data.endTime);
  if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime())) {
    return res.status(400).json({ error: "Invalid startTime/endTime" });
  }
  if (endTime <= startTime) return res.status(400).json({ error: "endTime must be after startTime" });

  const b = await prisma.availabilityBlock.create({
    data: { startTime, endTime, reason: parsed.data.reason || null },
  });
  res.status(201).json({ ok: true, id: b.id });
});

app.delete(`${API}/admin/availability/blocks/:id`, requireAdmin, async (req, res) => {
  const id = String(req.params.id || "");
  try {
    await prisma.availabilityBlock.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

/* ---------------- Services ---------------- */
app.get(`${API}/services`, async (_req, res) => {
  const services = await prisma.service.findMany({ orderBy: { label: "asc" } });
  res.json(services);
});

/* ---------------- Availability (simple slots) ---------------- */
app.get(`${API}/availability`, async (req, res) => {
  const date = String(req.query.date || ""); // YYYY-MM-DD
  const serviceId = String(req.query.serviceId || "");

  if (!date || !serviceId) return res.status(400).json({ error: "Missing date/serviceId" });

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(404).json({ error: "Unknown service" });

  const day0 = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(day0.getTime())) return res.status(400).json({ error: "Invalid date (expected YYYY-MM-DD)" });
  const weekday = day0.getDay();

  // Load weekly windows (fallback to 10:00–19:00 if none set)
  const windows = await prisma.availabilityWindow.findMany({
    where: { weekday },
    orderBy: { startMin: "asc" },
  });
  const effectiveWindows =
    windows.length > 0 ? windows : [{ weekday, startMin: 600, endMin: 1140 }]; // fallback

  const earliestMin = Math.min(...effectiveWindows.map((w) => w.startMin));
  const latestMin = Math.max(...effectiveWindows.map((w) => w.endMin));
  const dayStart = new Date(day0.getTime() + earliestMin * 60 * 1000);
  const dayEnd = new Date(day0.getTime() + latestMin * 60 * 1000);

  const [blocks, existing] = await Promise.all([
    prisma.availabilityBlock.findMany({
      where: { startTime: { lt: dayEnd }, endTime: { gt: dayStart } },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: { startTime: { gte: dayStart, lt: dayEnd } },
      include: { service: true },
    }),
  ]);

  const toInterval = (start: Date, end: Date) => ({ start, end });

  const blockedIntervals = blocks.map((b) => toInterval(new Date(b.startTime), new Date(b.endTime)));
  const occupiedIntervals = existing.map((a) =>
    toInterval(new Date(a.startTime), new Date(new Date(a.startTime).getTime() + a.service.durationMin * 60 * 1000))
  );

  function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
    return a.start < b.end && b.start < a.end;
  }

  const stepMin = 15;
  const durationMs = service.durationMin * 60 * 1000;

  const slots: { startTime: string }[] = [];
  const now = new Date();
  const todayToronto = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  for (const w of effectiveWindows) {
    const winStart = new Date(day0.getTime() + w.startMin * 60 * 1000);
    const winEnd = new Date(day0.getTime() + w.endMin * 60 * 1000);

    for (let t = new Date(winStart); t.getTime() + durationMs <= winEnd.getTime(); ) {
      if (date !== todayToronto || t >= now) {
        const candidate = { start: t, end: new Date(t.getTime() + durationMs) };
        const hitBlock = blockedIntervals.some((bi) => overlaps(candidate, bi));
        const hitAppt = occupiedIntervals.some((oi) => overlaps(candidate, oi));
        if (!hitBlock && !hitAppt) slots.push({ startTime: t.toISOString() });
      }
      t = new Date(t.getTime() + stepMin * 60 * 1000);
    }
  }

  res.json(slots);
});

/* ---------------- Create appointment (emails you) ---------------- */
app.post(`${API}/appointments`, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Login required" });

  const Schema = z.object({
    serviceId: z.string().min(1),
    startTime: z.string().datetime(),
    notes: z.string().optional(),
    intake: z.unknown().optional(),
  });

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const service = await prisma.service.findUnique({ where: { id: parsed.data.serviceId } });
  if (!service) return res.status(404).json({ error: "Unknown service" });

  const name = req.user.name;
  const email = req.user.email;
  const phone = req.user.phone;

  let appt;
  try {
    appt = await prisma.appointment.create({
      data: {
        serviceId: parsed.data.serviceId,
        startTime: new Date(parsed.data.startTime),
        notes: parsed.data.notes || null,
        intake: parsed.data.intake ?? undefined,
        name,
        email,
        phone,
        customerId: req.user.id,
      },
      include: { service: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ error: "That slot was just booked. Pick another time." });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error creating appointment" });
  }

  // Email failure should NOT break the booking
  try {
    await emailOwnerOnBooking(appt, service.label);
  } catch (e) {
    console.error("Email failed:", e);
  }

  return res.status(201).json({ ok: true, appointmentId: appt.id });
});

/* ---------------- Start ---------------- */
const port = Number(process.env.PORT || 3001);
ensureDefaultAvailabilityWindows()
  .catch((e) => console.error("Failed to ensure default availability windows:", e))
  .finally(() => {
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  });