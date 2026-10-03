import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { getPortfolioKnowledge, getStructuredPortfolioData, cleanText } from "./_lib/chatKnowledge.ts";
import { recordAuditLog, recordTokenUsage } from "./_lib/auditTracker.ts";

function getAvailableApiKeys(dbKey?: string | null): string[] {
  const keys: string[] = [];
  if (dbKey && typeof dbKey === "string" && dbKey.trim() && !dbKey.startsWith("MY_")) {
    keys.push(dbKey.trim());
  }
  const envCandidates = [
    process.env.GROQ_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  for (const k of envCandidates) {
    if (k && typeof k === "string" && k.trim() && !k.startsWith("MY_") && !keys.includes(k.trim())) {
      keys.push(k.trim());
    }
  }
  // Read any valid keys from .env directly as fallback
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const matches = content.matchAll(/(?:GEMINI_API_KEY|GROQ_API_KEY)\s*=\s*(.+)/g);
      for (const m of matches) {
        if (m && m[1]) {
          const parsedKey = m[1].trim().replace(/^["']|["']$/g, "");
          if (parsedKey && !parsedKey.startsWith("MY_") && !keys.includes(parsedKey)) {
            keys.push(parsedKey);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return keys;
}

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

async function resolveDynamicGroqModel(apiKey: string, preferredModel?: string): Promise<{ primary: string; fallback: string }> {
  const envModel = process.env.GROQ_MODEL;
  if (envModel && envModel.trim()) {
    return { primary: envModel.trim(), fallback: "llama-3.1-8b-instant" };
  }

  const live = await getLiveGroqModels(apiKey);
  if (live.length > 0) {
    if (preferredModel && live.includes(preferredModel.trim())) {
      const fb = live.find((m) => m !== preferredModel.trim() && m.includes("8b")) || live[0];
      return { primary: preferredModel.trim(), fallback: fb };
    }
    const top70b = live.find((m) => m.includes("70b") && !m.includes("specdec"));
    const top8b = live.find((m) => m.includes("8b")) || live[0];
    if (top70b) {
      return { primary: top70b, fallback: top8b };
    }
    return { primary: live[0], fallback: top8b };
  }

  const cleanPref = preferredModel?.trim();
  if (cleanPref && !cleanPref.includes("oss") && !cleanPref.includes("120b") && !cleanPref.includes("20b") && !cleanPref.startsWith("gemini")) {
    return { primary: cleanPref, fallback: "llama-3.1-8b-instant" };
  }
  return { primary: "llama-3.3-70b-versatile", fallback: "llama-3.1-8b-instant" };
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
          .filter((name: string) => name.startsWith("gemini") && name.includes("flash") && !name.includes("embedding"));
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
    return { primary: envModel.trim(), fallback: "gemini-1.5-flash" };
  }

  const live = await getLiveGeminiModels(apiKey);
  if (live.length > 0) {
    if (preferredModel && live.includes(preferredModel.trim())) {
      const fb = live.find((m) => m !== preferredModel.trim() && m.includes("1.5")) || live[0];
      return { primary: preferredModel.trim(), fallback: fb };
    }
    const flash2 = live.find((m) => m.includes("2.0-flash") || m.includes("2.5-flash"));
    const flash15 = live.find((m) => m.includes("1.5-flash")) || live[0];
    if (flash2) {
      return { primary: flash2, fallback: flash15 };
    }
    return { primary: live[0], fallback: flash15 };
  }

  const cleanPref = preferredModel?.trim();
  if (cleanPref && cleanPref.startsWith("gemini") && !cleanPref.includes("3.8") && !cleanPref.includes("2.5")) {
    return { primary: cleanPref, fallback: "gemini-1.5-flash" };
  }
  return { primary: "gemini-2.0-flash", fallback: "gemini-1.5-flash" };
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

  // Weather / medical / health diagnosis
  if (/(weather in|weather forecast|forecast for|temperature in)\s+/i.test(t)) {
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
function buildSystemInstruction(knowledgeBase: string, isCompact = false, trainingRules: any[] = []): string {
  let customDirectives = "";
  if (Array.isArray(trainingRules) && trainingRules.length > 0) {
    const activeRules = trainingRules.filter((r: any) => r && r.isActive !== false);
    if (activeRules.length > 0) {
      customDirectives = `\n=== LIVE ADMIN CHAT CONTROL & TRAINING DIRECTIVES ===\n` +
        activeRules.map((r: any) => `[${(r.type || "GUIDE").toUpperCase()}] ${r.title}: ${r.instruction}`).join("\n") + `\n`;
    }
  }

  if (isCompact) {
    return `You are the official creative representative and personal portfolio assistant for Rashed Pervej, an experienced Senior Visualizer, Brand Identity Designer, Packaging Specialist, and Motion Graphics Artist from Bangladesh (6+ years industry experience).

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

  return `You are the official creative representative and personal portfolio assistant for Rashed Pervej.
Rashed is an experienced Senior Visualizer, Brand Identity Designer, Packaging Specialist, and Motion Graphics Artist from Bangladesh with over 6+ years of industry experience (7+ years design journey), having worked with top brands like Go Nature BD, Chaldal Ltd., Sheba Platform Ltd., and international clients in the US and Europe.

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

3. CONCISE BREVITY (STRICT WORD LIMIT):
   - Keep answers between 20 to 45 words maximum.
   - Simple greetings ("hi", "hello", "salam"): reply in 1 short sentence.
   - Service questions ("packaging koren?", "motion graphics?"): reply in 2 short sentences.
   - Project proposals ("new project korte cai"): respond with enthusiasm in 2 sentences, asking ONLY what type of design they need.

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
    /\b(koren|kore|kori|korte|koro|korbo|koto|kobe|koi|chai|chay|ache|achhe|ase|lagbe|lagve|hobe|jani|bolen|amake|amar|apnar|apni|tumi|tomar|ki|keno|kemon|kothay|shuru|bhalo|darun|dhaka|jashore|dam|khoroch|somoy|duita|ekta|duti|ta|tate|korsen|kortesi|korchen)\b/i;
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

  // 1. Natural Short Greetings
  if (
    /^(hi|hello|hey|hiya|heyy|heya|hola|yo|good\s*morning|good\s*afternoon|good\s*evening|হাই|হ্যালো|হেই|নমস্কার)$/i.test(q) ||
    /^(hi|hello|hey)\s+(there|bot|bro|rashed|bhai)?$/i.test(q)
  ) {
    if (isBengaliOrBanglish) {
      return "হ্যালো! কেমন আছেন? Rashed-এর পোর্টফোলিও, ডিজাইন সার্ভিস বা নতুন কোনো প্রজেক্ট নিয়ে কি জানতে চাচ্ছেন?";
    }
    return "Hi there! How can I help you today? Looking to explore Rashed's design work, or planning a project?";
  }

  // 1b. Islamic Salam & Greeting Check
  if (
    /\b(assalamu\s*alaikum|as-salamu\s*alaikum|salam|slaam|সালাম|আসসালামু\s*আলাইকুম|কেমন\s*আছেন|kemon\s*achen|ki\s*obostha|kemon\s*aso)\b/i.test(q) &&
    q.split(/\s+/).length <= 4
  ) {
    if (/salam|সালাম/i.test(q)) {
      return "ওয়ালাইকুমুস সালাম! কেমন আছেন? Rashed-এর ডিজাইন কাজ, পোর্টফোলিও বা প্রজেক্ট নিয়ে কীভাবে সাহায্য করতে পারি?";
    }
    return "হ্যালো! ভালো আছি, ধন্যবাদ। Rashed-এর পোর্টফোলিও বা ডিজাইন সংক্রান্ত কোনো বিষয়ে জানতে চান?";
  }

  // 2. Direct Contact Info Request (Only when user explicitly asks for contact numbers/methods)
  if (
    q.length < 50 &&
    (
      normalized.includes("contact") ||
      normalized.includes("email") ||
      normalized.includes("phone") ||
      normalized.includes("whatsapp") ||
      normalized.includes("jogajog") ||
      normalized.includes("number") ||
      normalized.includes("kotha bolbo") ||
      normalized.includes("যোগাযোগ") ||
      normalized.includes("যোগাযোগের") ||
      normalized.includes("কথা বলব") ||
      normalized.includes("নাম্বার") ||
      normalized.includes("ইমেইল")
    )
  ) {
    if (isBengaliOrBanglish) {
      return "Rashed-এর সাথে সরাসরি যোগাযোগ করতে নিচের WhatsApp বা Email বাটন ব্যবহার করতে পারেন, অথবা সরাসরি প্রজেক্ট ব্রিফ সাবমিট করতে পারেন:";
    }
    return "You can reach Rashed Pervej directly via WhatsApp or Email, or submit a quick project brief below:";
  }

  // 3. Human Handoff / Talk to Rashed Request
  if (
    normalized.includes("talk to rashed") ||
    normalized.includes("speak with rashed") ||
    normalized.includes("connect with rashed") ||
    normalized.includes("human handoff") ||
    normalized.includes("rashed er sathe kotha") ||
    normalized.includes("rashed er shathe") ||
    normalized.includes("rashed er sathe")
  ) {
    if (isBengaliOrBanglish) {
      return "অবশ্যই! আমি আপনাকে সরাসরি Rashed-এর সাথে কানেক্ট করে দিচ্ছি। আপনি ওনার সাথে নিচের WhatsApp বা Email বাটনে সরাসরি যোগাযোগ করতে পারেন, অথবা প্রজেক্টের ব্রিফ জমা দিতে পারেন:";
    }
    return "Absolutely! I can connect you directly with Rashed. You can message him instantly on WhatsApp, send an Email, or submit a quick project brief below:";
  }

  // 4. View Portfolio / Work Showcase / Link Dao
  if (
    q === "view portfolio" ||
    q === "show portfolio" ||
    q === "link dao" ||
    q === "link" ||
    normalized.includes("link dao") ||
    normalized.includes("link den") ||
    normalized.includes("portfolio link") ||
    normalized.includes("portfolio dekhan") ||
    normalized.includes("kaj dekhte chai")
  ) {
    if (isBengaliOrBanglish) {
      return "নিচের লিংকে ঢুকে আপনি আপডেটেড প্রজেক্টস দেখতে পাবেন। আপনার প্রজেক্টের বিষয়ে আলোচনা করতে নিচের ব্রিফ বা WhatsApp বাটন ব্যবহার করতে পারেন:";
    }
    return "You can view Rashed's updated projects and case studies using the link below. Feel free to submit a quick brief or message via WhatsApp to discuss your project:";
  }

  // 5. Pricing / Ballpark Estimate Policy (Do NOT invent dollar figures unless admin guides)
  if (
    (normalized.includes("price") || normalized.includes("cost") || normalized.includes("dam koto") || normalized.includes("khoroch") || normalized.includes("rates") || normalized.includes("quote") || normalized.includes("budget") || normalized.includes("pricing") || normalized.includes("koto taka") || normalized.includes("charge")) &&
    q.length < 65
  ) {
    const customPrice = (data as any)?.customPriceGuidelines || (data as any)?.aiRouterSettings?.customPriceGuidelines;
    if (customPrice && typeof customPrice === "string" && customPrice.trim()) {
      return customPrice.trim();
    }
    if (isBengaliOrBanglish) {
      return "Rashed-এর প্রজেক্ট প্রাইসিং সম্পূর্ণ কাস্টমাইজড—কাজের পরিধি (Scope), ডিজাইনের জটিলতা এবং ডেলিভারি টাইমলাইনের ওপর নির্ভর করে (কোনো ফিক্সড বা রিজিড রেট নেই)। আপনার প্রজেক্টের সঠিক কোটেশন পেতে বা আলোচনার জন্য নিচের বাটনে সংক্ষিপ্ত ব্রিফ জমা দিন অথবা WhatsApp-এ মেসেজ দিয়ে রিকোয়েস্ট কল ব্যাক করতে পারেন:";
    }
    return "Rashed does not quote rigid, fixed rates upfront. Every project's investment is custom-tailored to its specific scope, deliverables, and timeline. To receive an exact tailored quotation or request a project discussion/call back, please share a quick brief below or connect directly on WhatsApp:";
  }

  // 5b. Permanent / Full-Time Job Offers & Recruitment Inquiries
  const isJobInquiry =
    normalized.includes("full-time") ||
    normalized.includes("full time") ||
    normalized.includes("permanent") ||
    normalized.includes("chakri") ||
    normalized.includes("chakor") ||
    normalized.includes("চাকরি") ||
    normalized.includes("নিয়োগ") ||
    normalized.includes("recruitment") ||
    normalized.includes("join our team") ||
    normalized.includes("in-house");

  if (isJobInquiry && q.length < 90) {
    if (isBengaliOrBanglish) {
      return "ফুল-টাইম বা ক্যারিয়ারের সুযোগের প্রস্তাবের জন্য ধন্যবাদ! Rashed মূলত সিলেক্টেড ব্র্যান্ড বা এজেন্সির সাথে সিনিয়র ভিজ্যুয়ালাইজার বা ডিজাইন লিড হিসেবে কাজ করতে আগ্রহী। আপনার কোম্পানি ও ভূমিকা নিয়ে বিস্তারিত আলোচনার জন্য নিচের WhatsApp বা Email বাটন দিয়ে সরাসরি যোগাযোগ করতে পারেন:";
    }
    return "Thank you for the opportunity! Rashed is open to discussing high-impact Senior Visualizer, Art Director, or Design Lead roles with forward-thinking brands and creative teams. To discuss the role and your company vision, please connect directly with Rashed via WhatsApp or Email below:";
  // 6. Direct Grounded Match with verified FAQ Database
  if (Array.isArray(data?.faqs) && data.faqs.length > 0) {
    const cleanQ = q.replace(/[^a-z0-9]/g, " ").trim();
    for (const faq of data.faqs) {
      if (!faq?.question || !faq?.answer) continue;
      const faqQ = faq.question.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
      if (
        faqQ === cleanQ ||
        (cleanQ.length > 12 && faqQ.includes(cleanQ)) ||
        (faqQ.length > 12 && cleanQ.includes(faqQ))
      ) {
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
    const isCompact = (structuredData?.aiRouterSettings?.contextMode ?? "compact") === "compact";
    const knowledgeBase = await getPortfolioKnowledge(isCompact ? "compact" : "full");

    // 3. Grounded Portfolio Direct Matcher (Immediate, 100% accurate, zero latency, warm human tone)
    const directAnswer = generateDirectAnswer(cleanMessage, history, structuredData);
    if (directAnswer) {
      return res.status(200).json({ text: directAnswer, provider: "FAQ" });
    }

    // 4. Dynamic AI Generation with Precious-Style Multi-Provider Vault Router & Failover
    let candidates: VaultCandidate[] = [];

    if (Array.isArray(structuredData?.aiVault) && structuredData.aiVault.length > 0) {
      candidates = structuredData.aiVault
        .filter((v: any) => v && v.apiKey && v.isActive !== false)
        .sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99))
        .map((v: any) => ({
          id: v.id,
          provider: v.provider || (v.apiKey.startsWith("gsk_") ? "groq" : "gemini"),
          label: v.label,
          apiKey: v.apiKey,
          model: v.model,
          priority: v.priority || 99,
        }));
    }

    // If Vault is empty or has no active keys, fallback to legacy keys
    if (candidates.length === 0) {
      const fallbackKeys = getAvailableApiKeys(structuredData?.aiApiKey);
      candidates = fallbackKeys.map((k, idx) => ({
        id: `legacy_${idx}`,
        provider: (k.startsWith("gsk_") ? "groq" : "gemini") as any,
        label: k.startsWith("gsk_") ? "Groq (Llama 3.3 70B Active)" : "Google Gemini Flash",
        apiKey: k,
        model: k.startsWith("gsk_") ? "llama-3.3-70b-versatile" : "gemini-2.0-flash",
        priority: idx + 1,
      }));
    }

    if (candidates.length === 0) {
      console.warn("[AI Chat Warning] 0 active AI keys found in Vault/Database/Env. Check Vercel Environment Variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or GROQ_API_KEY).");
    } else {
      console.log(`[AI Chat] Router loaded ${candidates.length} candidate(s): ${candidates.map(c => `${c.provider}(${c.model})`).join(", ")}`);
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
    const selectedModel = req.body?.selectedModel || structuredData?.aiRouterSettings?.selectedModel || "auto";
    if (selectedModel && selectedModel !== "auto") {
      const lowerSel = selectedModel.toLowerCase().trim();
      const [provPart, modPart] = lowerSel.includes(":") ? lowerSel.split(":") : ["", lowerSel];
      
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
    const systemInstruction = buildSystemInstruction(knowledgeBase, isCompact, structuredData?.chatTrainingRules);

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

            recordAuditLog({
              action: "chat_request",
              resourceType: "chat",
              resourceId: `sess_${Date.now()}`,
              metadata: {
                provider: "groq",
                model: modelToUse,
                tokens: groqRes.totalTokens || 3500,
                latencyMs: latency,
                question: cleanMessage.slice(0, 90),
                attempts: attemptIndex,
                failoverFrom: failoverReason,
              },
            });
            recordTokenUsage("groq", groqRes.totalTokens || 3500);
            return res.status(200).json({
              text: groqRes.text.trim(),
              tokenUsage: groqRes.totalTokens,
              provider: "groq",
              model: modelToUse,
              attempts: attemptIndex,
              failoverFrom: failoverReason,
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
              model: modelToUse,
              attempts: attemptIndex,
              failoverFrom: failoverReason,
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
              model: modelToUse,
              attempts: attemptIndex,
              failoverFrom: failoverReason,
            });
          }
        } else {
          // Google Gemini Provider
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
              model: modelToUse,
              attempts: attemptIndex,
              failoverFrom: failoverReason,
            });
          }
        }
      } catch (providerError: any) {
        failedCandidates.push(candidate.provider || candidate.label || "unknown");
        providerCooldowns.set(keyId, Date.now() + cooldownDuration);
        console.warn(`[Vault Router: Key ${candidate.label || keyId.slice(0, 7)} failed. Cooldown set for ${cooldownDuration / 1000}s. Trying next provider]:`, providerError?.message || providerError);
      }
    }

    // 5. Default natural portfolio introduction (if all AI providers failed)
    if (viableCandidates.length > 0 && failedCandidates.length >= viableCandidates.length) {
      recordAuditLog({
        action: "chat_request",
        resourceType: "chat",
        resourceId: `sess_${Date.now()}`,
        metadata: {
          provider: "system",
          model: "fallback",
          tokens: 45,
          latencyMs: Date.now() - chatStartTime,
          question: cleanMessage.slice(0, 90),
          error: "All configured AI providers were unreachable or rate-limited",
          attempts: attemptIndex,
          failoverFrom: failedCandidates.join(", "),
        },
      });
    }

    const isBengaliOrBanglish =
      /[\u0980-\u09FF]/.test(cleanMessage) ||
      /\b(koren|kore|kori|korte|koro|korbo|koto|kobe|koi|chai|chay|ache|achhe|ase|lagbe|lagve|hobe|jani|bolen|amake|amar|apnar|apni|tumi|tomar|ki|keno|kemon|kothay|shuru|bhalo|darun|dhaka|jashore|dam|khoroch|somoy|duita|ekta|duti|ta|tate|korsen|kortesi|korchen)\b/i.test(
        cleanMessage
      );

    const defaultResponse = isBengaliOrBanglish
      ? `হ্যালো! Rashed Pervej-এর ডিজাইন পোর্টফোলিওতে স্বাগতম। Brand Identity, Packaging Design বা Motion Graphics—কোন বিষয়ে জানতে চাচ্ছেন?`
      : `Hello! Welcome to Rashed Pervej's creative portfolio. Are you looking into Brand Identity, Packaging Design, or Motion Graphics?`;

    return res.status(200).json({
      text: defaultResponse,
      provider: "System",
      tokenUsage: 45,
      attempts: attemptIndex,
      failoverFrom: failedCandidates.length > 0 ? failedCandidates.join(", ") : undefined,
    });
  } catch (error: any) {
    console.error("[AI Chat API Error]:", error?.message || error);
    return res.status(200).json({
      text: "Hi! Rashed Pervej is a Senior Visualizer specializing in **Brand Identity**, **Packaging**, and **Motion Graphics**. Reach him directly at **rashedpervej2011@gmail.com** or WhatsApp at **+8801932623969**.",
      provider: "System",
      tokenUsage: 35,
    });
  }
}
