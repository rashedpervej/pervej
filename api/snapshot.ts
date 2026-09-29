import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { verifyAdminAuth } from "./_lib/auth";

function getDataPaths() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const primaryDir = isServerless ? path.join(os.tmpdir(), "data") : path.join(process.cwd(), "data");
  const fallbackDir = path.join(process.cwd(), "data");
  
  return {
    primaryDir,
    primaryFile: path.join(primaryDir, "snapshot.json"),
    primaryTmpFile: path.join(primaryDir, "snapshot.tmp.json"),
    fallbackFile: path.join(fallbackDir, "snapshot.json"),
  };
}

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

function sanitizeSiteSettings(settings: any): any {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const sanitized: Record<string, any> = {};
  const sensitiveKeyPattern = /(vault|secret|api_?key|master|token|password|auth|prec_|smtp)/i;
  for (const [key, value] of Object.entries(settings)) {
    if (sensitiveKeyPattern.test(key)) continue;
    if (typeof value === "string" && (value.startsWith("enc:v1:") || value.startsWith("prec_") || value.startsWith("sk-") || value.startsWith("gsk_") || value.startsWith("csk-") || value.startsWith("AIzaSy"))) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

function sanitizeSnapshot(data: any): any {
  if (!data || typeof data !== "object") return data;
  const copy = { ...data };
  if (copy.siteSettings) {
    copy.siteSettings = sanitizeSiteSettings(copy.siteSettings);
  }
  if (copy.site_settings) {
    copy.site_settings = sanitizeSiteSettings(copy.site_settings);
  }
  return copy;
}

export default async function snapshotHandler(req: Request, res: Response) {
  // CORS & Cache headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const { primaryDir, primaryFile, primaryTmpFile, fallbackFile } = getDataPaths();

  if (req.method === "GET") {
    try {
      const fileToRead = fs.existsSync(primaryFile) 
        ? primaryFile 
        : fs.existsSync(fallbackFile) 
          ? fallbackFile 
          : null;

      if (fileToRead) {
        const raw = fs.readFileSync(fileToRead, "utf-8");
        const data = JSON.parse(raw);
        if (isValidSnapshot(data)) {
          return res.status(200).json(sanitizeSnapshot(data));
        }
      }
      return res.status(404).json({ message: "No valid persistent snapshot on server yet" });
    } catch (err: any) {
      console.warn("[Server Snapshot] Failed reading snapshot:", err.message);
      return res.status(500).json({ error: "Failed to read persistent snapshot" });
    }
  }

  if (req.method === "POST") {
    // Require admin authentication to mutate persistent snapshot
    const auth = await verifyAdminAuth(req, "Admin privileges required to save snapshot.");
    if (!auth.authorized) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    try {
      const payload = req.body;
      if (!isValidSnapshot(payload)) {
        return res.status(400).json({ error: "Snapshot validation failed: Incomplete or invalid data structure." });
      }

      if (!fs.existsSync(primaryDir)) {
        fs.mkdirSync(primaryDir, { recursive: true });
      }

      // Sanitize before atomic file write to prevent secrets from touching disk
      const sanitizedPayload = sanitizeSnapshot(payload);
      const serialized = JSON.stringify(sanitizedPayload, null, 2);
      fs.writeFileSync(primaryTmpFile, serialized, "utf-8");
      fs.renameSync(primaryTmpFile, primaryFile);

      return res.status(200).json({ success: true, timestamp: Date.now() });
    } catch (err: any) {
      console.warn("[Server Snapshot] Failed saving snapshot:", err.message);
      return res.status(200).json({ success: false, warning: "Filesystem is read-only or constrained on edge", timestamp: Date.now() });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
