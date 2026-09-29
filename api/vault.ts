import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { getStructuredPortfolioData } from "./_lib/chatKnowledge";
import { verifyAdminAuth } from "./_lib/auth";

/* =========================================================================
   1. TYPES & INTERFACES
   ========================================================================= */

export interface ProviderUsageSegment {
  providerId: string;
  label: string;
  weightPercent: number;
  usedFraction: number;
  remainingFraction: number;
  tokensToday: number;
  tokenBudget: number;
  source: "live" | "estimated";
}

export interface UsageSummary {
  segments: ProviderUsageSegment[];
  totalDailyLimit: number;
  totalTokensToday: number;
  totalTokenBudget: number;
  metric: "tokens";
  resetsDayAt: number;
}

export interface AuditLogEntry {
  id: string;
  action: "chat_request" | "key_created" | "key_updated" | "key_deleted" | "unified_key_created" | "health_check";
  resourceType: string | null;
  resourceId: string | null;
  metadata: {
    provider?: string;
    model?: string;
    tokens?: number;
    latencyMs?: number;
    question?: string;
    error?: string;
    streamFailed?: boolean;
    failoverFrom?: string;
    attempts?: number;
    providerId?: string;
    keyLabel?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
}

/* =========================================================================
   2. USAGE TRACKER LOGIC
   ========================================================================= */

const PROVIDER_BUDGETS: Record<string, number> = {
  groq: 1_000_000,
  gemini: 4_500_000,
  "google-gemini": 4_500_000,
  cerebras: 1_000_000,
  cloudflare: 1_000_000,
  "github-models": 1_000_000,
  openrouter: 2_000_000,
  mistral: 1_000_000,
  openai: 2_500_000,
  huggingface: 1_000_000,
  "ollama-cloud": 1_000_000,
  opencode: 1_000_000,
  zhipu: 1_000_000,
  llm7: 1_000_000,
  cohere: 1_000_000,
  nvidia: 1_000_000,
  pollinations: 1_000_000,
  kilo: 1_000_000,
  "openai-compat": 1_000_000,
};

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  gemini: "Gemini",
  "google-gemini": "Gemini",
  cerebras: "Cerebras",
  cloudflare: "Cloudflare",
  "github-models": "GitHub Models",
  openrouter: "OpenRouter",
  mistral: "Mistral",
  openai: "OpenAI",
  huggingface: "HuggingFace",
  "ollama-cloud": "Ollama Cloud",
  opencode: "OpenCode",
  zhipu: "Z.ai (Zhipu)",
  llm7: "LLM7",
  cohere: "Cohere",
  nvidia: "NVIDIA",
  pollinations: "Pollinations",
  kilo: "Kilo",
  "openai-compat": "Custom",
};

let todayDayKey = new Date().toISOString().slice(0, 10);
const tokensUsedToday: Record<string, number> = {};

function checkAndResetDaily() {
  const currentDay = new Date().toISOString().slice(0, 10);
  if (currentDay !== todayDayKey) {
    todayDayKey = currentDay;
    for (const key of Object.keys(tokensUsedToday)) {
      tokensUsedToday[key] = 0;
    }
  }
}

export function recordTokenUsage(provider: string, tokens: number) {
  checkAndResetDaily();
  const norm = provider.toLowerCase().includes("gemini") ? "gemini" : provider.toLowerCase();
  tokensUsedToday[norm] = (tokensUsedToday[norm] || 0) + tokens;
}

export async function getUsageSummary(): Promise<UsageSummary> {
  checkAndResetDaily();

  const byProvider = new Map<
    string,
    {
      keyCount: number;
      tokenBudget: number;
      tokensToday: number;
    }
  >();

  try {
    const data = await getStructuredPortfolioData();
    const vaultKeys = Array.isArray(data?.aiVault) && data.aiVault.length > 0 ? data.aiVault : [];

    if (vaultKeys.length > 0) {
      for (const k of vaultKeys) {
        if (!k || k.isActive === false) continue;
        const norm = (k.provider || "gemini").toLowerCase().replace("google-", "");
        const budget = PROVIDER_BUDGETS[k.provider] || PROVIDER_BUDGETS[norm] || 500_000;
        const existing = byProvider.get(norm) ?? {
          keyCount: 0,
          tokenBudget: 0,
          tokensToday: tokensUsedToday[norm] || 0,
        };
        existing.keyCount += 1;
        existing.tokenBudget += budget;
        byProvider.set(norm, existing);
      }
    }
  } catch (e) {
    // fallback
  }

  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const resetsDayAt = nextMidnight.getTime();

  if (byProvider.size === 0) {
    return {
      segments: [],
      totalDailyLimit: 0,
      totalTokensToday: 0,
      totalTokenBudget: 0,
      metric: "tokens",
      resetsDayAt,
    };
  }

  const entries = Array.from(byProvider.entries());
  const totalTokenBudget = entries.reduce((acc, [, v]) => acc + v.tokenBudget, 0);
  const totalTokensToday = entries.reduce((acc, [, v]) => acc + v.tokensToday, 0);

  const segments: ProviderUsageSegment[] = entries.map(([p, v]) => {
    const remainingFraction = Math.max(0, Math.min(1, (v.tokenBudget - v.tokensToday) / v.tokenBudget));
    const usedFraction = 1 - remainingFraction;
    const weightPercent = totalTokenBudget > 0 ? (v.tokenBudget / totalTokenBudget) * 100 : 0;

    return {
      providerId: p,
      label: PROVIDER_LABELS[p] || p.charAt(0).toUpperCase() + p.slice(1),
      weightPercent: Number(weightPercent.toFixed(2)),
      usedFraction: Number(usedFraction.toFixed(4)),
      remainingFraction: Number(remainingFraction.toFixed(4)),
      tokensToday: v.tokensToday,
      tokenBudget: v.tokenBudget,
      source: "live",
    };
  });

  return {
    segments,
    totalDailyLimit: totalTokenBudget,
    totalTokensToday,
    totalTokenBudget,
    metric: "tokens",
    resetsDayAt,
  };
}

/* =========================================================================
   3. AUDIT LOGS LOGIC
   ========================================================================= */

const auditLogLedger: AuditLogEntry[] = [];

export function recordAuditLog(entry: Omit<AuditLogEntry, "id" | "createdAt">): AuditLogEntry {
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `chronicle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  auditLogLedger.unshift(newEntry);
  if (auditLogLedger.length > 200) {
    auditLogLedger.pop();
  }
  return newEntry;
}

export function getAuditLogs(): AuditLogEntry[] {
  return auditLogLedger;
}

export function cleanHealthError(
  rawError: any,
  provider?: string,
  model?: string
): { message: string; status: "rate_limited" | "invalid" | "error" } {
  let text = typeof rawError === "string" ? rawError : rawError?.message || String(rawError || "");

  // Try to parse nested JSON if present (Google Gemini / OpenAI / Groq error objects)
  try {
    const parsed = JSON.parse(text);
    if (parsed.error) {
      if (typeof parsed.error === "string") {
        text = parsed.error;
      } else if (parsed.error.message) {
        text = parsed.error.message;
      }
    }
  } catch {
    // not JSON
  }

  const lower = text.toLowerCase();

  // 1. Quota / Rate limit (HTTP 429 / RESOURCE_EXHAUSTED / Quota exceeded)
  if (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    const retryMatch = text.match(/retry in\s+([\d\.]+\s*[smh]?)/i) || text.match(/try again in\s+([\d\.]+\s*[smh]?)/i);
    const retryInfo = retryMatch ? ` Retry in ~${Math.round(parseFloat(retryMatch[1]))}s.` : "";
    const limitMatch = text.match(/limit:\s*(\d+)/i);
    const limitInfo = limitMatch ? ` (${limitMatch[1]} requests limit)` : "";
    const modelName = model || "model";

    return {
      status: "rate_limited",
      message: `Rate limited: Free tier quota reached for ${modelName}${limitInfo}.${retryInfo}`,
    };
  }

  // 2. Authentication / Invalid API key (401 / 403 / API_KEY_INVALID)
  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("invalid api key") ||
    lower.includes("unauthorized") ||
    lower.includes("api_key_invalid") ||
    lower.includes("authentication") ||
    lower.includes("invalid_api_key")
  ) {
    return {
      status: "invalid",
      message: `Invalid or unauthorized API key. Please check your credentials.`,
    };
  }

  // 3. Model not found (404 / NOT_FOUND)
  if (lower.includes("404") || lower.includes("not found") || lower.includes("not supported")) {
    return {
      status: "error",
      message: `Model '${model || "selected"}' is not supported or not found for this provider.`,
    };
  }

  // 4. Clean short fallback
  const cleanShort = text.length > 120 ? `${text.slice(0, 117)}…` : text;
  return {
    status: "error",
    message: cleanShort || "Health check probe failed",
  };
}

/* =========================================================================
   4. VAULT KEY TESTER LOGIC
   ========================================================================= */

async function testApiKey(provider: string, apiKey: string, model?: string) {
  const cleanKey = apiKey.trim();
  const startTime = Date.now();

  if (provider === "cerebras" || cleanKey.startsWith("csk-")) {
    const targetModel = model?.trim() || "gpt-oss-120b";
    const cerebrasRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: "Ping test" }],
        max_tokens: 5,
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (!cerebrasRes.ok) {
      const errJson = await cerebrasRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `Cerebras error HTTP ${cerebrasRes.status}`;
      const cleaned = cleanHealthError(errMsg, "cerebras", targetModel);
      return { ok: false, error: cleaned.message, status: cleaned.status, latencyMs };
    }

    return {
      ok: true,
      latencyMs,
      provider: "cerebras",
      model: targetModel,
      status: "Healthy",
    };
  }

  if (provider === "groq" || cleanKey.startsWith("gsk_")) {
    let targetModel = model?.trim() || "openai/gpt-oss-120b";
    if (targetModel.startsWith("gemini") || targetModel.includes("google")) {
      targetModel = "openai/gpt-oss-120b";
    }
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: "Ping test. Respond with OK." }],
        max_tokens: 5,
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (!groqRes.ok) {
      const errJson = await groqRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `Groq error HTTP ${groqRes.status}`;
      const cleaned = cleanHealthError(errMsg, "groq", targetModel);
      return { ok: false, error: cleaned.message, status: cleaned.status, latencyMs };
    }

    return {
      ok: true,
      latencyMs,
      provider: "groq",
      model: targetModel,
      status: "Healthy",
    };
  }

  if (provider === "google-gemini" || provider === "gemini" || cleanKey.startsWith("AIzaSy") || cleanKey.startsWith("AQ.")) {
    let targetModel = model?.trim() || "gemini-3.8-flash";
    if (targetModel.includes("llama") || targetModel.includes("gpt") || targetModel.includes("qwen") || !targetModel.startsWith("gemini")) {
      targetModel = "gemini-3.8-flash";
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: cleanKey,
        httpOptions: { timeout: 15000 },
      });

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: "Ping test",
      });

      const latencyMs = Date.now() - startTime;
      const textOutput =
        (typeof (response as any).text === "string" ? (response as any).text : "") ||
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "";

      if (response && (textOutput || (response.candidates && response.candidates.length > 0))) {
        return {
          ok: true,
          latencyMs,
          provider: "gemini",
          model: targetModel,
          status: "Healthy",
        };
      }
      throw new Error("No response content received from Gemini");
    } catch (geminiErr: any) {
      const cleaned = cleanHealthError(geminiErr, "gemini", targetModel);
      return {
        ok: false,
        error: cleaned.message,
        status: cleaned.status,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  if (provider === "mistral" || cleanKey.startsWith("mis_")) {
    const targetModel = model?.trim() || "mistral-large-latest";
    const misRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: "Ping test" }],
        max_tokens: 5,
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (!misRes.ok) {
      const errJson = await misRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `Mistral error HTTP ${misRes.status}`;
      const cleaned = cleanHealthError(errMsg, "mistral", targetModel);
      return { ok: false, error: cleaned.message, status: cleaned.status, latencyMs };
    }

    return {
      ok: true,
      latencyMs,
      provider: "mistral",
      model: targetModel,
      status: "Healthy",
    };
  }

  if (provider === "openrouter" || cleanKey.startsWith("sk-or-")) {
    const targetModel = model?.trim() || "meta-llama/llama-3.3-70b-instruct:free";
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pervej.com",
        "X-Title": "Pervej Portfolio Vault",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: "Ping" }],
        max_tokens: 5,
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (!orRes.ok) {
      const errJson = await orRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `OpenRouter error HTTP ${orRes.status}`;
      const cleaned = cleanHealthError(errMsg, "openrouter", targetModel);
      return { ok: false, error: cleaned.message, status: cleaned.status, latencyMs };
    }

    return {
      ok: true,
      latencyMs,
      provider: "openrouter",
      model: targetModel,
      status: "Healthy",
    };
  }

  // Default: OpenAI or OpenAI-compatible endpoint
  const targetModel = model?.trim() || "gpt-4o-mini";
  const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cleanKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: "user", content: "Ping" }],
      max_tokens: 5,
    }),
  });

  const latencyMs = Date.now() - startTime;
  if (!oaiRes.ok) {
    const errJson = await oaiRes.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || `OpenAI error HTTP ${oaiRes.status}`;
    const cleaned = cleanHealthError(errMsg, "openai", targetModel);
    return { ok: false, error: cleaned.message, status: cleaned.status, latencyMs };
  }

  return {
    ok: true,
    latencyMs,
    provider: "openai",
    model: targetModel,
    status: "Healthy",
  };
}

/* =========================================================================
   5. UNIFIED DISPATCHER (Vercel Serverless Function & Express)
   ========================================================================= */

export default async function vaultHandler(req: Request, res: Response) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = req.url || "";
  const queryType = (req.query?.type as string)?.toLowerCase();
  const queryAction = (req.query?.action as string)?.toLowerCase();
  const bodyAction = req.body?.action?.toLowerCase();
  const bodyType = req.body?.type?.toLowerCase();

  // Determine intent
  const isAudit =
    queryType === "audit" ||
    queryAction === "audit" ||
    bodyAction === "audit" ||
    bodyType === "audit" ||
    url.includes("/audit") ||
    Boolean(req.body?.resourceType || (req.body?.action && req.body.action !== "test" && req.body.action !== "record_usage" && !req.body?.apiKey));
  const isUsage = queryType === "usage" || queryAction === "usage" || bodyAction === "usage" || bodyType === "usage" || url.includes("/usage");
  const isTest = queryAction === "test" || bodyAction === "test" || url.includes("/test") || Boolean(req.method === "POST" && req.body?.apiKey);

  try {
    // Require admin authentication for sensitive key testing and audit log operations
    if (isTest || isAudit) {
      const auth = await verifyAdminAuth(req, "Admin authentication required for Vault diagnostics and audit ledger.");
      if (!auth.authorized) {
        const isDev = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
        if (!isDev) {
          return res.status(auth.status).json({ ok: false, error: auth.error });
        }
      }
    }

    // GET Requests
    if (req.method === "GET") {
      if (isAudit) {
        return res.status(200).json({ ok: true, entries: auditLogLedger });
      }
      // Default GET is usage summary
      const summary = await getUsageSummary();
      return res.status(200).json(summary);
    }

    // POST Requests
    if (req.method === "POST") {
      if (isTest) {
        const { provider, apiKey, model } = req.body || {};
        if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
          return res.status(400).json({ ok: false, error: "API Key is required" });
        }
        const startTime = Date.now();
        try {
          const result = await testApiKey(provider, apiKey, model);
          return res.status(200).json(result);
        } catch (err: any) {
          const cleaned = cleanHealthError(err, provider, model);
          return res.status(200).json({
            ok: false,
            status: cleaned.status,
            error: cleaned.message,
            latencyMs: Date.now() - startTime,
          });
        }
      }

      if (isAudit) {
        const { action, resourceType, resourceId, metadata } = req.body || {};
        if (action) {
          const recorded = recordAuditLog({
            action,
            resourceType: resourceType || null,
            resourceId: resourceId || null,
            metadata: metadata || null,
          });
          return res.status(200).json({ ok: true, entry: recorded });
        }
        return res.status(200).json({ ok: true, entries: auditLogLedger });
      }

      // Default POST fallback
      if (req.body?.action === "record_usage" && req.body?.provider && req.body?.tokens) {
        recordTokenUsage(req.body.provider, Number(req.body.tokens));
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ ok: false, error: "Invalid action or parameters for /api/vault" });
    }

    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (err: any) {
    console.error("[VaultHandler Error]:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Internal Vault Error" });
  }
}
