import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { createClient } from "@supabase/supabase-js";

interface AuthResult {
  authorized: boolean;
  error?: string;
  status: number;
  user?: any;
}

async function verifyAdminAuth(req: Request, requiredMessage = "Admin privileges required."): Promise<AuthResult> {
  const authHeader = req.headers.authorization || (req.headers["x-supabase-auth"] as string) || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { authorized: false, error: "Unauthorized: Missing authentication token.", status: 401 };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { authorized: false, error: "Supabase configuration missing on server.", status: 503 };
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      return { authorized: false, error: "Unauthorized: Invalid or expired session.", status: 401 };
    }

    const isOwner = user.email === "rashedpervej2011@gmail.com" || user.email === "admin@portfolio.com";
    if (isOwner) {
      return { authorized: true, status: 200, user };
    }

    const { data: roleData, error: roleError } = await authClient
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleData && !roleError) {
      return { authorized: true, status: 200, user };
    }

    return { authorized: false, error: `Forbidden: ${requiredMessage}`, status: 403, user };
  } catch (err: any) {
    return { authorized: false, error: err?.message || "Auth verification failure.", status: 500 };
  }
}

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

// Explicit allowlist of settings keys that are safe to expose publicly
const PUBLIC_SETTINGS_ALLOWLIST = new Set([
  "seoTitle",
  "seoDescription",
  "seoKeywords",
  "ogTitle",
  "ogDescription",
  "ogImage",
  "ogUrl",
  "primaryColor",
  "defaultTheme",
  "enableChatbot",
  "faviconUrl",
  "marqueeSpeed",
  "backgroundStyle",
  "projectSettings",
  "cvUrl",
  "cvFileName",
  "cvSource",
  "customCss",
  "chatbotSettings",
  "chatTrainingRules",
  "customPriceGuidelines"
]);

function sanitizeSiteSettings(settings: any): any {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const sanitized: Record<string, any> = {};
  const sensitiveKeyPattern = /(vault|secret|api_?key|master|token|password|auth|prec_|smtp|audit_log)/i;
  
  for (const [key, value] of Object.entries(settings)) {
    // 1. Must be in the known public allowlist OR explicitly safe non-internal setting
    if (!PUBLIC_SETTINGS_ALLOWLIST.has(key)) continue;

    // 2. Extra safety: deny any pattern with sensitive words or audit logs
    if (sensitiveKeyPattern.test(key)) continue;

    // 3. Deny raw encrypted tokens or API keys if accidentally placed in an allowed key
    if (
      typeof value === "string" &&
      (value.startsWith("enc:v1:") ||
        value.startsWith("prec_") ||
        value.startsWith("sk-") ||
        value.startsWith("gsk_") ||
        value.startsWith("csk-") ||
        value.startsWith("AIzaSy"))
    ) {
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
      let payload = req.body;
      if (!payload && typeof (req as any).on === "function") {
        try {
          const rawBody = await new Promise<string>((resolve, reject) => {
            let data = "";
            (req as any).on("data", (chunk: any) => { data += chunk; });
            (req as any).on("end", () => resolve(data));
            (req as any).on("error", (err: any) => reject(err));
          });
          if (rawBody) {
            payload = JSON.parse(rawBody);
          }
        } catch (e) {}
      }
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch (e) {}
      } else if (payload && typeof payload === "object" && Buffer.isBuffer(payload)) {
        try {
          payload = JSON.parse(payload.toString("utf-8"));
        } catch (e) {}
      }

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
