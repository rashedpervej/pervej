import fs from "fs";
import path from "path";
import { decryptVaultData } from "./vaultCrypto.js";

// Clean, standalone fallbacks for chat knowledge without external frontend ESM dependencies
const DEFAULT_PERSONAL_INFO = {
  name: "Rashed Pervej",
  role: "Senior Visualizer & Graphic Designer",
  headline: "Brand Identity | Motion Graphics | Packaging",
  heroBio: "6+ years crafting high-impact brand identities, packaging designs, and motion graphics.",
  aboutSummary: "Senior Visualizer with 6+ years of specialized experience in brand identity, packaging, and commercial visual design.",
  aboutDetail: "Proven expertise across Bangladesh, USA, and European markets.",
  location: "Jashore, Bangladesh",
  availability: "Available for Remote & Hybrid globally",
  experienceYears: "6+",
  email: "rashedpervej2011@gmail.com",
  phone: "+8801932623969",
  linkedin: "linkedin.com/in/rpervej",
  behance: "be.net/rashedpervej",
};

let cachedCompactKnowledge: string | null = null;
let cachedFullKnowledge: string | null = null;
let lastKnowledgeFetch = 0;
const KNOWLEDGE_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export function cleanText(input: any): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface StructuredPortfolioData {
  name: string;
  role: string;
  headline: string;
  heroBio: string;
  aboutSummary: string;
  aboutDetail: string;
  location: string;
  availability: string;
  experienceYears: string;
  email: string;
  phone: string;
  linkedin: string;
  behance: string;
  experiences: any[];
  services: any[];
  skills: any;
  brands: any[];
  projects: any[];
  educationCertifications: any[];
  testimonials: any[];
  faqs: Array<{ question: string; answer: string }>;
  aiApiKey?: string;
  aiVault?: any[];
  aiRouterSettings?: any;
  chatTrainingRules?: any[];
  customPriceGuidelines?: string;
  masterUnifiedKey?: string;
  chatbotSettings?: any;
}

let cachedStructuredData: StructuredPortfolioData | null = null;

export function getDbAiApiKey(): string | null {
  return cachedStructuredData?.aiApiKey || null;
}

/**
 * Loads raw section and FAQ data from Supabase, falling back to data/snapshot.json and src/data.ts
 */
export async function getStructuredPortfolioData(): Promise<StructuredPortfolioData> {
  const now = Date.now();
  if (cachedStructuredData && now - lastKnowledgeFetch < KNOWLEDGE_CACHE_TTL) {
    return cachedStructuredData;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let sectionsMap: Record<string, any> = {};
  let faqsList: Array<{ question: string; answer: string }> = [];
  let dbAiApiKey = "";
  let dbAiVault: any[] | undefined = undefined;
  let dbAiRouterSettings: any | undefined = undefined;
  let dbChatTrainingRules: any[] | undefined = undefined;
  let dbCustomPriceGuidelines: string | undefined = undefined;
  let dbMasterUnifiedKey: string | undefined = undefined;
  let dbChatbotSettings: any | undefined = undefined;

  // 1. Try querying Supabase
  if (supabaseUrl && supabaseKey && supabaseUrl !== "https://your-supabase-project.supabase.co") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const [sectionsRes, faqsRes, settingsRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/sections?select=key,published_content,content&order=order_index`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${supabaseUrl}/rest/v1/faq_knowledge_base?select=question,answer&status=eq.published`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${supabaseUrl}/rest/v1/site_settings?select=key,value`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

      clearTimeout(timeoutId);

      if (Array.isArray(sectionsRes) && sectionsRes.length > 0) {
        sectionsRes.forEach((sec: any) => {
          if (sec?.key) {
            sectionsMap[sec.key] = sec.published_content || sec.content;
          }
        });
      }

      if (Array.isArray(faqsRes) && faqsRes.length > 0) {
        faqsList = faqsRes.map((f: any) => ({
          question: cleanText(f.question),
          answer: cleanText(f.answer),
        }));
      }

      if (Array.isArray(settingsRes) && settingsRes.length > 0) {
        const found = settingsRes.find((s: any) => s.key === "aiApiKey" || s.key === "geminiApiKey");
        if (found && typeof found.value === "string" && found.value.trim()) {
          dbAiApiKey = found.value.trim();
        }
        // Check non-empty encrypted_ai_vault, then non-empty aiVault
        const encVaultRow = settingsRes.find((s: any) => s.key === "encrypted_ai_vault" && s.value && s.value.trim()) ||
                            settingsRes.find((s: any) => s.key === "aiVault" && s.value && s.value.trim());
        if (encVaultRow && encVaultRow.value) {
          try {
            const decrypted = await decryptVaultData(encVaultRow.value);
            if (Array.isArray(decrypted) && decrypted.length > 0) {
              // Strictly sanitize out unconfigured dead Gemini keys lingering from legacy rows
              dbAiVault = decrypted.filter((k: any) => {
                const prov = (k?.provider || "").toLowerCase();
                const key = (k?.apiKey || "").trim();
                const label = (k?.label || "").toLowerCase();
                if (prov === "gemini" || prov === "google-gemini" || label.includes("gemini") || key.startsWith("AQ.")) {
                  if (!key.startsWith("AIzaSy")) return false;
                }
                return true;
              });
            }
          } catch (e) {
            console.warn("[chatKnowledge] Could not decrypt vault from DB:", e);
          }
        }
        const routerRow = settingsRes.find((s: any) => s.key === "aiRouterSettings");
        if (routerRow && routerRow.value) {
          try {
            dbAiRouterSettings = typeof routerRow.value === "string" ? JSON.parse(routerRow.value) : routerRow.value;
          } catch (e) {}
        }
        const trainingRow = settingsRes.find((s: any) => s.key === "chatTrainingRules");
        if (trainingRow && trainingRow.value) {
          try {
            dbChatTrainingRules = typeof trainingRow.value === "string" ? JSON.parse(trainingRow.value) : trainingRow.value;
          } catch (e) {}
        }
        const priceRow = settingsRes.find((s: any) => s.key === "customPriceGuidelines");
        if (priceRow && priceRow.value) {
          dbCustomPriceGuidelines = typeof priceRow.value === "string" ? priceRow.value : JSON.stringify(priceRow.value);
        }
        const masterKeyRow = settingsRes.find((s: any) => s.key === "masterUnifiedKey");
        if (masterKeyRow && masterKeyRow.value) {
          dbMasterUnifiedKey = typeof masterKeyRow.value === "string" ? masterKeyRow.value.trim() : String(masterKeyRow.value).trim();
        }
        const chatbotRow = settingsRes.find((s: any) => s.key === "chatbotSettings");
        if (chatbotRow && chatbotRow.value) {
          try {
            dbChatbotSettings = typeof chatbotRow.value === "string" ? JSON.parse(chatbotRow.value) : chatbotRow.value;
          } catch (e) {}
        }
      }
    } catch (e: any) {
      console.warn("[chatKnowledge] Supabase query timed out or failed, falling back to snapshot:", e?.message);
    }
  }

  // 1b. Fallback to local snapshot.json for AI keys/vault if not populated from Supabase
  if ((!dbAiVault || (Array.isArray(dbAiVault) && dbAiVault.length === 0)) && !dbAiApiKey) {
    try {
      let parsed: any = null;
      const snapshotPath = path.join(process.cwd(), "data", "snapshot.json");
      if (fs.existsSync(snapshotPath)) {
        const raw = fs.readFileSync(snapshotPath, "utf-8");
        parsed = JSON.parse(raw);
      }
      if (!parsed) {
        try {
          const mod = await import("../../data/snapshot.json", { with: { type: "json" } });
          parsed = mod.default || mod;
        } catch (_) {}
      }
      if (parsed) {
        const sSettings = parsed.siteSettings || parsed.site_settings || {};
        if (sSettings.aiApiKey) {
          dbAiApiKey = sSettings.aiApiKey;
        }
        const rawSnapVault = sSettings.encrypted_ai_vault || sSettings.aiVault;
        if (rawSnapVault) {
          const decrypted = await decryptVaultData(rawSnapVault);
          if (Array.isArray(decrypted) && decrypted.length > 0) {
            dbAiVault = decrypted.filter((k: any) => {
              const prov = (k?.provider || "").toLowerCase();
              const key = (k?.apiKey || "").trim();
              if (prov === "gemini" || prov === "google-gemini" || key.startsWith("AQ.")) {
                if (!key.startsWith("AIzaSy")) return false;
              }
              return true;
            });
          }
        }
        if (sSettings.aiRouterSettings && !dbAiRouterSettings) {
          dbAiRouterSettings = sSettings.aiRouterSettings;
        }
      }
    } catch (e) {}
  }

  // 1c. Runtime environment fallback if no vault is configured in DB/snapshot
  if ((!dbAiVault || (Array.isArray(dbAiVault) && dbAiVault.length === 0)) && !dbAiApiKey) {
    const envGroq = process.env.GROQ_API_KEY;
    const envVault: any[] = [];

    if (envGroq && typeof envGroq === "string" && envGroq.trim() && !envGroq.startsWith("MY_")) {
      envVault.push({
        id: "vault_groq_env",
        provider: "groq",
        label: "Groq Cloud (Environment)",
        apiKey: envGroq.trim(),
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        priority: 1,
        isActive: true,
      });
    }

    if (envVault.length > 0) {
      dbAiVault = envVault;
    }
  }

  // 1d. If no vault keys found, system will log appropriate diagnostic warning in chat handler

  // 2. Fallback to local snapshot.json if sections not loaded from Supabase
  if (Object.keys(sectionsMap).length === 0) {
    try {
      const snapshotPath = path.join(process.cwd(), "data", "snapshot.json");
      if (fs.existsSync(snapshotPath)) {
        const raw = fs.readFileSync(snapshotPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.sections)) {
          parsed.sections.forEach((sec: any) => {
            if (sec?.key) {
              sectionsMap[sec.key] = sec.published_content || sec.content;
            }
          });
        }
      }
    } catch (e: any) {
      // Fall through to hardcoded fallback
    }
  }

  // Fallback FAQs if not populated from Supabase
  if (faqsList.length === 0) {
    faqsList = [
      {
        question: "What design services does Rashed provide?",
        answer: "Rashed specializes in Brand Identity Design, Product Packaging & Label Design, Motion Graphics & Visual Commercials, and Design Direction & Mentorship.",
      },
      {
        question: "How much experience does Rashed have?",
        answer: "Rashed has over 6+ years of professional industry experience (7+ years design journey), collaborating with major brands like Go Nature BD, Chaldal, Sheba Platform, and global clients across Belgium and the USA.",
      },
      {
        question: "How can I contact or hire Rashed?",
        answer: "You can reach Rashed directly via WhatsApp/Phone at +8801932623969 or email at rashedpervej2011@gmail.com. His portfolio is on Behance at be.net/rashedpervej and LinkedIn at linkedin.com/in/rpervej.",
      },
      {
        question: "How does Rashed handle pricing and project estimates?",
        answer: "Rashed provides flexible, value-driven project-based estimates tailored to the scope, deliverables, and timeline of your project rather than rigid hourly billing.",
      },
      {
        question: "Is Rashed available for remote or international projects?",
        answer: "Yes, Rashed is fully available for remote and hybrid collaboration globally, with smooth communication across North America, Europe, and Asia timezones.",
      },
      {
        question: "What software and creative tools does Rashed use?",
        answer: "He primarily works with Adobe Illustrator, Photoshop, After Effects, InDesign, Premiere Pro, and Figma, alongside AI-assisted visual production tools.",
      },
      {
        question: "Does Rashed provide print-ready packaging files?",
        answer: "Yes, all packaging deliverables include millimeter-accurate dielines, CMYK color specifications, spot colors, and print-ready press PDFs ready for manufacturing.",
      },
      {
        question: "What is Rashed's typical design workflow?",
        answer: "The process begins with brand discovery and creative brief alignment, followed by conceptual exploration, iterative feedback rounds, and finalized multi-format asset delivery.",
      },
    ];
  }

  const hero = sectionsMap.hero || {};
  const about = sectionsMap.about || {};
  const contact = sectionsMap.contact || {};
  const experienceList = Array.isArray(sectionsMap.experience) ? sectionsMap.experience : [];
  const skillsData = sectionsMap.skills || {};
  const servicesList = Array.isArray(sectionsMap.services) ? sectionsMap.services : [];
  const brandsList = Array.isArray(sectionsMap.brands) ? sectionsMap.brands : [];
  const projectsList = Array.isArray(sectionsMap.projects) ? sectionsMap.projects : [];
  const educationList = Array.isArray(sectionsMap.educationCertifications) ? sectionsMap.educationCertifications : [];
  const testimonialsList = Array.isArray(sectionsMap.testimonials) ? sectionsMap.testimonials : [];

  const data: StructuredPortfolioData = {
    name: cleanText(hero.name || DEFAULT_PERSONAL_INFO.name) || "Rashed Pervej",
    role: cleanText(hero.role || DEFAULT_PERSONAL_INFO.role) || "Senior Visualizer & Graphic Designer",
    headline: cleanText(hero.headline || DEFAULT_PERSONAL_INFO.headline) || "Brand Identity | Motion Graphics | Packaging",
    heroBio: cleanText(hero.heroBio || DEFAULT_PERSONAL_INFO.heroBio),
    aboutSummary: cleanText(about.aboutSummary || DEFAULT_PERSONAL_INFO.aboutSummary),
    aboutDetail: cleanText(about.aboutDetail || DEFAULT_PERSONAL_INFO.aboutDetail),
    location: cleanText(contact.location || hero.location || DEFAULT_PERSONAL_INFO.location) || "Jashore, Bangladesh",
    availability: cleanText(hero.availability || DEFAULT_PERSONAL_INFO.availability) || "Available for Remote & Hybrid globally",
    experienceYears: cleanText(hero.experienceYears || DEFAULT_PERSONAL_INFO.experienceYears) || "6+",
    email: cleanText(contact.email || DEFAULT_PERSONAL_INFO.email) || "rashedpervej2011@gmail.com",
    phone: cleanText(contact.phone || DEFAULT_PERSONAL_INFO.phone) || "+8801932623969",
    linkedin: cleanText(contact.linkedin || DEFAULT_PERSONAL_INFO.linkedin) || "linkedin.com/in/rpervej",
    behance: cleanText(contact.behance || DEFAULT_PERSONAL_INFO.behance) || "be.net/rashedpervej",
    experiences: experienceList,
    services: servicesList,
    skills: skillsData,
    brands: brandsList,
    projects: projectsList,
    educationCertifications: educationList,
    testimonials: testimonialsList,
    faqs: faqsList,
    aiApiKey: dbAiApiKey || undefined,
    aiVault: dbAiVault,
    aiRouterSettings: dbAiRouterSettings,
    chatTrainingRules: dbChatTrainingRules,
    customPriceGuidelines: dbCustomPriceGuidelines,
    masterUnifiedKey: dbMasterUnifiedKey || process.env.MASTER_UNIFIED_KEY || process.env.PRECIOUS_MASTER_KEY,
    chatbotSettings: dbChatbotSettings,
  };

  cachedStructuredData = data;
  return data;
}

import { getAutonomousPortfolioSummary } from "./portfolioSummaryEngine.js";

/**
 * Loads dynamic knowledge base as formatted Markdown for Gemini/AI System Instruction
 * Supports "compact" (token-optimized ~250 words) and "full" (all verbose sections)
 */
export async function getPortfolioKnowledge(mode: "compact" | "full" = "compact"): Promise<string> {
  const now = Date.now();
  if (mode === "compact" && cachedCompactKnowledge && now - lastKnowledgeFetch < KNOWLEDGE_CACHE_TTL) {
    return cachedCompactKnowledge;
  }
  if (mode === "full" && cachedFullKnowledge && now - lastKnowledgeFetch < KNOWLEDGE_CACHE_TTL) {
    return cachedFullKnowledge;
  }

  const d = await getStructuredPortfolioData();

  if (mode === "compact") {
    const summary = getAutonomousPortfolioSummary(d);
    const faqSummary = Array.isArray(d.faqs) && d.faqs.length > 0
      ? "\n\n### VERIFIED FAQS & POLICIES\n" + d.faqs.slice(0, 15).map((f: any) => `- Q: ${f.question} -> A: ${f.answer}`).join("\n")
      : "";

    const compactText = `${summary.compactFactualText}${faqSummary}`;
    cachedCompactKnowledge = compactText;
    lastKnowledgeFetch = now;
    return compactText;
  }

  const sections: string[] = [];

  sections.push(`### 1. IDENTITY & PROFILE
- **Name**: ${d.name}
- **Primary Title**: ${d.role}
- **Specializations**: ${d.headline}
- **Experience**: ${d.experienceYears} years (Over 7 years total design journey)
- **Base Location**: ${d.location}
- **Availability**: ${d.availability} (Open to Remote, Hybrid, Contract, and Full-time roles worldwide)
- **Summary**: ${d.aboutSummary || d.heroBio}
- **Design Philosophy**: ${d.aboutDetail || "Transforming ideas into cohesive brand experiences through strategic visual storytelling, rigorous pre-press print standards, and modern AI-enhanced workflows."}
`);

  sections.push(`### 2. CONTACT & HIRING CHANNELS
- **Email**: ${d.email}
- **WhatsApp / Phone**: ${d.phone}
- **Behance Portfolio**: https://${d.behance.replace(/^https?:\/\//, "")}
- **LinkedIn**: https://${d.linkedin.replace(/^https?:\/\//, "")}
`);

  sections.push(`### 3. PRICING & ENGAGEMENT MODEL
- **Pricing Strategy**: Rashed does not charge rigid, one-size-fits-all hourly rates. All pricing is customized and project-based depending on specific deliverables, scope, complexity, and timeline.
- **Service Categories for Quotes**:
  1. Brand Identity Systems (Logos, styleguides, typography, color palettes, stationery)
  2. Premium Packaging & 3D Dielines (Food supplements, consumer healthcare, retail boxes, vendor pre-press)
  3. Motion Graphics & Video Promos (Animated marketing ads, kinetic typography, Reels, showreels)
- **How to Get a Quote**: Clients are invited to reach out via WhatsApp at ${d.phone} or email at ${d.email} with their project brief for a personalized quote.
`);

  if (Array.isArray(d.experiences) && d.experiences.length > 0) {
    const expText = d.experiences
      .map((exp: any) => {
        const descItems = Array.isArray(exp.description)
          ? exp.description.map((item: string) => `    - ${cleanText(item)}`).join("\n")
          : `    - ${cleanText(exp.description)}`;
        return `- **${cleanText(exp.role)}** at **${cleanText(exp.company)}** (${cleanText(exp.period)} | ${cleanText(exp.location)} | ${cleanText(exp.type || "Full-Time")})\n${descItems}`;
      })
      .join("\n");
    sections.push(`### 4. PROFESSIONAL WORK EXPERIENCE\n${expText}\n`);
  }

  if (Array.isArray(d.services) && d.services.length > 0) {
    const srvText = d.services
      .map((s: any) => {
        const skills = Array.isArray(s.skills) ? s.skills.join(", ") : cleanText(s.skills);
        return `- **${cleanText(s.title)}**: ${cleanText(s.description)}\n  *Deliverables/Skills*: ${skills}`;
      })
      .join("\n");
    sections.push(`### 5. CORE DESIGN SERVICES\n${srvText}\n`);
  }

  const creativeTools = d.skills?.creativeTools || [];
  const coreCompetencies = d.skills?.coreCompetencies || [];
  const toolsFormatted = Array.isArray(creativeTools)
    ? creativeTools.map((t: any) => cleanText(t.name || t)).filter(Boolean).join(", ")
    : "Adobe Photoshop, Adobe Illustrator, Adobe After Effects, Canva, CapCut, WordPress, AI-Assisted Design";
  const compsFormatted = Array.isArray(coreCompetencies)
    ? coreCompetencies.map((c: any) => cleanText(c)).filter(Boolean).join(", ")
    : "Brand Identity, Packaging Design, Motion Graphics, Creative Direction, AI-Assisted Design";

  sections.push(`### 6. SKILLS & CREATIVE TOOLS
- **Software Toolkit**: ${toolsFormatted}
- **Core Competencies**: ${compsFormatted}
`);

  if (Array.isArray(d.brands) && d.brands.length > 0) {
    const brandsText = d.brands
      .map((b: any) => {
        const bName = cleanText(b.brandName || b.name);
        const market = cleanText(b.market || b.country || "Global");
        return `- **${bName}** (${market})`;
      })
      .join("\n");
    sections.push(`### 7. SELECTED CLIENT BRANDS & MARKETS\n${brandsText}\n`);
  }

  if (Array.isArray(d.projects) && d.projects.length > 0) {
    const projText = d.projects
      .map((p: any) => {
        const title = cleanText(p.title);
        const cat = cleanText(p.category || p.serviceProvided || "");
        const desc = cleanText(p.description);
        const year = cleanText(p.year);
        return `- **${title}** (${year}${cat ? ` | ${cat}` : ""}): ${desc}`;
      })
      .join("\n");
    sections.push(`### 8. FEATURED PORTFOLIO PROJECTS\n${projText}\n`);
  }

  if (Array.isArray(d.educationCertifications) && d.educationCertifications.length > 0) {
    const eduText = d.educationCertifications
      .map((e: any) => `- **${cleanText(e.title)}** – ${cleanText(e.institution)} (${cleanText(e.period || "")})`)
      .join("\n");
    sections.push(`### 9. EDUCATION & CERTIFICATIONS\n${eduText}\n`);
  }

  if (Array.isArray(d.testimonials) && d.testimonials.length > 0) {
    const testText = d.testimonials
      .map((t: any) => `> "${cleanText(t.quote)}"\n  — **${cleanText(t.author)}**, ${cleanText(t.role)} at ${cleanText(t.company)}`)
      .join("\n\n");
    sections.push(`### 10. CLIENT TESTIMONIALS & REVIEWS\n${testText}\n`);
  }

  if (d.faqs.length > 0) {
    const faqText = d.faqs
      .map((f: any) => `**Q: ${f.question}**\n**A:** ${f.answer}`)
      .join("\n\n");
    sections.push(`### 11. VERIFIED FAQ KNOWLEDGE\n${faqText}\n`);
  }

  const finalKnowledge = sections.join("\n");
  cachedFullKnowledge = finalKnowledge;
  lastKnowledgeFetch = now;
  return finalKnowledge;
}
