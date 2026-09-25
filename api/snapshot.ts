import { Request, Response } from "express";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "snapshot.json");
const SNAPSHOT_TMP_FILE = path.join(DATA_DIR, "snapshot.tmp.json");

const MINIMUM_REQUIRED_SECTIONS = 6;
const ESSENTIAL_SECTION_KEYS = ["hero", "about", "projects", "contact"];

function isValidSnapshot(body: any): boolean {
  if (!body || typeof body !== "object") return false;
  const sections = body.sections;
  const siteSettings = body.siteSettings || body.site_settings;

  if (!Array.isArray(sections) || sections.length < MINIMUM_REQUIRED_SECTIONS) {
    return false;
  }

  const keys = new Set(sections.map((s: any) => s?.key));
  for (const essentialKey of ESSENTIAL_SECTION_KEYS) {
    if (!keys.has(essentialKey)) {
      return false;
    }
  }

  if (!siteSettings || typeof siteSettings !== "object" || Array.isArray(siteSettings)) {
    return false;
  }

  return true;
}

export default async function snapshotHandler(req: Request, res: Response) {
  // CORS & Cache headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    try {
      if (fs.existsSync(SNAPSHOT_FILE)) {
        const raw = fs.readFileSync(SNAPSHOT_FILE, "utf-8");
        const data = JSON.parse(raw);
        if (isValidSnapshot(data)) {
          return res.status(200).json(data);
        }
      }
      return res.status(404).json({ message: "No valid persistent snapshot on server yet" });
    } catch (err: any) {
      console.warn("[Server Snapshot] Failed reading snapshot:", err.message);
      return res.status(500).json({ error: "Failed to read persistent snapshot" });
    }
  }

  if (req.method === "POST") {
    try {
      const payload = req.body;
      if (!isValidSnapshot(payload)) {
        return res.status(400).json({ error: "Snapshot validation failed: Incomplete or invalid data structure." });
      }

      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      // Atomic file write
      const serialized = JSON.stringify(payload, null, 2);
      fs.writeFileSync(SNAPSHOT_TMP_FILE, serialized, "utf-8");
      fs.renameSync(SNAPSHOT_TMP_FILE, SNAPSHOT_FILE);

      return res.status(200).json({ success: true, timestamp: Date.now() });
    } catch (err: any) {
      console.warn("[Server Snapshot] Failed saving snapshot:", err.message);
      return res.status(500).json({ error: "Failed to persist snapshot on server" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
