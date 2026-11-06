import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { getDb, saveDb, type Project } from "./db.ts";
import {
  checkCredentials, clearLoginFailures, credentialsConfigured, endSession, isLoggedIn,
  loginBlocked, recordLoginFailure, requireAdmin, startSession,
} from "./auth.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const DIST_DIR = path.resolve(process.cwd(), "dist");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.set("trust proxy", 1);
app.use(express.json({ limit: "12mb" })); // room for an 8 MB image sent as base64
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

// ---------- helpers ----------
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const urlOrEmpty = (v: unknown) => {
  const s = text(v, 500);
  return s === "" || /^https?:\/\//i.test(s) ? s : null;
};
const nowIso = () => new Date().toISOString();

// ---------- public ----------
app.get("/api/site", (_req, res) => {
  const db = getDb();
  const projects = [...db.projects].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder || a.id - b.id,
  );
  const lastUpdated = [db.profile.updatedAt, ...db.projects.map((p) => p.updatedAt)]
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  res.json({
    profile: db.profile,
    projects,
    skills: [...db.skills].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    experiments: [...db.experiments].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    lastUpdated,
  });
});

app.post("/api/contact", (req, res) => {
  const body = req.body ?? {};
  // Honeypot: real visitors never fill this in.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    res.json({ ok: true });
    return;
  }
  const name = text(body.name, 100);
  const email = text(body.email, 200);
  const message = text(body.message, 3000);
  if (!name) return void res.status(400).json({ error: "Please enter your name." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return void res.status(400).json({ error: "Please enter a valid email." });
  if (message.length < 10) return void res.status(400).json({ error: "Message is a bit short." });

  const db = getDb();
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  if (db.messages.filter((m) => Date.parse(m.createdAt) > tenMinutesAgo).length >= 30) {
    return void res.status(429).json({ error: "Too many messages right now. Please try again later." });
  }
  db.messages.push({ id: db.nextId.message++, name, email, message, isRead: false, createdAt: nowIso() });
  saveDb();
  res.json({ ok: true });
});

// ---------- login ----------
app.post("/api/auth/login", (req, res) => {
  if (!credentialsConfigured()) {
    return void res.status(500).json({ error: "Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file, then restart." });
  }
  const ip = req.ip ?? "unknown";
  if (loginBlocked(ip)) {
    return void res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
  }
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || !checkCredentials(email, password)) {
    recordLoginFailure(ip);
    return void res.status(401).json({ error: "Invalid email or password." });
  }
  clearLoginFailures(ip);
  startSession(req, res);
  res.json({ ok: true });
});

app.post("/api/auth/logout", (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

app.get("/api/auth/session", (req, res) => {
  if (!isLoggedIn(req)) return void res.status(401).json({ error: "Not logged in." });
  res.json({ email: process.env.ADMIN_EMAIL ?? "" });
});

// ---------- admin: projects ----------
app.post("/api/admin/projects", requireAdmin, (req, res) => {
  const { id, data } = req.body ?? {};
  const d = data ?? {};
  const title = text(d.title, 120);
  const demoUrl = urlOrEmpty(d.demoUrl);
  const repoUrl = urlOrEmpty(d.repoUrl);
  const thumb = text(d.thumbnailUrl, 600);
  if (!title) return void res.status(400).json({ error: "Title is required." });
  if (demoUrl === null || repoUrl === null) return void res.status(400).json({ error: "Links must start with http:// or https://" });
  if (thumb !== "" && !/^(https?:\/\/|\/uploads\/)/i.test(thumb)) {
    return void res.status(400).json({ error: "Cover must be an uploaded image or an http(s) link." });
  }
  const fields = {
    title,
    details: text(d.details, 3000),
    tools: text(d.tools, 300),
    demoUrl,
    repoUrl,
    thumbnailUrl: thumb,
    featured: d.featured === true,
    sortOrder: Math.max(0, Math.min(9999, Math.round(Number(d.sortOrder) || 0))),
  };

  const db = getDb();
  if (typeof id === "number") {
    const p = db.projects.find((x) => x.id === id);
    if (!p) return void res.status(404).json({ error: "Project not found." });
    Object.assign(p, fields, { updatedAt: nowIso() });
  } else {
    db.projects.push({ id: db.nextId.project++, ...fields, createdAt: nowIso(), updatedAt: nowIso() } satisfies Project);
  }
  saveDb();
  res.json({ ok: true });
});

app.delete("/api/admin/projects/:id", requireAdmin, (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const before = db.projects.length;
  db.projects = db.projects.filter((p) => p.id !== id);
  if (db.projects.length === before) return void res.status(404).json({ error: "Project not found." });
  db.profile.updatedAt = nowIso(); // deleting leaves nothing to timestamp, so bump the site marker
  saveDb();
  res.json({ ok: true });
});

// ---------- admin: cover image upload ----------
const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

app.post("/api/admin/upload", requireAdmin, (req, res) => {
  const { contentType, data } = req.body ?? {};
  const ext = typeof contentType === "string" ? IMAGE_TYPES[contentType] : undefined;
  if (!ext || typeof data !== "string") return void res.status(400).json({ error: "Use a PNG, JPEG, WebP or GIF image." });
  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    return void res.status(400).json({ error: "Image is empty or larger than 8 MB." });
  }
  // The server picks the file name, so it can never be chosen by the browser.
  const filename = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  res.json({ url: `/uploads/${filename}` });
});

// ---------- admin: profile ----------
app.post("/api/admin/profile", requireAdmin, (req, res) => {
  const d = req.body?.data ?? {};
  const name = text(d.name, 100);
  const tagline = text(d.tagline, 240);
  const craft = text(d.craft, 160);
  const contactEmail = text(d.contactEmail, 200);
  const githubUrl = urlOrEmpty(d.githubUrl);
  const linkedinUrl = urlOrEmpty(d.linkedinUrl);
  const otherUrl = urlOrEmpty(d.otherUrl);
  if (!name) return void res.status(400).json({ error: "Name is required." });
  if (!tagline) return void res.status(400).json({ error: "Intro is required." });
  if (!craft) return void res.status(400).json({ error: "Core craft is required." });
  if (contactEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return void res.status(400).json({ error: "Enter a valid email or leave it empty." });
  }
  if (githubUrl === null || linkedinUrl === null || otherUrl === null) {
    return void res.status(400).json({ error: "Links must start with http:// or https://" });
  }
  const db = getDb();
  db.profile = {
    name, tagline, craft, contactEmail, githubUrl, linkedinUrl, otherUrl,
    bio: text(d.bio, 3000),
    availability: text(d.availability, 80),
    updatedAt: nowIso(),
  };
  saveDb();
  res.json({ ok: true });
});

// ---------- admin: skills and experiments ----------
const order = (v: unknown) => Math.max(0, Math.min(9999, Math.round(Number(v) || 0)));
const newId = (list: { id: number }[]) => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;

app.post("/api/admin/skills", requireAdmin, (req, res) => {
  const { id, data } = req.body ?? {};
  const name = text(data?.name, 80);
  const category = text(data?.category, 60);
  if (!name) return void res.status(400).json({ error: "Name is required." });
  if (!category) return void res.status(400).json({ error: "Category is required." });
  const db = getDb();
  const fields = { name, category, sortOrder: order(data?.sortOrder) };
  if (typeof id === "number") {
    const item = db.skills.find((x) => x.id === id);
    if (!item) return void res.status(404).json({ error: "Skill not found." });
    Object.assign(item, fields);
  } else {
    db.skills.push({ id: newId(db.skills), ...fields });
  }
  db.profile.updatedAt = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.delete("/api/admin/skills/:id", requireAdmin, (req, res) => {
  const db = getDb();
  db.skills = db.skills.filter((x) => x.id !== Number(req.params.id));
  db.profile.updatedAt = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.post("/api/admin/experiments", requireAdmin, (req, res) => {
  const { id, data } = req.body ?? {};
  const title = text(data?.title, 120);
  const kind = text(data?.kind, 40);
  const linkUrl = urlOrEmpty(data?.linkUrl);
  if (!title) return void res.status(400).json({ error: "Title is required." });
  if (!kind) return void res.status(400).json({ error: "Type is required." });
  if (linkUrl === null) return void res.status(400).json({ error: "Link must start with http:// or https://" });
  const db = getDb();
  const fields = { title, kind, linkUrl, description: text(data?.description, 2000), sortOrder: order(data?.sortOrder) };
  if (typeof id === "number") {
    const item = db.experiments.find((x) => x.id === id);
    if (!item) return void res.status(404).json({ error: "Experiment not found." });
    Object.assign(item, fields);
  } else {
    db.experiments.push({ id: newId(db.experiments), ...fields });
  }
  db.profile.updatedAt = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.delete("/api/admin/experiments/:id", requireAdmin, (req, res) => {
  const db = getDb();
  db.experiments = db.experiments.filter((x) => x.id !== Number(req.params.id));
  db.profile.updatedAt = nowIso();
  saveDb();
  res.json({ ok: true });
});

// ---------- admin: messages ----------
app.get("/api/admin/messages", requireAdmin, (_req, res) => {
  const messages = [...getDb().messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200);
  res.json({ messages });
});

app.patch("/api/admin/messages/:id", requireAdmin, (req, res) => {
  const db = getDb();
  const m = db.messages.find((x) => x.id === Number(req.params.id));
  if (!m) return void res.status(404).json({ error: "Message not found." });
  m.isRead = req.body?.isRead === true;
  saveDb();
  res.json({ ok: true });
});

app.delete("/api/admin/messages/:id", requireAdmin, (req, res) => {
  const db = getDb();
  db.messages = db.messages.filter((m) => m.id !== Number(req.params.id));
  saveDb();
  res.json({ ok: true });
});

// ---------- serve the built site (after `npm run build`) ----------
if (fs.existsSync(path.join(DIST_DIR, "index.html"))) {
  app.use(express.static(DIST_DIR));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  if (!credentialsConfigured()) console.warn("[auth] ADMIN_EMAIL / ADMIN_PASSWORD missing. Copy .env.example to .env to enable admin login.");
});
