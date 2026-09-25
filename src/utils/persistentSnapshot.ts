import { SectionRecord, SiteSettings } from "../context/PortfolioContext";
import { FALLBACK_SECTIONS, FALLBACK_SITE_SETTINGS, FALLBACK_FAQS, FaqFallbackItem } from "../data/fallbackContent";

export interface PersistentSnapshot {
  version: number;
  timestamp: number;
  lastSyncIso: string;
  source: "supabase_sync";
  sections: SectionRecord[];
  siteSettings: SiteSettings;
  faqs?: FaqFallbackItem[];
}

const PRIMARY_SNAPSHOT_KEY = "portfolio_persistent_snapshot_v1";
const BACKUP_SNAPSHOT_KEY = "portfolio_persistent_snapshot_v1_backup";
const MINIMUM_REQUIRED_SECTIONS = 6;
const ESSENTIAL_SECTION_KEYS = ["hero", "about", "projects", "contact"];

/**
 * Strict validator to guarantee that snapshot data is valid and complete.
 * The snapshot must NEVER be overwritten by failed, incomplete, empty, or invalid data.
 */
export function isValidSnapshotData(sections: any, siteSettings?: any): boolean {
  // 1. Validate sections array
  if (!Array.isArray(sections) || sections.length < MINIMUM_REQUIRED_SECTIONS) {
    return false;
  }

  // 2. Ensure all essential sections exist
  const presentKeys = new Set(sections.map((s) => s?.key));
  for (const essentialKey of ESSENTIAL_SECTION_KEYS) {
    if (!presentKeys.has(essentialKey)) {
      return false;
    }
  }

  // 3. Ensure every section has a valid structure
  for (const sec of sections) {
    if (!sec || typeof sec !== "object") return false;
    if (typeof sec.key !== "string" || sec.key.trim().length === 0) return false;
  }

  // 4. Ensure at least one primary section has real content (not all null/empty)
  const hasAnyContent = sections.some(
    (s) => s.published_content !== null && s.published_content !== undefined
  );
  if (!hasAnyContent) {
    return false;
  }

  // 5. Validate siteSettings if supplied
  if (siteSettings !== undefined && siteSettings !== null) {
    if (typeof siteSettings !== "object" || Array.isArray(siteSettings)) {
      return false;
    }
  }

  return true;
}

/**
 * Loads the persistent fallback snapshot from browser storage.
 * Evaluates primary and backup slots with strict structural validation.
 * Returns null if no valid snapshot is found.
 */
export function loadPersistentSnapshot(): PersistentSnapshot | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  // Attempt 1: Primary snapshot slot
  try {
    const raw = localStorage.getItem(PRIMARY_SNAPSHOT_KEY);
    if (raw) {
      const parsed: PersistentSnapshot = JSON.parse(raw);
      if (parsed && isValidSnapshotData(parsed.sections, parsed.siteSettings)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Snapshot] Failed parsing primary snapshot, trying backup:", err);
  }

  // Attempt 2: Backup snapshot slot
  try {
    const rawBackup = localStorage.getItem(BACKUP_SNAPSHOT_KEY);
    if (rawBackup) {
      const parsedBackup: PersistentSnapshot = JSON.parse(rawBackup);
      if (parsedBackup && isValidSnapshotData(parsedBackup.sections, parsedBackup.siteSettings)) {
        // Self-heal primary slot from valid backup
        try {
          localStorage.setItem(PRIMARY_SNAPSHOT_KEY, rawBackup);
        } catch (_) {}
        return parsedBackup;
      }
    }
  } catch (err) {
    console.warn("[Snapshot] Failed parsing backup snapshot:", err);
  }

  return null;
}

/**
 * Atomically saves a new persistent fallback snapshot.
 * Strict validation: Will NEVER overwrite an existing snapshot if incoming data is incomplete or invalid.
 * If saving fails (e.g. storage quota), the existing snapshot is preserved.
 * Runs non-blocking and will never throw or crash the frontend.
 */
export function savePersistentSnapshot(
  sections: SectionRecord[],
  siteSettings: SiteSettings,
  faqs?: FaqFallbackItem[]
): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  // 1. Strict validation - never overwrite with invalid or incomplete data
  if (!isValidSnapshotData(sections, siteSettings)) {
    console.warn("[Snapshot] Rejected snapshot sync: Data failed completeness/validity validation.");
    return false;
  }

  try {
    const snapshot: PersistentSnapshot = {
      version: 1,
      timestamp: Date.now(),
      lastSyncIso: new Date().toISOString(),
      source: "supabase_sync",
      sections: sections.map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        type: s.type,
        fields_schema: s.fields_schema || [],
        published_content: s.published_content ?? null,
        draft_content: s.draft_content ?? null,
        is_visible: s.is_visible !== false,
        order_index: s.order_index ?? 0,
      })),
      siteSettings: { ...siteSettings },
      faqs: faqs && Array.isArray(faqs) ? faqs : undefined,
    };

    const serialized = JSON.stringify(snapshot);

    // Atomic write to primary slot
    localStorage.setItem(PRIMARY_SNAPSHOT_KEY, serialized);

    // Atomic write to backup slot
    try {
      localStorage.setItem(BACKUP_SNAPSHOT_KEY, serialized);
    } catch (_) {}

    // Asynchronously notify server snapshot endpoint (fire-and-forget, non-blocking)
    if (typeof fetch === "function") {
      try {
        fetch("/api/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        }).catch(() => {
          // Non-blocking, completely silent on network failure
        });
      } catch (_) {}
    }

    return true;
  } catch (err) {
    // If quota exceeded or storage error, preserve previous snapshot and continue safely
    console.warn("[Snapshot] Storage write failed. Existing snapshot kept intact:", err);
    return false;
  }
}

/**
 * Asynchronously triggers a non-blocking snapshot sync.
 * Defers execution to ensure the UI render cycle is completely unblocked.
 */
export function scheduleSnapshotSync(
  sections: SectionRecord[],
  siteSettings: SiteSettings,
  faqs?: FaqFallbackItem[]
): void {
  if (typeof window === "undefined") return;

  const runSync = () => {
    try {
      savePersistentSnapshot(sections, siteSettings, faqs);
    } catch (err) {
      console.warn("[Snapshot] Async sync encountered non-fatal error:", err);
    }
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(runSync, { timeout: 1500 });
  } else {
    setTimeout(runSync, 0);
  }
}

/**
 * Returns initial sections following the priority hierarchy:
 * 1. Valid persistent snapshot (latest successfully synced data from Supabase)
 * 2. Legacy cache (if valid)
 * 3. Bundled static fallback (FALLBACK_SECTIONS)
 */
export function getInitialSections(): SectionRecord[] {
  const snapshot = loadPersistentSnapshot();
  if (snapshot && isValidSnapshotData(snapshot.sections)) {
    return snapshot.sections;
  }

  // Check legacy cache key as fallback
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const legacy = localStorage.getItem("portfolio_sections");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (isValidSnapshotData(parsed)) {
          return parsed;
        }
      }
    }
  } catch (_) {}

  // Tier 3: Bundled static fallback
  return FALLBACK_SECTIONS;
}

/**
 * Returns initial site settings following the priority hierarchy:
 * 1. Valid persistent snapshot siteSettings merged with defaults
 * 2. Legacy cache siteSettings
 * 3. Bundled static fallback (FALLBACK_SITE_SETTINGS)
 */
export function getInitialSiteSettings(): SiteSettings {
  const snapshot = loadPersistentSnapshot();
  if (snapshot && snapshot.siteSettings && typeof snapshot.siteSettings === "object") {
    return { ...FALLBACK_SITE_SETTINGS, ...snapshot.siteSettings };
  }

  // Check legacy cache
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const legacy = localStorage.getItem("portfolio_site_settings");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && typeof parsed === "object") {
          return { ...FALLBACK_SITE_SETTINGS, ...parsed };
        }
      }
    }
  } catch (_) {}

  // Tier 3: Bundled static fallback
  return FALLBACK_SITE_SETTINGS;
}

/**
 * Tries fetching the server-side persistent snapshot if local client storage is empty.
 * If retrieved successfully, seeds localStorage so future access is instantaneous.
 */
export async function fetchServerSnapshot(): Promise<PersistentSnapshot | null> {
  if (typeof fetch !== "function") return null;
  try {
    const res = await fetch("/api/snapshot", { method: "GET" });
    if (!res.ok) return null;
    const data = await res.json();
    if (isValidSnapshotData(data.sections, data.siteSettings)) {
      try {
        localStorage.setItem(PRIMARY_SNAPSHOT_KEY, JSON.stringify(data));
        localStorage.setItem(BACKUP_SNAPSHOT_KEY, JSON.stringify(data));
      } catch (_) {}
      return data;
    }
  } catch (_) {}
  return null;
}

/**
 * Returns initial FAQs following the priority hierarchy:
 * 1. Valid persistent snapshot faqs (if present and valid)
 * 2. Bundled static fallback (FALLBACK_FAQS)
 */
export function getInitialFaqs(): FaqFallbackItem[] {
  const snapshot = loadPersistentSnapshot();
  if (snapshot && snapshot.faqs && Array.isArray(snapshot.faqs) && snapshot.faqs.length > 0) {
    return snapshot.faqs;
  }
  return FALLBACK_FAQS;
}
