import { SiteSettings } from "../context/PortfolioContext";

/**
 * Returns the current deployment origin (e.g. "https://my-domain.com" or "https://preview.aistudio.google.com").
 * Returns an empty string in SSR/non-browser contexts.
 */
export function getCurrentOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/**
 * Universal resolution of Social / Open Graph Image URLs:
 * - If image path is missing or empty, defaults to current origin + "/og-image.jpg"
 * - If already a full external URL (Supabase CDN, AWS S3, Cloudinary), preserves it intact
 * - If a relative path (e.g. "/og-image.jpg"), dynamically prepends the current deployment origin
 */
export function resolveSocialImageUrl(rawImage?: string): string {
  const origin = getCurrentOrigin();

  if (!rawImage || !rawImage.trim()) {
    return origin ? `${origin}/og-image.jpg` : "/og-image.jpg";
  }

  let cleaned = rawImage.trim().replace(/^["']|["']$/g, "");

  if (cleaned.includes("pervej.pro.bd")) {
    cleaned = cleaned.replace(/^https?:\/\/(www\.)?pervej\.pro\.bd\/?/, "/");
    if (!cleaned.startsWith("/")) {
      cleaned = "/" + cleaned;
    }
  }

  if (cleaned.startsWith("/src/assets/images/")) {
    cleaned = cleaned.replace("/src/assets/images/", "/");
  } else if (cleaned.startsWith("src/assets/images/")) {
    cleaned = "/" + cleaned.replace("src/assets/images/", "");
  }

  if (cleaned.startsWith("portfolio-assets/") || cleaned.startsWith("/portfolio-assets/")) {
    const assetPath = cleaned.replace(/^\/+/, "");
    return `https://ngeaqabzlerwjxvcyucd.supabase.co/storage/v1/object/public/${assetPath}`;
  }

  if (/^(https?:|\/\/|data:|blob:)/i.test(cleaned)) {
    return cleaned;
  }

  const normalizedPath = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

/**
 * Universal resolution of Canonical / Social Page URLs
 */
export function resolveCanonicalUrl(rawUrl?: string): string {
  const origin = getCurrentOrigin();
  const pathname =
    typeof window !== "undefined" && window.location?.pathname
      ? window.location.pathname
      : "/";

  if (!rawUrl || !rawUrl.trim()) {
    return origin ? `${origin}${pathname}` : pathname;
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
  return origin ? `${origin}${normalizedPath}` : normalizedPath;
}

export function getDisplayHostname(rawUrl?: string): string {
  const resolved = resolveCanonicalUrl(rawUrl);
  try {
    const parsed = new URL(resolved);
    return parsed.hostname;
  } catch {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return window.location.hostname;
    }
    return "portfolio.app";
  }
}

/**
 * Single Source of Truth Architecture with Optional Overrides:
 * 1. Primary SEO (seoTitle, seoDescription) sets Browser title and Meta description.
 * 2. Open Graph & Twitter automatically inherit Primary SEO unless explicitly overridden by ogTitle / ogDescription.
 * 3. Dedicated ogImage for 1200x630 social preview card.
 */
export function syncDocumentSeo(settings: Partial<SiteSettings>): void {
  if (typeof document === "undefined") return;

  const defaultTitle = "Rashed Pervej | Senior Visualizer & Graphic Designer | 7+ years";
  const defaultDesc =
    "Rashed Pervej (7+ years in Design) Senior Visualizer & Graphic Designer. Previously at Chaldal & Sheba.xyz. Specializing in Branding, Packaging and Visual design.";

  // 1. Primary SEO (Single Source of Truth)
  const primaryTitle = settings.seoTitle || defaultTitle;
  const primaryDesc = settings.seoDescription || defaultDesc;

  // 2. Social Meta (Inherits Primary SEO, or overrides if social-specific values are set)
  const socialTitle = settings.ogTitle || primaryTitle;
  const socialDesc = settings.ogDescription || primaryDesc;
  const resolvedOgImage = resolveSocialImageUrl(settings.ogImage);
  const resolvedOgUrl = resolveCanonicalUrl(settings.ogUrl);

  // Set Browser Tab Title directly from Primary SEO Title
  document.title = primaryTitle;

  const updateOrCreateTag = (
    tagName: string,
    attrKey: string,
    attrVal: string,
    contentAttr: string,
    contentVal: string
  ) => {
    let el = document.querySelector(`${tagName}[${attrKey}="${attrVal}"]`);
    if (!el) {
      el = document.createElement(tagName);
      el.setAttribute(attrKey, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute(contentAttr, contentVal);
  };

  // Meta description & Keywords
  updateOrCreateTag("meta", "name", "description", "content", primaryDesc);
  if (settings.seoKeywords) {
    updateOrCreateTag("meta", "name", "keywords", "content", settings.seoKeywords);
  }

  // Canonical link tag
  updateOrCreateTag("link", "rel", "canonical", "href", resolvedOgUrl);

  // Open Graph Meta Tags (Facebook, LinkedIn, WhatsApp)
  updateOrCreateTag("meta", "property", "og:type", "content", "website");
  updateOrCreateTag("meta", "property", "og:title", "content", socialTitle);
  updateOrCreateTag("meta", "property", "og:description", "content", socialDesc);
  updateOrCreateTag("meta", "property", "og:image", "content", resolvedOgImage);
  updateOrCreateTag("meta", "property", "og:image:width", "content", "1200");
  updateOrCreateTag("meta", "property", "og:image:height", "content", "630");
  updateOrCreateTag("meta", "property", "og:image:alt", "content", socialTitle);
  updateOrCreateTag("meta", "property", "og:url", "content", resolvedOgUrl);
  updateOrCreateTag(
    "meta",
    "property",
    "og:site_name",
    "content",
    primaryTitle
  );

  // Twitter / X Social Cards
  updateOrCreateTag("meta", "name", "twitter:card", "content", "summary_large_image");
  updateOrCreateTag("meta", "name", "twitter:title", "content", socialTitle);
  updateOrCreateTag("meta", "name", "twitter:description", "content", socialDesc);
  updateOrCreateTag("meta", "name", "twitter:image", "content", resolvedOgImage);
  updateOrCreateTag("meta", "name", "twitter:image:alt", "content", socialTitle);
  updateOrCreateTag("meta", "name", "twitter:url", "content", resolvedOgUrl);

  // Schema.org JSON-LD Structured Data
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd) {
    try {
      const parsed = JSON.parse(jsonLd.textContent || "{}");
      if (parsed && typeof parsed === "object") {
        parsed.url = resolvedOgUrl;
        jsonLd.textContent = JSON.stringify(parsed, null, 2);
      }
    } catch (_) {}
  }
}