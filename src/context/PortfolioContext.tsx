import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { portfolioData as fallbackData } from "../data";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface SectionRecord {
  id: string;
  key: string;
  name: string;
  type: string; // 'single' (one object) or 'collection' (list of objects)
  fields_schema: any[];
  published_content: any;
  draft_content: any;
  is_visible: boolean;
  order_index: number;
}

export interface ProjectSettings {
  showCategoryFilters?: boolean;
  showFilterAll?: boolean;
  showFilterBranding?: boolean;
  showFilterMotion?: boolean;
  showFilterMarketing?: boolean;
  showFilterInternational?: boolean;
  showCategory: boolean;
  showYear: boolean;
  showAwardBadge: boolean;
  showClientName: boolean;
  showServices: boolean;
  showToolsUsed: boolean;
  showProjectDuration: boolean;
  showLiveUrl: boolean;
  showBehanceUrl: boolean;
  showCaseStudyButton: boolean;
  showProjectTags: boolean;
}

export interface SiteSettings {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  cvSource?: "upload" | "url";
  cvUrl?: string;
  cvFileName?: string;
  primaryColor?: string;
  customCss?: string;
  enableChatbot?: boolean;
  projectSettings?: ProjectSettings;
}

interface PortfolioContextType {
  portfolioData: typeof fallbackData;
  isLoading: boolean;
  isPreviewMode: boolean;
  setIsPreviewMode: (preview: boolean) => void;
  isSupabaseActive: boolean;
  isDatabaseOffline: boolean;
  sections: SectionRecord[];
  setSections: React.Dispatch<React.SetStateAction<SectionRecord[]>>;
  siteSettings: SiteSettings;
  setSiteSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  refreshData: () => Promise<void>;
  trackEvent: (eventType: string, details?: any) => Promise<void>;
  isSectionVisible: (key: string) => boolean;
  getSectionOrder: () => string[];
  getSectionRecord: (key: string) => SectionRecord | undefined;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

// Default section ordering if not customized in the DB
const DEFAULT_SECTION_ORDER = [
  "hero",
  "about",
  "experience",
  "skills",
  "services",
  "projects",
  "brands",
  "testimonials",
  "contact",
];

const createDefaultSections = (): SectionRecord[] => {
  return DEFAULT_SECTION_ORDER.map((key, idx) => ({
    id: `local-${key}`,
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    type: "collection",
    fields_schema: [],
    published_content: null,
    draft_content: null,
    is_visible: true,
    order_index: idx,
  }));
};

function adjustHexColor(hex: string, percent: number): string {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sections, setSections] = useState<SectionRecord[]>(() => {
    try {
      const saved = localStorage.getItem("portfolio_sections");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load sections from localStorage cache:", e);
    }
    return createDefaultSections();
  });
  const [isDatabaseOffline, setIsDatabaseOffline] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem("portfolio_site_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load siteSettings from localStorage:", e);
    }
    return {
      seoTitle: "Rashed Pervej | Senior Visualizer Portfolio",
      seoDescription: "Portfolio of Rashed Pervej, Senior Visualizer specializing in Brand Identity, Packaging, and Motion Design.",
      seoKeywords: "portfolio, designer, visualizer, packaging, branding, motion graphics, bangladesh",
      enableChatbot: true,
      projectSettings: {
        showCategoryFilters: true,
        showFilterAll: true,
        showFilterBranding: true,
        showFilterMotion: true,
        showFilterMarketing: true,
        showFilterInternational: true,
        showCategory: true,
        showYear: true,
        showAwardBadge: true,
        showClientName: true,
        showServices: true,
        showToolsUsed: true,
        showProjectDuration: true,
        showLiveUrl: true,
        showBehanceUrl: true,
        showCaseStudyButton: true,
        showProjectTags: true,
      }
    };
  });
  const [activeData, setActiveData] = useState<typeof fallbackData>(fallbackData);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Sync sections to localStorage cache whenever updated
  useEffect(() => {
    if (sections.length > 0) {
      try {
        localStorage.setItem("portfolio_sections", JSON.stringify(sections));
      } catch (e) {
        console.warn("Failed to cache sections in localStorage:", e);
      }
    }
  }, [sections]);

  // Synchronize SEO metadata and Brand Theme dynamically to document head DOM
  useEffect(() => {
    if (siteSettings.seoTitle) {
      document.title = siteSettings.seoTitle;
    }

    if (siteSettings.seoDescription) {
      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement("meta");
        descMeta.setAttribute("name", "description");
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute("content", siteSettings.seoDescription);
    }

    if (siteSettings.seoKeywords) {
      let keywordsMeta = document.querySelector('meta[name="keywords"]');
      if (!keywordsMeta) {
        keywordsMeta = document.createElement("meta");
        keywordsMeta.setAttribute("name", "keywords");
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.setAttribute("content", siteSettings.seoKeywords);
    }

    if (siteSettings.primaryColor) {
      const baseColor = siteSettings.primaryColor;
      const lighterColor = adjustHexColor(baseColor, 18);
      const darkerColor = adjustHexColor(baseColor, -18);

      document.documentElement.style.setProperty("--primary-brand", baseColor);
      document.documentElement.style.setProperty("--primary-brand-400", lighterColor);
      document.documentElement.style.setProperty("--primary-brand-600", darkerColor);

      let themeMeta = document.querySelector('meta[name="theme-color"]');
      if (!themeMeta) {
        themeMeta = document.createElement("meta");
        themeMeta.setAttribute("name", "theme-color");
        document.head.appendChild(themeMeta);
      }
      themeMeta.setAttribute("content", baseColor);
    }
  }, [siteSettings.seoTitle, siteSettings.seoDescription, siteSettings.seoKeywords, siteSettings.primaryColor]);

  // Load all sections and settings from Supabase
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      // Local development fallback
      setIsDatabaseOffline(true);
      if (sections.length === 0) {
        setActiveData(fallbackData);
      }
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch sections
      const { data: sectionData, error: sectionError } = await supabase
        .from("sections")
        .select("*")
        .order("order_index", { ascending: true });

      if (sectionError) {
        throw sectionError;
      }

      // 2. Fetch site settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("site_settings")
        .select("*");

      if (!settingsError && settingsData) {
        const mergedSettings: any = {};
        settingsData.forEach((row) => {
          let val = row.value;
          if (val === "true") val = true;
          if (val === "false") val = false;
          mergedSettings[row.key] = val;
        });
        setSiteSettings((prev) => {
          const next = { ...prev, ...mergedSettings };
          try {
            localStorage.setItem("portfolio_site_settings", JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }

      if (sectionData && Array.isArray(sectionData) && sectionData.length > 0) {
        const fetchedKeys = sectionData.map((s) => s.key);
        const merged = sectionData.map((remoteSec: any) => {
          const localSec = sections.find((s) => s.key === remoteSec.key);
          return {
            ...remoteSec,
            published_content: remoteSec.published_content ?? localSec?.published_content ?? null,
            draft_content: remoteSec.draft_content ?? localSec?.draft_content ?? null,
          };
        });
        DEFAULT_SECTION_ORDER.forEach((key, idx) => {
          if (!fetchedKeys.includes(key)) {
            const localSec = sections.find((s) => s.key === key);
            merged.push(
              localSec || {
                id: `local-${key}`,
                key,
                name: key.charAt(0).toUpperCase() + key.slice(1),
                type: "collection",
                fields_schema: [],
                published_content: null,
                draft_content: null,
                is_visible: true,
                order_index: 100 + idx,
              }
            );
          }
        });
        setSections(merged as SectionRecord[]);
      }
      setIsDatabaseOffline(false);
    } catch (err) {
      console.warn("Supabase database is currently unavailable or offline. Retaining local cached content / data.ts fallbacks.", err);
      setIsDatabaseOffline(true);
      // Sections remain populated from localStorage cache or fallback
    } finally {
      setIsLoading(false);
    }
  }, [sections.length]);

  // Sync / resolve portfolioData based on preview toggle and section records
  useEffect(() => {
    if (sections.length === 0) {
      setActiveData(fallbackData);
      return;
    }

    // Build active data from active state (draft vs published)
    const resolvedData = { ...fallbackData };

    sections.forEach((section) => {
      const content = isPreviewMode
        ? section.draft_content || section.published_content
        : section.published_content;

      if (!content) return; // Skip if no content is populated

      switch (section.key) {
        case "personal_info":
        case "hero":
          // Blend hero and personal_info as they share properties
          resolvedData.personalInfo = {
            ...resolvedData.personalInfo,
            ...content,
          };
          break;
        case "about":
        case "contact":
          resolvedData.personalInfo = {
            ...resolvedData.personalInfo,
            ...content,
          };
          break;
        case "experience":
          if (Array.isArray(content) && content.length > 0) {
            resolvedData.experiences = content;
          }
          break;
        case "projects":
          if (Array.isArray(content) && content.length > 0) {
            resolvedData.projects = content;
          }
          break;
        case "brands":
          if (Array.isArray(content) && content.length > 0) {
            resolvedData.selectedBrands = content;
          }
          break;
        case "skills":
          if (content && typeof content === "object" && Object.keys(content).length > 0) {
            resolvedData.skills = {
              ...resolvedData.skills,
              ...content,
            };
          }
          break;
        case "services":
          if (Array.isArray(content) && content.length > 0) {
            resolvedData.services = content;
          }
          break;
        case "testimonials":
          if (Array.isArray(content) && content.length > 0) {
            resolvedData.testimonials = content;
          }
          break;
        case "educationCertifications":
          if (Array.isArray(content) && content.length > 0) {
            resolvedData.educationCertifications = content;
          }
          break;
        default:
          // Keep as generic sections for dynamic rendering
          break;
      }
    });

    setActiveData(resolvedData);
  }, [sections, isPreviewMode]);

  // Load on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper: check section visibility
  const isSectionVisible = useCallback((key: string): boolean => {
    const section = sections.find((s) => s.key === key);
    if (!section) return true;
    return section.is_visible === true || (section.is_visible as any) === "true";
  }, [sections]);

  // Helper: get dynamic section order
  const getSectionOrder = useCallback((): string[] => {
    if (sections.length === 0) return DEFAULT_SECTION_ORDER;
    
    // Extract section keys in their sorted order
    const orderedKeys = sections
      .filter((s) => !["personal_info", "site_settings", "seo", "footer", "navigation", "educationCertifications", "education_certifications"].includes(s.key))
      .map((s) => s.key);
      
    // If some default sections are missing in DB representation, append them
    DEFAULT_SECTION_ORDER.forEach((key) => {
      if (!orderedKeys.includes(key)) {
        orderedKeys.push(key);
      }
    });

    return orderedKeys;
  }, [sections]);

  // Helper: get full record of a section (for custom components / admin editor)
  const getSectionRecord = useCallback((key: string) => {
    return sections.find((s) => s.key === key);
  }, [sections]);

  // Analytics event tracker
  const trackEvent = useCallback(async (eventType: string, details: any = {}) => {
    // Also log to console in development
    console.log(`[Analytics Event] ${eventType}:`, details);

    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.from("analytics_events").insert({
        event_type: eventType,
        event_details: details,
      });
    } catch (err) {
      console.warn("Failed to write analytics event to Supabase:", err);
    }
  }, []);

  return (
    <PortfolioContext.Provider
      value={{
        portfolioData: activeData,
        isLoading,
        isPreviewMode,
        setIsPreviewMode,
        isSupabaseActive: isSupabaseConfigured,
        isDatabaseOffline,
        sections,
        setSections,
        siteSettings,
        setSiteSettings,
        refreshData: fetchData,
        trackEvent,
        isSectionVisible,
        getSectionOrder,
        getSectionRecord,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
};
