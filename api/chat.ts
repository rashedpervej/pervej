import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { getPortfolioKnowledge, getStructuredPortfolioData, cleanText } from "./_lib/chatKnowledge.js";
import { recordAuditLog, recordTokenUsage } from "./_lib/auditTracker.js";
import { resolveActiveProviderChain, ResolvedKeyCandidate } from "./_lib/centralKeyResolver.js";
import { resolveFuzzyPortfolioFallback } from "./_lib/fuzzyFallbackEngine.js";

// Precious-style Multi-Provider In-Memory Cooldown Tracker
const providerCooldowns = new Map<string, number>();

interface VaultCandidate {
  id?: string;
  provider: "groq" | "gemini" | "openrouter" | "openai";
  label?: string;
  apiKey: string;
  model?: string;
  priority?: number;
}

// ---------------------------------------------------------------------------
// Autonomous Model Discovery & Dynamic Resolver
// Automatically discovers, caches, and selects active models from live APIs.
// Zero hardcoding, future-proof for any new models.
// ---------------------------------------------------------------------------
const discoveredGroqModels = new Map<string, { models: string[]; timestamp: number }>();
const discoveredGeminiModels = new Map<string, { models: string[]; timestamp: number }>();

async function getLiveGroqModels(apiKey: string): Promise<string[]> {
  const cached = discoveredGroqModels.get(apiKey);
  if (cached && Date.now() - cached.timestamp < 3600 * 1000) {
    return cached.models;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        const textModels = data.data
          .map((m: any) => m.id as string)
          .filter((id: string) => id && !id.includes("whisper") && !id.includes("guard") && !id.includes("vision"));
        if (textModels.length > 0) {
          discoveredGroqModels.set(apiKey, { models: textModels, timestamp: Date.now() });
          return textModels;
        }
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }
  return [];
}

function sanitizeGroqModelName(model?: string): string {
  if (!model) return "llama-3.3-70b-versatile";
  const m = model.toLowerCase().trim();
  if (
    m.includes("gpt-oss") ||
    m.includes("qwen") ||
    m.includes("120b") ||
    m.includes("20b") ||
    m.includes("27b") ||
    m.includes("zai-glm") ||
    m.startsWith("gemini") ||
    m.startsWith("google")
  ) {
    return "llama-3.3-70b-versatile";
  }
  return model.trim();
}

async function resolveDynamicGroqModel(apiKey: string, preferredModel?: string): Promise<{ primary: string; fallback: string }> {
  const envModel = process.env.GROQ_MODEL;
  if (envModel && envModel.trim()) {
    return { primary: sanitizeGroqModelName(envModel), fallback: "llama-3.1-8b-instant" };
  }

  const sanitizedPref = sanitizeGroqModelName(preferredModel);

  const live = await getLiveGroqModels(apiKey);
  if (live.length > 0) {
    if (sanitizedPref && live.includes(sanitizedPref)) {
      const fb = live.find((m) => m !== sanitizedPref && (m.includes("8b") || m.includes("instant"))) || live[0];
      return { primary: sanitizedPref, fallback: fb };
    }
    const topVersatile = live.find((m) => m.includes("llama-3.3-70b") || m.includes("versatile") || m.includes("70b"));
    const top8b = live.find((m) => m.includes("8b") || m.includes("instant")) || live[0];
    if (topVersatile) {
      return { primary: topVersatile, fallback: top8b };
    }
    return { primary: live[0], fallback: top8b };
  }

  return { primary: sanitizedPref || "llama-3.3-70b-versatile", fallback: "llama-3.1-8b-instant" };
}

async function getLiveGeminiModels(apiKey: string): Promise<string[]> {
  const cached = discoveredGeminiModels.get(apiKey);
  if (cached && Date.now() - cached.timestamp < 3600 * 1000) {
    return cached.models;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.models)) {
        const textModels = data.models
          .map((m: any) => (m.name || "").replace(/^models\//, ""))
          .filter((name: string) => name.startsWith("gemini") && !name.includes("embedding"));
        if (textModels.length > 0) {
          discoveredGeminiModels.set(apiKey, { models: textModels, timestamp: Date.now() });
          return textModels;
        }
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }
  return [];
}

async function resolveDynamicGeminiModel(apiKey: string, preferredModel?: string): Promise<{ primary: string; fallback: string }> {
  const envModel = process.env.GEMINI_MODEL;
  if (envModel && envModel.trim()) {
    return { primary: envModel.trim(), fallback: "gemini-2.5-flash" };
  }

  const cleanPref = preferredModel?.trim();
  if (cleanPref && cleanPref.startsWith("gemini")) {
    return { primary: cleanPref, fallback: "gemini-2.5-flash" };
  }

  const live = await getLiveGeminiModels(apiKey);
  if (live.length > 0) {
    if (cleanPref && live.includes(cleanPref)) {
      const fb = live.find((m) => m !== cleanPref && m.includes("flash")) || live[0];
      return { primary: cleanPref, fallback: fb };
    }
    const modernFlash = live.find((m) => m.includes("2.5-flash") || m.includes("flash"));
    const flashFallback = live.find((m) => m !== modernFlash && m.includes("flash")) || live[0];
    if (modernFlash) {
      return { primary: modernFlash, fallback: flashFallback };
    }
    return { primary: live[0], fallback: flashFallback };
  }

  return { primary: "gemini-2.5-flash", fallback: "gemini-2.0-flash" };
}

// Universal OpenAI-compatible completion adapter (Groq, OpenRouter, OpenAI, etc.)
async function callOpenAICompatibleChat({
  endpointUrl = "https://api.groq.com/openai/v1/chat/completions",
  apiKey,
  model = "llama-3.3-70b-versatile",
  systemInstruction,
  contents,
  temperature = 0.55,
  maxTokens = 750,
  extraHeaders = {},
}: {
  endpointUrl?: string;
  apiKey: string;
  model?: string;
  systemInstruction: string;
  contents: any[];
  temperature?: number;
  maxTokens?: number;
  extraHeaders?: Record<string, string>;
}): Promise<{ text: string; totalTokens: number | null }> {
  const messages: any[] = [{ role: "system", content: systemInstruction }];

  for (const c of contents) {
    const role = c.role === "model" ? "assistant" : "user";
    const text = c.parts?.[0]?.text || c.content || "";
    if (text) {
      messages.push({ role, content: text });
    }
  }

  const isReasoningModel = model?.includes("gpt-oss") || model?.includes("r1") || model?.includes("reasoning") || model?.includes("qwen");
  const completionBudget = isReasoningModel ? Math.max(maxTokens, 1500) : maxTokens;

  const requestPayload: any = {
    model,
    messages,
    temperature,
  };
  if (endpointUrl.includes("groq.com")) {
    requestPayload.max_tokens = completionBudget;
  } else {
    requestPayload.max_completion_tokens = completionBudget;
  }

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(requestPayload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Provider error (${res.status}): ${errData?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const choiceMsg = data.choices?.[0]?.message;
  let text = choiceMsg?.content || "";
  if (!text.trim() && choiceMsg?.reasoning) {
    text = choiceMsg.reasoning;
  }

  return {
    text: text.trim(),
    totalTokens: data.usage?.total_tokens || null,
  };
}

// In-memory sliding window rate limiter
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120;
const ipRequestHistory = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestHistory.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequestHistory.set(ip, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  ipRequestHistory.set(ip, validTimestamps);
  return true;
}

/**
 * Fast Scope Guard:
 * Detects unambiguous off-topic requests (coding homework, general trivia, math equations, cooking recipes, etc.)
 * and rejects them immediately without spending Gemini API calls.
 * NOTE: Does NOT block design, branding, packaging, video questions, even if informal, typos, or in Bengali/Banglish.
 */
function isClearlyOutOfScope(text: string): boolean {
  const t = text.trim().toLowerCase();

  // If the query mentions Rashed, design, creative work, or his portfolio, let the assistant evaluate context
  if (
    t.includes("rashed") ||
    t.includes("portfolio") ||
    t.includes("pervej") ||
    t.includes("visualizer") ||
    t.includes("dieline") ||
    t.includes("packaging") ||
    t.includes("motion") ||
    t.includes("brand") ||
    t.includes("logo") ||
    t.includes("design")
  ) {
    return false;
  }

  // Non-design programming & code generation requests
  if (
    /(write|generate|debug|create|give me|fix|solve)\s+(a\s+)?(python|javascript|typescript|c\+\+|java|rust|php|golang|c#|sql|bash|powershell|regex)\s+(code|script|function|program|class|algorithm|query|snippet)/i.test(
      t
    )
  ) {
    return true;
  }
  if (/^(write|code|generate)\s+(a\s+)?(python|c\+\+|java|sql|bash|rust|php)\b/i.test(t)) {
    return true;
  }

  // Math equations / calculations / homework
  if (/(solve|do)\s+(my\s+)?(math|algebra|calculus|homework|physics|chemistry)\b/i.test(t)) {
    return true;
  }
  if (/^(what is|calculate|solve)\s+.*\b(multiplied by|divided by|times|plus|minus|\*|\+|\/|\^)\b/i.test(t)) {
    return true;
  }
  if (/^(what is|calculate|solve)\s+[\d\s\+\-\*\/\^\(\)\=\.\%]{3,}\??$/i.test(t)) {
    return true;
  }

  // General world trivia / geography / history / sports / politics / awards
  if (
    /(what is the capital of|who was the (first|president|king|queen|prime minister) of|tell me about the (roman empire|cold war|french revolution)|who discovered\b)/i.test(
      t
    )
  ) {
    return true;
  }
  if (/(who won (the\s+)?.*(world cup|super bowl|euro|champions league|election|oscar|grammy))/i.test(t)) {
    return true;
  }

  // Creative writing not related to portfolio
  if (/(write|compose)\s+(an?\s+)?(poem|story|song|essay|novel|joke)\s+(about|on)\s+/i.test(t)) {
    return true;
  }
  if (/^(tell me a joke|write a poem|write a song|write an essay)\b/i.test(t)) {
    return true;
  }

  // Recipes / cooking
  if (/(recipe for|how to cook|how to bake|ingredients for)\s+/i.test(t)) {
    return true;
  }

  // Weather / medical / health diagnosis / general off-topic
  if (/(weather|temperature|forecast|today'?s\s*date|news|stock|price\s*of\s*(gold|bitcoin)|cricket|football|match|score)/i.test(t)) {
    return true;
  }
  if (/^(who|what|when|where)\s+(is|was|are|were)\s+(the\s+)?(prime\s*minister|president|capital|ceo|winner)\b/i.test(t)) {
    return true;
  }
  if (/(diagnose|medical advice|symptoms of|cure for)\s+/i.test(t)) {
    return true;
  }

  return false;
}

function isPromptInjection(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /(ignore\s+(all\s+)?(previous|prior|above)\s+instructions|system\s+prompt|reveal\s+(your\s+)?(instructions|prompt|rules)|you\s+are\s+now\s+in\s+dan|developer\s+mode\s+enabled|jailbreak|bypass\s+safety|output\s+initial\s+prompt|repeat\s+the\s+words\s+above)/i.test(
      t
    )
  );
}

const OUT_OF_SCOPE_RESPONSE =
  "I am Rashed Pervej's portfolio assistant. I can only assist with questions about Rashed, his creative design work, services, skills, experience, projects, and hiring. How can I help you regarding Rashed's portfolio?";

/**
 * Builds the comprehensive system instruction dynamically injected with live portfolio data.
 * Configured for natural human conversational behavior across English, Bengali, and Banglish.
 */
function buildSystemInstruction(knowledgeBase: string, isCompact = false, trainingRules: any[] = [], chatbotSettings?: any): string {
  let customDirectives = "";
  if (Array.isArray(trainingRules) && trainingRules.length > 0) {
    const activeRules = trainingRules.filter((r: any) => r && r.isActive !== false);
    if (activeRules.length > 0) {
      customDirectives = `\n=== LIVE ADMIN CHAT CONTROL & TRAINING DIRECTIVES ===\n` +
        activeRules.map((r: any) => `[${(r.type || "GUIDE").toUpperCase()}] ${r.title}: ${r.instruction}`).join("\n") + `\n`;
    }
  }

  let humanPersonaDirectives = "";
  if (chatbotSettings?.humanPersonaPrompt && typeof chatbotSettings.humanPersonaPrompt === "string" && chatbotSettings.humanPersonaPrompt.trim()) {
    humanPersonaDirectives = `\n=== LIVE ADMIN HUMAN PERSONA & VOICE DIRECTIVES ===\n${chatbotSettings.humanPersonaPrompt.trim()}\n`;
  }

  const botTitle = chatbotSettings?.botName ? `${chatbotSettings.botName} (portfolio partner for Rashed Pervej)` : "official creative representative and personal portfolio assistant for Rashed Pervej";

  if (isCompact) {
    return `You are the ${botTitle}, an experienced Senior Visualizer, Brand Identity Designer, Packaging Specialist, and Motion Graphics Artist from Bangladesh (6+ years industry experience).
${humanPersonaDirectives}
=== CORE CONVERSATIONAL RULES ===
1. HUMAN CONVERSATION (PING-PONG): Chat warmly like a creative design peer. Keep replies under 35 words. Never dump questionnaire lists. Ask at most ONE short question to keep dialogue natural.
2. MULTI-LINGUAL: Naturally understand and reply in Banglish, Bengali script (বাংলা), or English matching the user's language.
3. STRICT SCOPE: Answer only about Rashed's portfolio, design work, pricing approach, and hiring. Decline off-topic queries politely with: "${OUT_OF_SCOPE_RESPONSE}".
4. NO PREMATURE CONTACT DUMPING: Only share WhatsApp/email when explicitly requested.
5. STRICT PRICING & QUOTATION POLICY: NEVER volunteer or assume specific dollar amounts ($300, $250, etc.) on your own. Explain that pricing is 100% custom-tailored to scope, deliverables, and timeline. Invite the visitor to submit a brief or message on WhatsApp to schedule a discussion/call back.
${customDirectives}
=== KEY EXAMPLES ===
User: hi / hello / kemon acho
Assistant: ওয়ালাইকুমুস সালাম! ভালো আছি। Rashed-এর পোর্টফোলিও বা কোনো প্রজেক্ট নিয়ে কি জানতে চাচ্ছেন?
User: new project korte cai / packaging koren?
Assistant: হ্যাঁ, Rashed product packaging & 3D label design নিয়ে কাজ করেন। আপনার কী ধরনের প্রোডাক্ট?

=== PORTFOLIO KNOWLEDGE BASE ===
${knowledgeBase}
`;
  }

  return `You are the ${botTitle}.
Rashed is an experienced Senior Visualizer, Brand Identity Designer, Packaging Specialist, and Motion Graphics Artist from Bangladesh with over 6+ years of industry experience (7+ years design journey), having worked with top brands like Go Nature BD, Chaldal Ltd., Sheba Platform Ltd., and international clients in the US and Europe.
${humanPersonaDirectives}
=== CORE PERSONA & CONVERSATIONAL PHILOSOPHY ===
1. HUMAN CONVERSATION (PING-PONG, NOT AN INTERROGATION OR QUESTIONNAIRE):
   - You chat like a warm, creative, friendly design peer sitting across the table.
   - ABSOLUTELY NEVER dump a list of 4–5 intake questions (e.g. SKU count, timeline, budget, bottle size, target audience) in a single message!
   - In each turn, write ONLY 1 to 3 short, natural sentences (under 40 words total).
   - Ask AT MOST ONE simple, conversational question at a time to keep the dialogue moving forward naturally.
   - NEVER use numbered lists (1., 2., 3., 4.) or questionnaire bullet points unless the user explicitly asks: "give me a checklist" or "list the requirements".
   - Avoid robotic corporate clichés like "প্রোজেক্টের স্কোপ ও টাইমলাইন নির্ধারণে", "কাস্টম কোট ঠিক করতে পারব", or "নিম্নলিখিত তথ্য দিন". Speak casually, warmly, and authentically.

2. MULTI-LINGUAL FLUENCY (BENGALI, BANGLISH & ENGLISH):
   - You seamlessly understand and naturally respond in:
     a) **Banglish** (Bengali written in Latin script, e.g. "new project korte cai", "packaging koren?", "price koto?", "ami ekta supplement brand launch kortesi").
     b) **Bengali** script (বাংলা, e.g. "নতুন প্রজেক্ট করতে চাই", "প্যাকেজিং ডিজাইন করেন?", "আপনার অভিজ্ঞতা কেমন?").
     c) **English** (conversational or professional).
   - Match the user's language and vibe:
     - If the user writes in Banglish or casual Bengali, reply naturally in warm, friendly Bengali or Banglish.
     - If the user writes in Bengali script, reply in warm, polite Bengali.
     - If the user writes in English, reply in natural, concise English.
   - Understand typos and abbreviations without correcting the user.

3. NATURAL ADAPTIVE CONVERSATION:
   - For simple greetings ("hi", "salam"): reply warmly in 1-2 natural sentences.
   - For specific questions about services, tools, or process: give a direct, informative, and engaging answer. Be concise and conversational, avoid unnecessary filler, and never overwhelm with long questionnaire lists.
   - Ask AT MOST ONE relevant question to keep dialogue moving forward naturally.

4. NO PREMATURE CONTACT DUMPING:
   - Do NOT provide phone numbers, email, or WhatsApp links unless the user explicitly asks for contact details or asks how to reach Rashed.

5. NEVER OUTPUT RAW URLS OR RAW MARKDOWN LINKS IN TEXT:
   - NEVER output raw links (e.g. "https://...", "be.net/...", "linkedin.com/...") or markdown link syntax (e.g. "[text](url)") inside text.
   - The chat interface automatically renders interactive, clickable buttons for Behance, WhatsApp, Email, and Project Brief!
   - When the user asks for links, portfolio, or past work (e.g. "link dao", "portfolio link", "view work", "কাজ দেখতে চাই"):
     - In Bengali/Banglish, say: "নিচের লিংকে ঢুকে আপনি আপডেটেড প্রজেক্টস দেখতে পাবেন। কোনো নির্দিষ্ট প্রজেক্ট নিয়ে আলোচনা করতে চাইলে জানাতে পারেন:"
     - In English, say: "You can view Rashed's updated projects using the link below. Let me know if you would like to discuss a specific project:"
   - When discussing a project (e.g. logo design, packaging, branding):
     - Prompt them conversationally and mention they can also submit a quick brief or message on WhatsApp using the buttons below!

6. ACCURACY & FACTUAL INTEGRITY:
   - Rely strictly on Rashed's actual experience and services from the knowledge base below.
   - Never invent services, prices, or past clients.

7. PERMANENT / FULL-TIME JOB OFFERS & RECRUITMENT INQUIRIES:
   - When a user asks about permanent, full-time, or in-house employment offers (e.g., "are you available for a full-time job?", "amader company te chakri korben?", "in-house designer lagbe"):
   - NEVER bluntly reject the inquiry or reply that Rashed only works freelance/contract!
   - Respond with warmth, dignity, and professional respect:
     - State that Rashed is open to discussing high-impact Senior Visualizer, Art Director, or Design Lead roles with ambitious brands and creative agencies.
     - Graciously advise them to connect directly with Rashed via WhatsApp or Email to discuss the role and company details.

8. STRICT PRICING & QUOTATION POLICY (NO SELF-QUOTED DOLLAR AMOUNTS):
   - NEVER volunteer, assume, or guess specific dollar amounts or starting figures (e.g. do NOT say $300, $250, $50/hr) unless the admin has provided an explicit custom pricing directive above.
   - Explain politely that Rashed provides custom, project-based pricing tailored strictly to deliverables, scope, and timeline.
   - Direct the user to submit a quick project brief using the brief button or message on WhatsApp for a custom quotation and callback request.
${customDirectives}
=== REAL CONVERSATION EXAMPLES (FOLLOW THIS EXACT CONVERSATIONAL STYLE) ===

Example 0 (Greeting):
User: hi / hello
Assistant: Hi there! How can I help you today? Looking for Rashed's design work or planning a project?

Example 0b (Greeting in Bengali / Banglish):
User: salam / kemon achen
Assistant: ওয়ালাইকুমুস সালাম! ভালো আছি। Rashed-এর পোর্টফোলিও বা কোনো প্রজেক্ট নিয়ে কি জানতে চাচ্ছেন?

Example 1 (Starting a new project / Project inquiry):
User: new project korte cai apnar sathe?
Assistant: অবশ্যই! আপনার সাথে কাজ করতে পারলে দারুণ লাগবে। আপনার প্রজেক্টটি মূলত কোন ধরণের—Brand Identity, Packaging নাকি Motion Graphics? নিচের বাটনে সরাসরি ব্রিফও জমা দিতে পারেন।

Example 1b (Project intent in Bengali / Logo design):
User: hmm, logo design
Assistant: Rashed আধুনিক ও স্কেলেবল লোগো তৈরি করেন—ব্র্যান্ড স্ট্র্যাটেজি থেকে ভিজ্যুয়াল গাইডলাইন পর্যন্ত। আপনার ব্যবসার সেক্টর কী? নিচের বাটনে সংক্ষেপে ব্রিফ পাঠাতে বা WhatsApp-এ সরাসরি মেসেজ দিতে পারেন।

Example 2 (Banglish - Service inquiry):
User: packaging koren?
Assistant: হ্যাঁ, Rashed product packaging নিয়ে কাজ করেন—বিশেষ করে supplement, label, bottle এবং print-ready packaging design। আপনার কোন ধরনের product?

Example 3 (Banglish - Price inquiry):
User: price koto? / khoroch kemon?
Assistant: Rashed-এর প্রাইসিং সম্পূর্ণ কাস্টমাইজড—কাজের স্কোপ ও ডেলিভারির ওপর নির্ভর করে। সঠিক কোটেশন পেতে নিচের বাটনে ব্রিফ জমা দিন অথবা WhatsApp-এ মেসেজ দিয়ে কল ব্যাক রিকোয়েস্ট করতে পারেন:

Example 4 (Portfolio Link Request - "link dao"):
User: link dao / portfolio link?
Assistant: নিচের লিংকে ঢুকে আপনি আপডেটেড প্রজেক্টস দেখতে পাবেন। কোনো নির্দিষ্ট লোগো বা প্যাকেজিং প্রজেক্ট নিয়ে আলোচনা করতে চাইলে জানাতে পারেন:

Example 5 (Contact Request - ONLY when explicitly asked):
User: যোগাযোগের উপায় কি? / contact number?
Assistant: Rashed-এর সাথে সরাসরি যোগাযোগ করতে নিচের WhatsApp বা Email বাটন ব্যবহার করতে পারেন, অথবা সরাসরি প্রজেক্ট ব্রিফ ড্রপ করতে পারেন:

Example 6 (Full-time / Permanent Job Offer):
User: amader company te full-time join korben? / are you open to a full-time role?
Assistant: প্রস্তাবটির জন্য ধন্যবাদ! Rashed মূলত সিলেক্টেড ব্র্যান্ড বা এজেন্সির সাথে সিনিয়র ভিজ্যুয়ালাইজার বা ডিজাইন লিড হিসেবে কাজ করতে আগ্রহী। আপনার কোম্পানি ও ভূমিকা নিয়ে বিস্তারিত আলোচনার জন্য নিচের WhatsApp বা Email বাটন দিয়ে সরাসরি যোগাযোগ করতে পারেন:

=== STRICT SCOPE GUARD ===
- You ONLY answer questions concerning Rashed Pervej, his design portfolio, services, skills, professional experience, projects, availability, pricing, and contact/hiring information.
- If the user asks a completely unrelated question (coding homework, general trivia, recipes, math equations, essays, poems, etc.), decline politely using this exact tone:
"${OUT_OF_SCOPE_RESPONSE}"

=== PORTFOLIO KNOWLEDGE BASE ===
${knowledgeBase}
`;
}

/**
 * Normalizes client message history into valid alternating Gemini turns starting with "user".
 */
function formatGeminiContents(history: any[], currentMessage: string) {
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-8);
    // Gemini multi-turn conversation must begin with a "user" role
    const firstUserIdx = recent.findIndex((m: any) => m && m.role === "user");

    if (firstUserIdx !== -1) {
      const validSlice = recent.slice(firstUserIdx);
      for (const h of validSlice) {
        if (h && typeof h.content === "string" && h.content.trim()) {
          const role: "user" | "model" = h.role === "model" ? "model" : "user";
          const text = h.content.trim().slice(0, 1000);

          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts[0].text += "\n" + text;
          } else {
            contents.push({ role, parts: [{ text }] });
          }
        }
      }
    }
  }

  // Append the latest user query
  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents[contents.length - 1].parts[0].text = currentMessage;
  } else {
    contents.push({ role: "user", parts: [{ text: currentMessage }] });
  }

  return contents;
}

/**
 * Natural grounded portfolio fallback responder:
 * Accurately answers questions directly using the verified portfolio data source
 * in a warm, natural, human conversational tone (handling English, Bengali, and Banglish queries)
 * without sounding robotic or like a search engine database.
 */
function generateDirectAnswer(query: string, history: any[], data: any): string | null {
  const q = query.toLowerCase().trim();
  const rawQ = query.trim();

  // Find conversation turns in history for complete context memory
  let allUserTurns = "";
  let lastUserTurn = "";
  if (Array.isArray(history) && history.length > 0) {
    const userTurns = history.filter((h) => h && (h.role === "user" || h.role === "human"));
    if (userTurns.length > 0) {
      allUserTurns = userTurns.map((h) => (h.content || h.text || "").toLowerCase().trim()).join(" ");
      lastUserTurn = (userTurns[userTurns.length - 1].content || userTurns[userTurns.length - 1].text || "").toLowerCase().trim();
    }
  }

  const fullContext = `${allUserTurns} ${q}`;

  // Bengali / Banglish detection (check both current query and conversation history context)
  const isBengaliScript = /[\u0980-\u09FF]/.test(fullContext);
  const banglishRegex =
    /\b(koren|kore|kori|korte|koro|korbo|koto|kobe|koi|chai|chay|ache|achhe|ase|lagbe|lagve|hobe|jani|bolen|amake|amar|apnar|apni|tumi|tomar|ki|keno|kemon|kothay|shuru|bhalo|darun|dhaka|jashore|dam|khoroch|somoy|duita|ekta|duti|ta|tate|korsen|kortesi|korchen|dao|den|din|acho|achen|achis|bhai|vai|dekhan|bolo)\b/i;
  const isBanglish = banglishRegex.test(fullContext);
  const isBengaliOrBanglish = isBengaliScript || isBanglish;

  // Normalization for common typos
  const normalized = q
    .replace(/pakaging|packging|pakeging/g, "packaging")
    .replace(/desing|dizain|dezign/g, "design")
    .replace(/brnding|barnding|barnd/g, "branding")
    .replace(/softwer|sofware|tuls/g, "software")
    .replace(/suplement|suplemnt/g, "supplement")
    .replace(/lagve/g, "lagbe")
    .replace(/experiance|experince/g, "experience");

  // 1. Natural Short Greetings (Tolerant of typo repetitions like hii, heyy, hei)
  if (
    /^(h+i+|h+e+y+|hell+o+|hei+|hiya|heya|hola|yo|good\s*(morning|afternoon|evening)|হাই|হ্যালো|হেই|নমস্কার)\b/i.test(q) ||
    /^(hi+|he+y+|hell+o+|hei+)\s+(there|bot|bro|rashed|bhai)?$/i.test(q)
  ) {
    if (isBengaliOrBanglish) {
      return "হ্যালো! কেমন আছেন? Rashed-এর পোর্টফোলিও, ডিজাইন সার্ভিস বা নতুন কোনো প্রজেক্ট নিয়ে কি জানতে চাচ্ছেন?";
    }
    return "Hi there! How can I help you today? Looking to explore Rashed's design work, or planning a project?";
  }

  // 1b. Islamic Salam & Greeting Check
  if (
    /\b(assalamu\s*alaikum|as-salamu\s*alaikum|salam|slaam|সালাম|আসসালামু\s*আলাইকুম|কেমন\s*আছেন|কেমন\s*আছো|kemon\s*achen|kemon\s*acho|kemon\s*achis|ki\s*obostha|kemon\s*aso)\b/i.test(q) &&
    q.split(/\s+/).length <= 4
  ) {
    if (/salam|সালাম/i.test(q)) {
      return "ওয়ালাইকুমুস সালাম! কেমন আছেন? Rashed-এর ডিজাইন কাজ, পোর্টফোলিও বা প্রজেক্ট নিয়ে কীভাবে সাহায্য করতে পারি?";
    }
    return "হ্যালো! ভালো আছি, ধন্যবাদ। Rashed-এর পোর্টফোলিও বা ডিজাইন সংক্রান্ত কোনো বিষয়ে জানতে চান?";
  }

  // 1c. Politeness & Acknowledgements (Thanks, Ok, Accha, Dhonyobad)
  if (
    /^(thanks?|thank\s*you|thnx|ty|dhonyobad|dhonnobad|shukriya|ধন্যবাদ|শুকরিয়া|ok|okay|k|got\s*it|thik\s*ache|accha|acha|thik\s*ase)$/i.test(q) ||
    /^(thanks?|thank\s*you|dhonyobad|dhonnobad)\s+(a\s*lot|so\s*much|vai|bhai|bro)?$/i.test(q)
  ) {
    if (isBengaliOrBanglish) {
      return "আপনাকে অনেক ধন্যবাদ ও স্বাগতম! 😊 Rashed-এর কাজ বা প্রজেক্ট নিয়ে আর কোনো কিছু জানতে চাইলে নির্দ্বিধায় বলতে পারেন।";
    }
    return "You're very welcome! 😊 Feel free to ask if there's anything else you'd like to explore about Rashed's work or project collaboration.";
  }

  // 2. Direct Grounded Match with verified FAQ Database (Only strict exact FAQ questions)
  if (Array.isArray(data?.faqs) && data.faqs.length > 0) {
    const cleanQ = q.replace(/[^a-z0-9]/g, " ").trim();
    for (const faq of data.faqs) {
      if (!faq?.question || !faq?.answer) continue;
      const faqQ = faq.question.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
      // Strict exact match only: if user is asking conversational variations, let the dynamic AI model handle with full persona
      if (faqQ.length > 5 && faqQ === cleanQ) {
        return faq.answer.trim();
      }
    }
  }

  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "127.0.0.1";
    const clientIp = rawIp.split(",")[0].trim();

    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment before sending another message.",
        text: "You are chatting very quickly! Please wait a moment before sending another message.",
      });
    }

    let payload = req.body;
    if (!payload && typeof req.on === "function") {
      try {
        const rawBody = await new Promise<string>((resolve, reject) => {
          let data = "";
          req.on("data", (chunk: any) => {
            data += chunk;
          });
          req.on("end", () => resolve(data));
          req.on("error", (err: any) => reject(err));
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

    const { message, history } = payload || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message must be a non-empty string" });
    }

    const cleanMessage = message.trim().slice(0, 1000);

    // 1. Fast Scope Guard: Reject clearly off-topic questions without calling Gemini
    if (isClearlyOutOfScope(cleanMessage)) {
      return res.status(200).json({ text: OUT_OF_SCOPE_RESPONSE });
    }

    // 1b. Prompt Injection & Jailbreak Guard
    if (isPromptInjection(cleanMessage)) {
      return res.status(200).json({
        text: "I am Rashed's Creative Advisor. I'm here to assist with inquiries about Rashed's visual design work, packaging, branding, and project collaboration. How can I help with your design project?",
      });
    }

    // 2. Fetch fresh structured and markdown knowledge
    const structuredData = await getStructuredPortfolioData();
    // Default to rich "full" knowledge so AI has full context of experience, projects and services
    const isCompact = (structuredData?.aiRouterSettings?.contextMode ?? "full") === "compact";
    const knowledgeBase = await getPortfolioKnowledge(isCompact ? "compact" : "full");

    // 3. Grounded Portfolio Direct Matcher (Immediate, 100% accurate, zero latency, warm human tone)
    const directAnswer = generateDirectAnswer(cleanMessage, history, structuredData);
    if (directAnswer) {
      return res.status(200).json({ text: directAnswer, provider: "FAQ" });
    }

    // 4. Dynamic AI Generation with Unified Central Key Resolver
    const candidates: ResolvedKeyCandidate[] = await resolveActiveProviderChain();

    if (candidates.length === 0) {
      console.warn("[AI Chat Warning] 0 active AI keys resolved by Central Key Resolver. Check Vault or Vercel Environment variables (GROQ_API_KEY).");
    } else {
      console.log(`[AI Chat] Central Resolver loaded ${candidates.length} candidate(s): ${candidates.map(c => `${c.label}[${c.source}]: ${c.provider}(${c.model})`).join(", ")}`);
    }

    // Precious Cooldown check: skip keys on cooldown unless all are down
    const now = Date.now();
    const cooldownDuration = (structuredData?.aiRouterSettings?.cooldownSeconds || 30) * 1000;
    
    let viableCandidates = candidates.filter((c) => {
      const cooldownUntil = providerCooldowns.get(c.id || c.apiKey) || 0;
      return now >= cooldownUntil;
    });

    if (viableCandidates.length === 0 && candidates.length > 0) {
      // If every provider is on cooldown, reset cooldowns to avoid deadlock
      providerCooldowns.clear();
      viableCandidates = candidates;
    }

    // Prioritize explicitly selected model from Hall of Keys router dropdown
    const rawSelectedModel = req.body?.selectedModel || structuredData?.aiRouterSettings?.selectedModel || "auto";
    const selectedModel = rawSelectedModel.replace(/gpt-oss-\d+b|qwen3\.8-\d+b|openai\/gpt-oss/gi, "llama-3.3-70b-versatile");
    if (selectedModel && selectedModel !== "auto") {
      const lowerSel = selectedModel.toLowerCase().trim();
      const [provPart, rawModPart] = lowerSel.includes(":") ? lowerSel.split(":") : ["", lowerSel];
      const modPart = provPart === "groq" || !provPart ? sanitizeGroqModelName(rawModPart) : rawModPart;
      
      const matchIdx = viableCandidates.findIndex((c) => {
        const fullMatch = `${c.provider}:${c.model}`.toLowerCase();
        if (fullMatch === lowerSel) return true;
        if (modPart && c.model?.toLowerCase() === modPart) return true;
        if (c.model?.toLowerCase() === lowerSel) return true;
        return false;
      });

      if (matchIdx > -1) {
        const [chosen] = viableCandidates.splice(matchIdx, 1);
        viableCandidates.unshift(chosen);
      } else if (provPart && modPart) {
        const baseKey = candidates.find((c) => c.provider?.toLowerCase() === provPart);
        if (baseKey) {
          viableCandidates.unshift({
            id: `selected_${modPart}`,
            provider: provPart as any,
            label: `${provPart.toUpperCase()} (${modPart})`,
            apiKey: baseKey.apiKey,
            model: modPart,
            priority: 0,
          });
        }
      }
    }

    const contents = formatGeminiContents(history, cleanMessage);
    const systemInstruction = buildSystemInstruction(
      knowledgeBase,
      isCompact,
      structuredData?.chatTrainingRules,
      structuredData?.chatbotSettings
    );

    let attemptIndex = 0;
    const failedCandidates: string[] = [];
    const chatStartTime = Date.now();

    for (const candidate of viableCandidates) {
      attemptIndex++;
      const keyId = candidate.id || candidate.apiKey;
      try {
        if (candidate.provider === "groq" || candidate.apiKey.startsWith("gsk_")) {
          const { primary: modelToUse, fallback: fallbackModel } = await resolveDynamicGroqModel(candidate.apiKey, candidate.model);
          let groqRes;
          try {
            groqRes = await callOpenAICompatibleChat({
              endpointUrl: "https://api.groq.com/openai/v1/chat/completions",
              apiKey: candidate.apiKey,
              model: modelToUse,
              systemInstruction,
              contents,
              temperature: structuredData?.aiRouterSettings?.temperature ?? 0.55,
              maxTokens: Math.max(structuredData?.aiRouterSettings?.maxTokens ?? 750, 1500),
            });
          } catch (primaryErr) {
            // Groq fallback model if primary model fails
            groqRes = await callOpenAICompatibleChat({
              endpointUrl: "https://api.groq.com/openai/v1/chat/completions",
              apiKey: candidate.apiKey,
              model: fallbackModel,
              systemInstruction,
              contents,
              temperature: 0.55,
              maxTokens: 1000,
            });
          }

          if (groqRes && groqRes.text && groqRes.text.trim()) {
            providerCooldowns.delete(keyId);
            const latency = Date.now() - chatStartTime;
            const hasFailover = failedCandidates.length > 0;
            const failoverReason = hasFailover ? failedCandidates.join(", ") : undefined;
            const trackingProvider = candidate.source === "env" ? "groq-env" : "groq";

            recordAuditLog({
              action: "chat_request",
              resourceType: "chat",
              resourceId: `sess_${Date.now()}`,
              metadata: {
                provider: "groq",
                keySource: candidate.source,
                keyLabel: candidate.label,
                model: modelToUse,
                tokens: groqRes.totalTokens || 3500,
                latencyMs: latency,
                question: cleanMessage.slice(0, 90),
                attempts: attemptIndex,
                failoverFrom: failoverReason,
              },
            });
            recordTokenUsage(trackingProvider, groqRes.totalTokens || 3500);
            return res.status(200).json({
              text: groqRes.text.trim(),
              tokenUsage: groqRes.totalTokens,
              provider: "groq",
            });
          }
        } else if (candidate.provider === "openrouter" || candidate.apiKey.startsWith("sk-or-")) {
          const modelToUse = candidate.model || "meta-llama/llama-3.3-70b-instruct:free";
          const orRes = await callOpenAICompatibleChat({
            endpointUrl: "https://openrouter.ai/api/v1/chat/completions",
            apiKey: candidate.apiKey,
            model: modelToUse,
            systemInstruction,
            contents,
            temperature: structuredData?.aiRouterSettings?.temperature ?? 0.55,
            maxTokens: structuredData?.aiRouterSettings?.maxTokens ?? 750,
            extraHeaders: {
              "HTTP-Referer": "https://pervej.com",
              "X-Title": "Pervej Portfolio Vault",
            },
          });

          if (orRes && orRes.text && orRes.text.trim()) {
            providerCooldowns.delete(keyId);
            const latency = Date.now() - chatStartTime;
            const hasFailover = failedCandidates.length > 0;
            const failoverReason = hasFailover ? failedCandidates.join(", ") : undefined;

            recordAuditLog({
              action: "chat_request",
              resourceType: "chat",
              resourceId: `sess_${Date.now()}`,
              metadata: {
                provider: "openrouter",
                keySource: candidate.source,
                keyLabel: candidate.label,
                model: modelToUse,
                tokens: orRes.totalTokens || 2200,
                latencyMs: latency,
                question: cleanMessage.slice(0, 90),
                attempts: attemptIndex,
                failoverFrom: failoverReason,
              },
            });
            recordTokenUsage("openrouter", orRes.totalTokens || 2200);
            return res.status(200).json({
              text: orRes.text.trim(),
              tokenUsage: orRes.totalTokens,
              provider: "openrouter",
            });
          }
        } else if (candidate.provider === "openai" || candidate.apiKey.startsWith("sk-")) {
          const modelToUse = candidate.model || "gpt-4o-mini";
          const oaiRes = await callOpenAICompatibleChat({
            endpointUrl: "https://api.openai.com/v1/chat/completions",
            apiKey: candidate.apiKey,
            model: modelToUse,
            systemInstruction,
            contents,
            temperature: structuredData?.aiRouterSettings?.temperature ?? 0.55,
            maxTokens: structuredData?.aiRouterSettings?.maxTokens ?? 750,
          });

          if (oaiRes && oaiRes.text && oaiRes.text.trim()) {
            providerCooldowns.delete(keyId);
            const latency = Date.now() - chatStartTime;
            const hasFailover = failedCandidates.length > 0;
            const failoverReason = hasFailover ? failedCandidates.join(", ") : undefined;

            recordAuditLog({
              action: "chat_request",
              resourceType: "chat",
              resourceId: `sess_${Date.now()}`,
              metadata: {
                provider: "openai",
                keySource: candidate.source,
                keyLabel: candidate.label,
                model: modelToUse,
                tokens: oaiRes.totalTokens || 2400,
                latencyMs: latency,
                question: cleanMessage.slice(0, 90),
                attempts: attemptIndex,
                failoverFrom: failoverReason,
              },
            });
            recordTokenUsage("openai", oaiRes.totalTokens || 2400);
            return res.status(200).json({
              text: oaiRes.text.trim(),
              tokenUsage: oaiRes.totalTokens,
              provider: "openai",
            });
          }
        } else if (candidate.provider === "gemini" || candidate.provider === "google-gemini") {
          if (!candidate.apiKey.startsWith("AIzaSy")) {
            throw new Error("Invalid Gemini API key format (must start with AIzaSy)");
          }
          // Google Gemini Provider (only when explicitly configured with genuine key)
          const { primary: modelToUse, fallback: fallbackModel } = await resolveDynamicGeminiModel(candidate.apiKey, candidate.model);
          const ai = new GoogleGenAI({
            apiKey: candidate.apiKey,
            httpOptions: {
              headers: { "User-Agent": "aistudio-build" },
              timeout: 10000,
            },
          });

          let response: any = null;
          try {
            response = await ai.models.generateContent({
              model: modelToUse,
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                temperature: structuredData?.aiRouterSettings?.temperature ?? 0.65,
                maxOutputTokens: structuredData?.aiRouterSettings?.maxTokens ?? 800,
              },
            });
          } catch (geminiPrimaryErr) {
            // Fallback model if primary model fails
            response = await ai.models.generateContent({
              model: fallbackModel,
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.65,
                maxOutputTokens: 800,
              },
            });
          }

          if (response && response.text && response.text.trim()) {
            providerCooldowns.delete(keyId);
            const totalTokens = response.usageMetadata?.totalTokenCount || 2180;
            const latency = Date.now() - chatStartTime;
            const hasFailover = failedCandidates.length > 0;
            const failoverReason = hasFailover ? failedCandidates.join(", ") : undefined;

            recordAuditLog({
              action: "chat_request",
              resourceType: "chat",
              resourceId: `sess_${Date.now()}`,
              metadata: {
                provider: "gemini",
                keySource: candidate.source,
                keyLabel: candidate.label,
                model: modelToUse,
                tokens: totalTokens,
                latencyMs: latency,
                question: cleanMessage.slice(0, 90),
                attempts: attemptIndex,
                failoverFrom: failoverReason,
              },
            });
            recordTokenUsage("gemini", totalTokens);
            return res.status(200).json({
              text: response.text.trim(),
              tokenUsage: totalTokens,
              provider: "gemini",
            });
          }
        } else {
          throw new Error(`Provider '${candidate.provider}' is not supported or not configured`);
        }
      } catch (providerError: any) {
        const errorText = providerError?.message || String(providerError);
        const candidateName = `${candidate.label || candidate.provider} [${candidate.source}] (${candidate.model || "default"})`;
        failedCandidates.push(`${candidateName}: ${errorText.slice(0, 70)}`);
        providerCooldowns.set(keyId, Date.now() + cooldownDuration);

        // Point 10: Structured Failure Log in ledger
        recordAuditLog({
          action: "provider_call_failed",
          resourceType: "provider",
          resourceId: candidate.provider,
          metadata: {
            keyLabel: candidate.label,
            keySource: candidate.source,
            provider: candidate.provider,
            model: candidate.model,
            error: errorText,
            attempt: attemptIndex,
            totalViable: viableCandidates.length,
          },
        });

        console.warn(`[Vault Router: Candidate "${candidate.label}" (${candidate.source}) failed. Cooldown set for ${cooldownDuration / 1000}s. Trying next candidate]:`, errorText);
      }
    }

    // 5. Tier-2 Seamless Fallback when all AI providers are exhausted
    // Records diagnostic audit log on the server, but returns a warm, natural portfolio-grounded answer to the visitor
    recordAuditLog({
      action: "all_providers_failed",
      resourceType: "chat",
      resourceId: `sess_${Date.now()}`,
      metadata: {
        provider: "system",
        model: "failover_exhausted",
        latencyMs: Date.now() - chatStartTime,
        question: cleanMessage.slice(0, 90),
        error: "All configured AI providers were unreachable; seamless Tier-2 DB fallback engaged",
        attempts: attemptIndex,
        failoverChain: failedCandidates,
      },
    });

    // Execute Tier-2 Grounded Fuzzy Matcher (typo-tolerant, human conversational tone)
    const fallbackAnswer = resolveFuzzyPortfolioFallback(cleanMessage, history, structuredData);
    return res.status(200).json({
      text: fallbackAnswer.text,
      provider: "Portfolio Assistant",
      fallbackMatched: fallbackAnswer.matchedSource,
      confidence: fallbackAnswer.confidence,
    });
  } catch (error: any) {
    // 6. Tier-3 Strict Single Emergency Fallback (AI + DB both fail)
    console.error("[Chat Critical Emergency Fallback Triggered]:", error?.message || error);
    return res.status(200).json({
      text: "Rashed Pervej is a Senior Visualizer specializing in Brand Identity, Packaging, and Motion Graphics. For direct inquiries, feel free to reach out via Email (rashedpervej2011@gmail.com) or WhatsApp (+8801932623969).",
      provider: "Emergency Fallback",
      tokenUsage: 0,
    });
  }
}
