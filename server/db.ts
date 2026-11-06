import fs from "node:fs";
import path from "node:path";
import { seed } from "./seed.ts";

export type Profile = {
  name: string; tagline: string; craft: string; bio: string; availability: string;
  contactEmail: string; githubUrl: string; linkedinUrl: string; otherUrl: string; updatedAt: string;
};
export type Project = {
  id: number; title: string; details: string; tools: string; demoUrl: string; repoUrl: string;
  thumbnailUrl: string; featured: boolean; sortOrder: number; createdAt: string; updatedAt: string;
};
export type Skill = { id: number; name: string; category: string; sortOrder: number };
export type Experiment = { id: number; title: string; description: string; kind: string; linkUrl: string; sortOrder: number };
export type Message = { id: number; name: string; email: string; message: string; isRead: boolean; createdAt: string };
export type DB = {
  profile: Profile; projects: Project[]; skills: Skill[]; experiments: Experiment[];
  messages: Message[]; nextId: { project: number; message: number };
};

const DATA_DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "db.json");

let db: DB | null = null;
let lastMtime = 0;

function readFromDisk(): DB {
  const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
  lastMtime = fs.statSync(FILE).mtimeMs;
  return parsed;
}

/**
 * The whole database is one JSON file (data/db.json). If you edit that file by
 * hand while the server is running, the change is picked up on the next request.
 */
export function getDb(): DB {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    db = seed();
    saveDb();
    return db;
  }
  if (!db || fs.statSync(FILE).mtimeMs !== lastMtime) db = readFromDisk();
  return db;
}

export function saveDb() {
  if (!db) return;
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE); // write-then-rename so a crash never leaves half a file
  lastMtime = fs.statSync(FILE).mtimeMs;
}
