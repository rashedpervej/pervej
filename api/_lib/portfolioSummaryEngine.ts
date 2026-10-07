/**
 * Autonomous Portfolio Summary Engine
 * 
 * Automatically generates, updates, and caches a compact, factual summary of Rashed's
 * portfolio content directly from structured portfolio data (DB / snapshot).
 * Runs completely autonomously without requiring manual human input.
 */

import { cleanText, StructuredPortfolioData } from "./chatKnowledge.js";

export interface PortfolioFactualSummary {
  compactFactualText: string;
  keyTopics: string[];
  lastUpdated: number;
  dataHash: string;
}

let cachedSummary: PortfolioFactualSummary | null = null;

function computeDataHash(data: StructuredPortfolioData): string {
  const identity = `${data.name}|${data.role}|${data.experienceYears}|${data.location}`;
  const srvCount = Array.isArray(data.services) ? data.services.length : 0;
  const prjCount = Array.isArray(data.projects) ? data.projects.length : 0;
  const brandCount = Array.isArray(data.brands) ? data.brands.length : 0;
  const faqCount = Array.isArray(data.faqs) ? data.faqs.length : 0;
  return `${identity}:${srvCount}:${prjCount}:${brandCount}:${faqCount}`;
}

/**
 * Autonomously builds or refreshes the factual knowledge summary.
 * If data hasn't changed and cache is fresh, returns cached summary immediately.
 */
export function getAutonomousPortfolioSummary(data: StructuredPortfolioData): PortfolioFactualSummary {
  const hash = computeDataHash(data);
  const now = Date.now();

  if (cachedSummary && cachedSummary.dataHash === hash && (now - cachedSummary.lastUpdated) < 300000) {
    return cachedSummary;
  }

  // 1. Identity & Profile
  const name = data.name || "Rashed Pervej";
  const role = data.role || "Senior Visualizer";
  const headline = data.headline || "Brand Identity | Motion Graphics | Packaging";
  const expYears = data.experienceYears || "6+";
  const location = data.location || "Jashore, Bangladesh";
  const availability = data.availability || "Available for Remote & Hybrid globally";
  const bio = data.aboutSummary || data.heroBio || "Senior Visualizer specializing in brand identity, packaging, and commercial visual design.";

  // 2. Services Summary
  const servicesList = Array.isArray(data.services)
    ? data.services
        .map((s: any) => cleanText(s.title || s.name))
        .filter(Boolean)
        .join(", ")
    : "Brand Identity Systems, Packaging Design, Motion Graphics";

  // 3. Featured Brands & Markets
  const brandsList = Array.isArray(data.brands)
    ? data.brands
        .map((b: any) => cleanText(b.brandName || b.name))
        .filter(Boolean)
        .slice(0, 10)
        .join(", ")
    : "Go Nature BD, Chaldal Ltd., Sheba Platform Ltd.";

  // 4. Tools & Software
  const creativeTools = data.skills?.creativeTools;
  const toolsList = Array.isArray(creativeTools)
    ? creativeTools.map((t: any) => cleanText(t.name || t)).filter(Boolean).join(", ")
    : typeof creativeTools === "string"
    ? cleanText(creativeTools)
    : "Adobe Photoshop, Illustrator, After Effects, InDesign, Figma, Premiere Pro, AI-Assisted Workflows";

  // 5. Featured Projects Summary
  const projectsList = Array.isArray(data.projects)
    ? data.projects
        .slice(0, 8)
        .map((p: any) => {
          const t = cleanText(p.title);
          const c = cleanText(p.category || "");
          return c ? `${t} (${c})` : t;
        })
        .filter(Boolean)
        .join("; ")
    : "Brand Identity, Packaging Dielines, Commercial Motion Graphics";

  // 6. Direct Contact Channels
  const email = data.email || "rashedpervej2011@gmail.com";
  const phone = data.phone || "+8801932623969";
  const behance = data.behance ? `https://${data.behance.replace(/^https?:\/\//, "")}` : "https://be.net/rashedpervej";
  const linkedin = data.linkedin ? `https://${data.linkedin.replace(/^https?:\/\//, "")}` : "https://linkedin.com/in/rpervej";

  // Format concise, high-density factual summary
  const compactFactualText = `### RASHED PERVEJ - VERIFIED PORTFOLIO FACTS
- **Identity**: ${name} — ${role} (${headline}).
- **Experience**: ${expYears} years in professional visual design. Location: ${location}.
- **Availability**: ${availability}. Open to freelance, high-impact contract, senior visualizer, and in-house roles.
- **Core Bio**: ${bio}
- **Design Services**: ${servicesList}.
- **Selected Brands Collaborated With**: ${brandsList}.
- **Featured Projects**: ${projectsList}.
- **Creative Toolkit**: ${toolsList}.
- **Pricing Strategy**: Custom project-based quotations tailored to deliverables, timeline, and scope (no rigid hourly rate).
- **Direct Contacts**: WhatsApp: ${phone} | Email: ${email} | Behance: ${behance} | LinkedIn: ${linkedin}.`;

  const keyTopics = [
    "brand identity",
    "packaging design",
    "motion graphics",
    "supplement packaging",
    "logo design",
    "pricing",
    "contact",
    "experience",
    "services",
    "software",
    "tools",
    "hire",
    "remote",
  ];

  cachedSummary = {
    compactFactualText,
    keyTopics,
    lastUpdated: now,
    dataHash: hash,
  };

  return cachedSummary;
}
