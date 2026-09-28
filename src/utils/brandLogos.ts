/**
 * Brand Logo Utilities
 * Provides vector SVG logos for default brands and a fallback generator
 * for any brand without a dedicated logoUrl.
 */

// Custom vector SVGs for curated default collaborator brands
export const DEFAULT_BRAND_SVGS: Record<string, string> = {
  chaldal: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" fill="none">
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M10 16h12l-1.5 11h-9L10 16z" stroke="#c084fc" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M13 16v-2.5a3 3 0 016 0V16" stroke="#c084fc" stroke-width="1.6" stroke-linecap="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">CHALDAL</text>
    </svg>
  `)}`,

  sheba: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 40" fill="none">
      <circle cx="16" cy="20" r="14" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M16 11v18M7 20h18M10 14l12 12M22 14L10 26" stroke="#c084fc" stroke-width="1.4" stroke-linecap="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">SHEBA</text>
    </svg>
  `)}`,

  "go nature": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 40" fill="none">
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M16 11c-4.5 4.5-4 11 0 15 4.5-4.5 4.5-10.5 0-15z" stroke="#c084fc" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M12 22c2-2 5-3 8-3" stroke="#c084fc" stroke-width="1.4" stroke-linecap="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">GO NATURE</text>
    </svg>
  `)}`,

  "basumati group": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 40" fill="none">
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M8 24l8-12 8 12M11 20h10" stroke="#c084fc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">BASUMATI</text>
    </svg>
  `)}`,

  "heavens group": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40" fill="none">
      <circle cx="16" cy="20" r="14" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M9 22c0-3.8 3-7 6.8-7 2.8 0 5.2 1.6 6.3 4 2.8.2 4.9 2.5 4.9 5.3 0 2.9-2.4 5.3-5.3 5.3H11c-2.2 0-4-1.8-4-4" stroke="#c084fc" stroke-width="1.5" stroke-linecap="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">HEAVENS</text>
    </svg>
  `)}`,

  "zettabyte technology": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 185 40" fill="none">
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M10 14h12l-12 12h12" stroke="#c084fc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">ZETTABYTE</text>
    </svg>
  `)}`,

  "amiras dental": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40" fill="none">
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M11 13c1.5-2 4-2 5 0 1-2 3.5-2 5 0 2 2.5 2 6-1 12l-4 3-4-3c-3-6-3-9.5-1-12z" stroke="#c084fc" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">AMIRAS</text>
    </svg>
  `)}`,

  "dream advice": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40" fill="none">
      <circle cx="16" cy="20" r="14" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M16 10l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" stroke="#c084fc" stroke-width="1.4" stroke-linejoin="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">DREAM ADVICE</text>
    </svg>
  `)}`,

  "lake powell promotions": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40" fill="none">
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M8 25l6-9 4 5 4-7 4 11H8z" stroke="#c084fc" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" letter-spacing="0.5">LAKE POWELL</text>
    </svg>
  `)}`,

  "page party bounce co.": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 175 40" fill="none">
      <circle cx="16" cy="20" r="14" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <path d="M16 11a5 5 0 015 5c0 3-5 8-5 8s-5-5-5-8a5 5 0 015-5z" stroke="#c084fc" stroke-width="1.5"/>
      <path d="M16 24v4" stroke="#c084fc" stroke-width="1.5" stroke-linecap="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">PAGE PARTY</text>
    </svg>
  `)}`,

  "food collection": `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 185 40" fill="none">
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <circle cx="16" cy="20" r="8" stroke="#c084fc" stroke-width="1.5"/>
      <path d="M11 15v10M21 15v10" stroke="#c084fc" stroke-width="1.4" stroke-linecap="round"/>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14.5" letter-spacing="0.5">FOOD COLLECTION</text>
    </svg>
  `)}`
};

/**
 * Returns the default logo SVG for a brand name, or generates a dynamic
 * clean monogram logo SVG data URI if not recognized.
 */
export function getDefaultBrandLogo(brandName: string): string {
  if (!brandName) {
    return generateFallbackLogo("BRAND");
  }

  const normalized = brandName.trim().toLowerCase();
  
  // Exact match
  if (DEFAULT_BRAND_SVGS[normalized]) {
    return DEFAULT_BRAND_SVGS[normalized];
  }

  // Substring match
  for (const [key, svgUri] of Object.entries(DEFAULT_BRAND_SVGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return svgUri;
    }
  }

  return generateFallbackLogo(brandName);
}

/**
 * Generates an SVG data URI monogram wordmark for any custom brand
 */
export function generateFallbackLogo(name: string): string {
  const cleanName = (name || "BRAND").toUpperCase().trim();
  const initial = cleanName.charAt(0) || "B";
  const displayLabel = cleanName.length > 14 ? cleanName.substring(0, 13) + "…" : cleanName;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" fill="none">
      <rect x="2" y="6" width="28" height="28" rx="8" fill="#a855f7" fill-opacity="0.15" stroke="#a855f7" stroke-width="1.5"/>
      <text x="16" y="25" fill="#c084fc" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="15" text-anchor="middle">${initial}</text>
      <text x="38" y="25" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" letter-spacing="0.5">${displayLabel}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
