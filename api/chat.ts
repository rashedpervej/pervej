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
 * Fully Dynamic System Instruction Builder
 * Single Source of Truth: Admin Panel (chatTrainingRules + chatbotSettings) + Portfolio Factual Knowledge.
 * Zero hardcoded response scripts, zero fixed dialogue rules.
 */
function buildSystemInstruction(
  knowledgeBase: string,
  _isCompact = false,
  trainingRules: any[] = [],
  chatbotSettings?: any
): string {
  const botName = chatbotSettings?.botName || "Creative Advisor";
  const botSubtitle = chatbotSettings?.botSubtitle || "for Rashed Pervej";
  const customPersona = chatbotSettings?.humanPersonaPrompt?.trim() || "";

  // 1. Live Admin Training Rules & Directives (DOs, DONTs, STYLE, GUIDES)
  let adminRulesSection = "";
  if (Array.isArray(trainingRules) && trainingRules.length > 0) {
    const activeRules = trainingRules.filter((r: any) => r && r.isActive !== false);
    if (activeRules.length > 0) {
      adminRulesSection =
        `\n=== ADMIN TRAINING RULES & BEHAVIOR DIRECTIVES (SOURCE OF TRUTH) ===\n` +
        activeRules
          .map((r: any) => `[${(r.type || "RULE").toUpperCase()}] ${r.title}: ${r.instruction}`)
          .join("\n") +
        `\n`;
    }
  }

  // 2. Dynamic Action Buttons from Admin
  let actionButtonsSection = "";
  if (Array.isArray(chatbotSettings?.actionButtons) && chatbotSettings.actionButtons.length > 0) {
    const activeButtons = chatbotSettings.actionButtons.filter((b: any) => b && b.isActive !== false);
    if (activeButtons.length > 0) {
      actionButtonsSection =
        `\n=== AVAILABLE ACTION BUTTONS / CTAS (CONFIGURED IN ADMIN) ===\n` +
        `If the visitor's query naturally calls for an action (e.g. asking to see Behance portfolio, start a project brief, email, or WhatsApp), you may optionally include a CTA tag [ACTION: type] at the end:\n` +
        activeButtons.map((b: any) => `- [ACTION: ${b.type}] -> ${b.label}`).join("\n") +
        `\nOnly use when genuinely helpful. Do not attach unprompted on casual conversation.\n\n`;
    }
  }

  // 3. Pure dynamic context
  return `You are ${botName} (${botSubtitle}).
You converse thoughtfully, naturally, and professionally with visitors about Rashed Pervej, his creative visual design work, and project collaboration.
Think before you respond: understand the visitor's genuine intent, match their language seamlessly (English, Bengali, or Banglish), and chat like a natural creative peer without robotic questionnaire lists.

${customPersona ? `=== LIVE ADMIN PERSONA & VOICE DIRECTIVES ===\n${customPersona}\n` : ""}
${adminRulesSection}
${actionButtonsSection}
=== STRICT SCOPE GUARD ===
You only answer questions concerning Rashed Pervej, his design portfolio, creative services, professional background, and project collaboration. Decline unrelated topics politely:
"${OUT_OF_SCOPE_RESPONSE}"

=== VERIFIED PORTFOLIO FACTUAL KNOWLEDGE ===
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

  // Strict direct match ONLY with verified FAQ Database created in Admin (/admin)
  // No hardcoded canned greetings, polite phrases, or scripted replies anywhere.
  if (Array.isArray(data?.faqs) && data.faqs.length > 0) {
    const cleanQ = q.replace(/[^a-z0-9]/g, " ").trim();
    for (const faq of data.faqs) {
      if (!faq?.question || !faq?.answer) continue;
      const faqQ = faq.question.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
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
