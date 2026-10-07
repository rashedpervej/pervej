/**
 * Seamless Fuzzy Fallback Engine (Tier 2 Resilience)
 * 
 * Provides human-like, typo-tolerant, intelligent fallback responses
 * when AI providers are unavailable, grounded strictly in Portfolio DB content & FAQs.
 * The visitor is never told "AI failed" or shown technical error traces.
 */

import { cleanText, StructuredPortfolioData } from "./chatKnowledge.js";
import { getAutonomousPortfolioSummary } from "./portfolioSummaryEngine.js";

/**
 * Computes Levenshtein distance for fuzzy typo matching
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Checks similarity score between two words (0.0 to 1.0)
 */
function wordSimilarity(w1: string, w2: string): number {
  if (w1 === w2) return 1.0;
  if (!w1 || !w2) return 0;
  const maxLen = Math.max(w1.length, w2.length);
  const dist = levenshteinDistance(w1, w2);
  return 1 - dist / maxLen;
}

/**
 * Computes Jaccard keyword overlap with typo tolerance
 */
function fuzzyOverlapScore(queryTokens: string[], targetTokens: string[]): number {
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;
  let matches = 0;

  for (const q of queryTokens) {
    if (q.length < 3) continue;
    let bestMatch = 0;
    for (const t of targetTokens) {
      if (t.length < 3) continue;
      const sim = wordSimilarity(q, t);
      if (sim > bestMatch) bestMatch = sim;
    }
    if (bestMatch >= 0.75) {
      matches += bestMatch;
    }
  }

  return matches / Math.min(queryTokens.length, targetTokens.length);
}

/**
 * Normalizes input text and common Bangla/English typos
 */
function normalizeQuery(text: string): { normalized: string; tokens: string[]; isBengaliOrBanglish: boolean } {
  const lower = text.toLowerCase().trim();
  const isBengaliScript = /[\u0980-\u09FF]/.test(lower);
  const banglishRegex =
    /\b(koren|kore|kori|korte|koro|korbo|koto|kobe|koi|chai|chay|ache|achhe|ase|lagbe|lagve|hobe|jani|bolen|amake|amar|apnar|apni|tumi|tomar|ki|keno|kemon|kothay|shuru|bhalo|darun|dhaka|jashore|dam|khoroch|somoy|duita|ekta|duti|ta|tate|korsen|kortesi|korchen|dao|den|din|acho|achen|achis|bhai|vai|dekhan|bolo)\b/i;
  const isBanglish = banglishRegex.test(lower);
  const isBengaliOrBanglish = isBengaliScript || isBanglish;

  const normalized = lower
    .replace(/pakaging|packging|pakeging|pakg/g, "packaging")
    .replace(/desing|dizain|dezign|dezyn/g, "design")
    .replace(/brnding|barnding|barnd/g, "branding")
    .replace(/softwer|sofware|tuls|tools/g, "software")
    .replace(/suplement|suplemnt|soplyment/g, "supplement")
    .replace(/lagve/g, "lagbe")
    .replace(/experiance|experince|oviggota/g, "experience")
    .replace(/dam|khoroch|cost|budget|priic/g, "price")
    .replace(/jogajog|numbr|phon|thikana/g, "contact");

  const tokens = normalized
    .replace(/[^a-z0-9\u0980-\u09FF\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return { normalized, tokens, isBengaliOrBanglish };
}

export interface FuzzyFallbackResult {
  text: string;
  matchedSource: "faq" | "portfolio_fact" | "conversational" | "general_safe";
  confidence: number;
}

/**
 * Main execution function for Tier-2 Seamless Fallback
 */
export function resolveFuzzyPortfolioFallback(
  query: string,
  history: any[],
  data: StructuredPortfolioData
): FuzzyFallbackResult {
  const { normalized, tokens, isBengaliOrBanglish } = normalizeQuery(query);
  const summary = getAutonomousPortfolioSummary(data);

  // 1. Greetings & Pleasantries
  if (
    /^(h+i+|h+e+y+|hell+o+|hei+|hiya|heya|hola|yo|good\s*(morning|afternoon|evening)|হাই|হ্যালো|হেই|নমস্কার)\b/i.test(normalized) ||
    /^(hi+|he+y+|hell+o+|hei+)\s+(there|bot|bro|rashed|bhai)?$/i.test(normalized)
  ) {
    return {
      text: isBengaliOrBanglish
        ? "হ্যালো! কেমন আছেন? Rashed-এর পোর্টফোলিও, ডিজাইন সার্ভিস বা নতুন কোনো প্রজেক্ট নিয়ে কি জানতে চাচ্ছেন?"
        : "Hi there! How can I help you today? Looking to explore Rashed's design work or planning a project?",
      matchedSource: "conversational",
      confidence: 1.0,
    };
  }

  // 1b. Islamic Salam & Well-wishes
  if (
    /\b(assalamu\s*alaikum|as-salamu\s*alaikum|salam|slaam|সালাম|আসসালামু\s*আলাইকুম|কেমন\s*আছেন|কেমন\s*আছো|kemon\s*achen|kemon\s*acho|kemon\s*aso)\b/i.test(normalized)
  ) {
    if (/salam|সালাম/i.test(normalized)) {
      return {
        text: "ওয়ালাইকুমুস সালাম! কেমন আছেন? Rashed-এর ডিজাইন কাজ, পোর্টফোলিও বা প্রজেক্ট নিয়ে কীভাবে সাহায্য করতে পারি?",
        matchedSource: "conversational",
        confidence: 1.0,
      };
    }
    return {
      text: isBengaliOrBanglish
        ? "হ্যালো! ভালো আছি, ধন্যবাদ। Rashed-এর পোর্টফোলিও বা ডিজাইন সংক্রান্ত কোনো বিষয়ে জানতে চান?"
        : "Hello! I am doing well, thank you. How can I assist you with Rashed's portfolio or design inquiries today?",
      matchedSource: "conversational",
      confidence: 1.0,
    };
  }

  // 1c. Gratitude & Acknowledgements
  if (
    /^(thanks?|thank\s*you|thnx|ty|dhonyobad|dhonnobad|shukriya|ধন্যবাদ|শুকরিয়া|ok|okay|k|got\s*it|thik\s*ache|accha|acha)\b/i.test(normalized)
  ) {
    return {
      text: isBengaliOrBanglish
        ? "আপনাকে অনেক ধন্যবাদ ও স্বাগতম! 😊 Rashed-এর কাজ বা প্রজেক্ট নিয়ে আর কোনো কিছু জানতে চাইলে নির্দ্বিধায় বলতে পারেন।"
        : "You're very welcome! 😊 Feel free to ask if there's anything else you'd like to know about Rashed's work or project collaboration.",
      matchedSource: "conversational",
      confidence: 1.0,
    };
  }

  // 2. High-Confidence Search against Published FAQ Knowledge Base
  if (Array.isArray(data.faqs) && data.faqs.length > 0) {
    let bestFaq: { question: string; answer: string } | null = null;
    let highestScore = 0;

    for (const faq of data.faqs) {
      if (!faq?.question || !faq?.answer) continue;
      const faqTokens = faq.question
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09FF\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

      const score = fuzzyOverlapScore(tokens, faqTokens);
      if (score > highestScore) {
        highestScore = score;
        bestFaq = faq;
      }
    }

    if (bestFaq && highestScore >= 0.60) {
      return {
        text: bestFaq.answer,
        matchedSource: "faq",
        confidence: highestScore,
      };
    }
  }

  // 3. Targeted Factual Inquiries matched from Autonomous Portfolio Summary
  // 3a. Pricing / Cost inquiry
  if (/\b(price|pricing|cost|rate|fee|budget|khoroch|dam|taka|dollar)\b/i.test(normalized)) {
    return {
      text: isBengaliOrBanglish
        ? "Rashed-এর প্রাইসিং সম্পূর্ণ প্রজেক্ট-ভিত্তিক ও কাস্টমাইজড—কাজের পরিধি (scope), ডেলিভারির ধরন এবং সময়সীমার ওপর নির্ভর করে। সঠিক কোটেশনের জন্য নিচের বাটনে সংক্ষেপে আপনার প্রজেক্ট ব্রিফ জমা দিন অথবা WhatsApp-এ মেসেজ দিন:"
        : "Rashed provides tailored, project-based pricing based on deliverables, scope, and timeline rather than a fixed hourly rate. For a custom estimate, feel free to submit a quick brief using the button below or reach out on WhatsApp:",
      matchedSource: "portfolio_fact",
      confidence: 0.9,
    };
  }

  // 3b. Software / Tools inquiry
  if (/\b(software|tool|tools|photoshop|illustrator|after\s*effects|figma|canva)\b/i.test(normalized)) {
    const tools = data.skills?.creativeTools
      ? Array.isArray(data.skills.creativeTools)
        ? data.skills.creativeTools.map((t: any) => cleanText(t.name || t)).join(", ")
        : cleanText(data.skills.creativeTools)
      : "Adobe Photoshop, Illustrator, After Effects, InDesign, Figma, Premiere Pro";
    return {
      text: isBengaliOrBanglish
        ? `Rashed মূলত ${tools} এবং আধুনিক AI-assisted ভিজ্যুয়াল টুলস ব্যবহার করেন।`
        : `Rashed primarily works with ${tools}, along with advanced AI-assisted visual workflows.`,
      matchedSource: "portfolio_fact",
      confidence: 0.9,
    };
  }

  // 3c. Experience / Bio inquiry
  if (/\b(experience|years|about|who\s*is|oviggota|koto\s*bochor|biodata|profile)\b/i.test(normalized)) {
    const exp = data.experienceYears || "6+";
    const bio = data.aboutSummary || data.heroBio || "Senior Visualizer specializing in brand identity, packaging, and commercial motion graphics.";
    return {
      text: isBengaliOrBanglish
        ? `Rashed Pervej একজন Senior Visualizer যার ${exp} বছরের বেশি প্রফেশনাল অভিজ্ঞতা রয়েছে। ${bio}`
        : `Rashed Pervej is a Senior Visualizer with ${exp} years of industry experience. ${bio}`,
      matchedSource: "portfolio_fact",
      confidence: 0.9,
    };
  }

  // 3d. Packaging / Services inquiry
  if (/\b(packaging|supplement|bottle|box|label|dieline|brand\s*identity|logo|motion)\b/i.test(normalized)) {
    return {
      text: isBengaliOrBanglish
        ? "হ্যাঁ, Rashed প্রিমিয়াম প্যাকেজিং ডিজাইন (যেমন Supplement, Bottle, Box, Dieline), Brand Identity এবং Motion Graphics নিয়ে কাজ করেন। আপনার প্রজেক্টের রিকোয়ারমেন্ট অনুযায়ী নিচের বাটনে সরাসরি প্রজেক্ট ব্রিফ ড্রপ করতে পারেন অথবা WhatsApp-এ কথা বলতে পারেন:"
        : "Yes, Rashed specializes in premium Packaging Design (supplements, retail boxes, millimeter-accurate dielines), Brand Identity, and Motion Graphics. You can submit your project requirements via the brief button below or connect on WhatsApp:",
      matchedSource: "portfolio_fact",
      confidence: 0.85,
    };
  }

  // 3e. Contact / WhatsApp / Email inquiry
  if (/\b(contact|email|whatsapp|phone|number|jogajog|reach|hire|kothay)\b/i.test(normalized)) {
    return {
      text: isBengaliOrBanglish
        ? "Rashed-এর সাথে সরাসরি যোগাযোগ করতে নিচের WhatsApp বা Email বাটন ব্যবহার করতে পারেন, অথবা সরাসরি প্রজেক্ট ব্রিফ ড্রপ করতে পারেন:"
        : "To get in touch directly with Rashed, feel free to use the WhatsApp or Email buttons below, or submit a quick project brief:",
      matchedSource: "portfolio_fact",
      confidence: 0.9,
    };
  }

  // 3f. Explicit Portfolio / Work link inquiry (only when user actively asks for links, never when prohibited)
  const isNoLinkAsked = /\b(dio\s*na|chara|lagbe\s*na|no\s*link|don't\s*send)\b/i.test(normalized);
  if (!isNoLinkAsked && /\b(link\s*dao|behance\s*link|portfolio\s*link|dekhan|samples)\b/i.test(normalized)) {
    return {
      text: isBengaliOrBanglish
        ? "নিচের লিংকে ঢুকে আপনি Rashed-এর আপডেটেড Behance প্রজেক্টস ও ডিজাইন কাজ দেখতে পাবেন। কোনো নির্দিষ্ট প্রজেক্ট নিয়ে আলোচনা করতে চাইলে জানাতে পারেন:"
        : "You can explore Rashed's updated portfolio and showcase projects using the Behance link below. Let me know if you would like to discuss a specific design:",
      matchedSource: "portfolio_fact",
      confidence: 0.85,
    };
  }

  // 4. Safe, Graceful Fallback (Never technical error, completely natural and supportive)
  return {
    text: isBengaliOrBanglish
      ? "Rashed-এর ব্র্যান্ড আইডেন্টিটি, প্যাকেজিং ডিজাইন বা মোশন গ্রাফিক্স সংক্রান্ত যেকোনো কাজ নিয়ে আলোচনা করতে চাইলে সরাসরি জানাতে পারেন। এছাড়া নিচের বাটনে প্রজেক্ট ব্রিফ ড্রপ করতে বা WhatsApp-এ মেসেজ দিতে পারেন:"
      : "Rashed is available to collaborate on Brand Identity, Product Packaging, and Motion Graphics projects. Feel free to let me know more details about what you're planning, or reach out directly using the buttons below:",
    matchedSource: "general_safe",
    confidence: 0.5,
  };
}
