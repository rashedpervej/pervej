import fs from "fs";
import path from "path";
import type { Request } from "express";
import { createClient } from "@supabase/supabase-js";

export interface SocialMetadata {
  title: string;
  primaryTitle: string;
  description: string;
  primaryDescription: string;
  image: string;
  url: string;
  type: string;
  siteName: string;
}

export const DEFAULT_SOCIAL_METADATA: SocialMetadata = {
  title: "Rashed Pervej | Senior Visualizer & Graphic Designer | 7+ years",
  primaryTitle: "Rashed Pervej | Senior Visualizer & Graphic Designer | 7+ years",
  description:
    "Rashed Pervej (7+ years in Design) Senior Visualizer & Graphic Designer. Previously at Chaldal & Sheba.xyz. Specializing in Branding, Packaging and Visual design.",
  primaryDescription:
    "Rashed Pervej (7+ years in Design) Senior Visualizer & Graphic Designer. Previously at Chaldal & Sheba.xyz. Specializing in Branding, Packaging and Visual design.",
  image: "https://pervej-portfolio-v2.vercel.app/og-image.jpg",
  url: "https://pervej-portfolio-v2.vercel.app/",
  type: "website",
  siteName: "Rashed Pervej | Senior Visualizer & Graphic Designer | 7+ years",
};

// In-memory cache for DB-fetched metadata
let cachedMeta: SocialMetadata | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Universal resolution of Social / Open Graph Image URLs for server-side responses:
 * - If image path is missing or empty, defaults to current origin + "/og-image.jpg"
 * - If contains the legacy hard-coded domain "pervej.pro.bd", smoothly transitions it to the current deployment origin
 * - If already a full external URL (Supabase CDN, AWS S3, Cloudinary, data:, blob:), preserves it intact
 * - If a relative path, prepends the current deployment origin
 */
export function resolveServerSocialImageUrl(rawImage?: string, origin?: string): string {
  const baseOrigin = origin ? origin.replace(/\/+$/, "") : "";

  if (!rawImage || !rawImage.trim()) {
    return baseOrigin ? `${baseOrigin}/og-image.jpg` : "/og-image.jpg";
  }

  let cleaned = rawImage.trim().replace(/^["']|["']$/g, "");

  if (cleaned.includes("pervej.pro.bd")) {
    cleaned = cleaned.replace(/^https?:\/\/(www\.)?pervej\.pro\.bd\/?/, "/");
    if (!cleaned.startsWith("/")) {
      cleaned = "/" + cleaned;
    }
  }

  // Normalize legacy /src/assets/images/ paths
  if (cleaned.startsWith("/src/assets/images/")) {
    cleaned = cleaned.replace("/src/assets/images/", "/");
  } else if (cleaned.startsWith("src/assets/images/")) {
    cleaned = "/" + cleaned.replace("src/assets/images/", "");
  }

  // Support direct Supabase storage paths
  if (cleaned.startsWith("portfolio-assets/") || cleaned.startsWith("/portfolio-assets/")) {
    const assetPath = cleaned.replace(/^\/+/, "");
    return `https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/${assetPath}`;
  }

  if (/^(https?:|\/\/|data:|blob:)/i.test(cleaned)) {
    return cleaned;
  }

  const normalizedPath = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return baseOrigin ? `${baseOrigin}${normalizedPath}` : normalizedPath;
}

/**
 * Universal resolution of Canonical / Page URLs for server-side responses
 */
export function resolveServerCanonicalUrl(rawUrl?: string, origin?: string, pathname: string = "/"): string {
  const baseOrigin = origin ? origin.replace(/\/+$/, "") : "";
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (!rawUrl || !rawUrl.trim()) {
    return baseOrigin ? `${baseOrigin}${cleanPath}` : cleanPath;
  }

  let cleaned = rawUrl.trim();

  if (cleaned.includes("pervej.pro.bd")) {
    cleaned = cleaned.replace(/^https?:\/\/(www\.)?pervej\.pro\.bd\/?/, "/");
    if (!cleaned.startsWith("/")) {
      cleaned = "/" + cleaned;
    }
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  const normalizedPath = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return baseOrigin ? `${baseOrigin}${normalizedPath}` : normalizedPath;
}

/**
 * Reads social share metadata directly from connected Supabase DB/CMS if configured,
 * falling back to local persistent snapshot.json, and finally to defaults.
 */
export async function getSocialMetadata(): Promise<SocialMetadata> {
  const now = Date.now();
  if (cachedMeta && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedMeta;
  }

  // 1. Try querying connected Supabase DB site_settings table
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey && supabaseUrl !== "https://your-supabase-project.supabase.co") {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["ogTitle", "ogDescription", "ogImage", "ogUrl", "seoTitle", "seoDescription"]);

      if (!error && Array.isArray(data) && data.length > 0) {
        const settingsMap: Record<string, string> = {};
        data.forEach((row) => {
          if (row.key && typeof row.value === "string") {
            settingsMap[row.key] = row.value;
          }
        });

        const primaryTitle = (settingsMap.seoTitle && settingsMap.seoTitle.trim()) || DEFAULT_SOCIAL_METADATA.primaryTitle;
        const primaryDesc = (settingsMap.seoDescription && settingsMap.seoDescription.trim()) || DEFAULT_SOCIAL_METADATA.primaryDescription;
        const socialTitle = (settingsMap.ogTitle && settingsMap.ogTitle.trim()) || primaryTitle;
        const socialDesc = (settingsMap.ogDescription && settingsMap.ogDescription.trim()) || primaryDesc;

        const result: SocialMetadata = {
          title: socialTitle,
          primaryTitle,
          description: socialDesc,
          primaryDescription: primaryDesc,
          image: settingsMap.ogImage || DEFAULT_SOCIAL_METADATA.image,
          url: settingsMap.ogUrl || DEFAULT_SOCIAL_METADATA.url,
          type: "website",
          siteName: primaryTitle,
        };

        cachedMeta = result;
        lastFetchTime = now;
        return result;
      }
    } catch (dbErr) {
      console.warn("[SocialMeta] Direct Supabase fetch attempt encountered error, falling back to snapshot:", dbErr);
    }
  }

  // 2. Try reading from server snapshot.json
  try {
    const snapshotPath = path.join(process.cwd(), "data", "snapshot.json");
    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, "utf-8");
      const parsed = JSON.parse(raw);
      const settings = parsed.siteSettings || parsed.site_settings || {};

      const primaryTitle = (settings.seoTitle && String(settings.seoTitle).trim()) || DEFAULT_SOCIAL_METADATA.primaryTitle;
      const primaryDesc = (settings.seoDescription && String(settings.seoDescription).trim()) || DEFAULT_SOCIAL_METADATA.primaryDescription;
      const socialTitle = (settings.ogTitle && String(settings.ogTitle).trim()) || primaryTitle;
      const socialDesc = (settings.ogDescription && String(settings.ogDescription).trim()) || primaryDesc;

      const result: SocialMetadata = {
        title: socialTitle,
        primaryTitle,
        description: socialDesc,
        primaryDescription: primaryDesc,
        image: settings.ogImage || DEFAULT_SOCIAL_METADATA.image,
        url: settings.ogUrl || DEFAULT_SOCIAL_METADATA.url,
        type: "website",
        siteName: primaryTitle,
      };
      cachedMeta = result;
      lastFetchTime = now;
      return result;
    }
  } catch (err) {
    console.error("Failed to read social metadata from snapshot:", err);
  }

  return DEFAULT_SOCIAL_METADATA;
}

/**
 * Injects dynamic Open Graph & Twitter Card meta tags into HTML template
 * using the current deployment origin from the incoming request.
 */
export async function injectSocialMeta(html: string, req?: Request): Promise<string> {
  const meta = await getSocialMetadata();

  // Determine current deployment origin
  let origin = "";
  let pathname = "/";
  if (req) {
    const rawProto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const proto = rawProto.split(",")[0].trim();
    const rawHost = (req.headers["x-forwarded-host"] as string) || req.get?.("host") || (req.headers?.host as string) || "";
    const host = rawHost.split(",")[0].trim();
    if (host) {
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      const finalProto = !isLocal ? "https" : proto;
      origin = `${finalProto}://${host}`;
    }
    pathname = req.originalUrl || req.url || "/";
  }

  const resolvedImage = resolveServerSocialImageUrl(meta.image, origin);
  const resolvedUrl = resolveServerCanonicalUrl(meta.url, origin, pathname);

  const escapeAttr = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const safePrimaryTitle = escapeAttr(meta.primaryTitle || meta.title);
  const safeSocialTitle = escapeAttr(meta.title || meta.primaryTitle);
  const safePrimaryDesc = escapeAttr(meta.primaryDescription || meta.description);
  const safeSocialDesc = escapeAttr(meta.description || meta.primaryDescription);
  const safeSiteName = escapeAttr(meta.siteName || meta.primaryTitle || meta.title);
  const safeImage = escapeAttr(resolvedImage);
  const safeUrl = escapeAttr(resolvedUrl);

  let updated = html;

  // Helper for meta tags
  const setMeta = (attrName: "name" | "property", attrVal: string, contentVal: string) => {
    const regex = new RegExp(`<meta\\s+[^>]*${attrName}=["']${attrVal}["'][^>]*>`, "i");
    const newTag = `<meta ${attrName}="${attrVal}" content="${contentVal}" />`;
    if (regex.test(updated)) {
      updated = updated.replace(regex, newTag);
    } else {
      updated = updated.replace(/<\/head>/i, `  ${newTag}\n</head>`);
    }
  };

  // 1. Browser Title tag
  if (/<title>[\s\S]*?<\/title>/i.test(updated)) {
    updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safePrimaryTitle}</title>`);
  } else {
    updated = updated.replace(/<\/head>/i, `  <title>${safePrimaryTitle}</title>\n</head>`);
  }

  // 2. Canonical tag
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(updated)) {
    updated = updated.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${safeUrl}" />`);
  }

  // 3. Primary Meta description
  setMeta("name", "description", safePrimaryDesc);

  // 4. Open Graph Tags
  setMeta("property", "og:type", "website");
  setMeta("property", "og:title", safeSocialTitle);
  setMeta("property", "og:description", safeSocialDesc);
  setMeta("property", "og:image", safeImage);
  setMeta("property", "og:image:width", "1200");
  setMeta("property", "og:image:height", "630");
  setMeta("property", "og:image:alt", safeSocialTitle);
  setMeta("property", "og:url", safeUrl);
  setMeta("property", "og:site_name", safeSiteName);

  // 5. Twitter / X Tags
  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", safeSocialTitle);
  setMeta("name", "twitter:description", safeSocialDesc);
  setMeta("name", "twitter:image", safeImage);
  setMeta("name", "twitter:image:alt", safeSocialTitle);
  setMeta("name", "twitter:url", safeUrl);

  return updated;
}

/**
 * Vercel Serverless Function Handler (/api/socialMeta)
 * Automatically invoked by Vercel when bots/crawlers request any page to serve dynamic Supabase OpenGraph tags.
 */
export default async function handler(req: any, res: any) {
  try {
    const rawProto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const proto = rawProto.split(",")[0].trim();
    const rawHost = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
    const host = rawHost.split(",")[0].trim();
    const origin = `${proto}://${host}`;

    let html = "";
    const distIndex = path.join(process.cwd(), "dist", "index.html");
    const rootIndex = path.join(process.cwd(), "index.html");

    if (fs.existsSync(distIndex)) {
      html = fs.readFileSync(distIndex, "utf-8");
    } else if (fs.existsSync(rootIndex)) {
      html = fs.readFileSync(rootIndex, "utf-8");
    }

    if (!html && origin) {
      try {
        const resp = await fetch(`${origin}/index.html`, {
          headers: { "user-agent": "internal-ssr-fetch" },
        });
        if (resp.ok) {
          html = await resp.text();
        }
      } catch (fErr) {
        console.warn("Failed to fetch index.html over network:", fErr);
      }
    }

    if (!html) {
      return res.status(500).send("index.html template not found");
    }

    const finalHtml = await injectSocialMeta(html, req);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).send(finalHtml);
  } catch (err: any) {
    console.error("Error in socialMeta serverless handler:", err);
    return res.status(500).send("Error generating social preview HTML");
  }
}