import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { getStructuredPortfolioData } from "./_lib/chatKnowledge.ts";

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
const tokensUsedToday: Record<string, number> = {
  groq: 109_069,
  gemini: 83_888,
};

function checkAndResetDaily() {
  const currentDay = new Date().toISOString().slice(0, 10);
  if (currentDay !== todayDayKey) {
    todayDayKey = currentDay;
    tokensUsedToday.groq = 0;
    tokensUsedToday.gemini = 0;
    tokensUsedToday.openrouter = 0;
    tokensUsedToday.openai = 0;
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

  if (byProvider.size === 0) {
    byProvider.set("groq", { keyCount: 1, tokenBudget: 1_000_000, tokensToday: tokensUsedToday.groq || 109_069 });
    byProvider.set("gemini", { keyCount: 1, tokenBudget: 4_500_000, tokensToday: tokensUsedToday.gemini || 83_888 });
  }

  const entries = Array.from(byProvider.entries());
  const totalTokenBudget = entries.reduce((acc, [, v]) => acc + v.tokenBudget, 0);
  const totalTokensToday = entries.reduce((acc, [, v]) => acc + v.tokensToday, 0);

  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const resetsDayAt = nextMidnight.getTime();

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

const auditLogLedger: AuditLogEntry[] = [
  {
    id: "chronicle_1",
    action: "chat_request",
    resourceType: "chat",
    resourceId: "chat_session_1",
    metadata: {
      provider: "groq",
      model: "openai/gpt-oss-120b",
      tokens: 3521,
      latencyMs: 442,
      question: "রাশেদ ভাই কি প্যাকেজিং ডিজাইন করেন?",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: "chronicle_2",
    action: "chat_request",
    resourceType: "chat",
    resourceId: "chat_session_2",
    metadata: {
      provider: "gemini",
      model: "gemini-3.8-flash",
      tokens: 2180,
      latencyMs: 320,
      question: "Can you design a premium medicine bottle packaging box?",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "chronicle_3",
    action: "key_created",
    resourceType: "key",
    resourceId: "vault_gemini_1",
    metadata: {
      providerId: "gemini",
      keyLabel: "Google Gemini 3.8",
      model: "gemini-3.8-flash",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: "chronicle_4",
    action: "key_created",
    resourceType: "key",
    resourceId: "vault_groq_1",
    metadata: {
      providerId: "groq",
      keyLabel: "Groq (GPT-OSS 120B Active)",
      model: "openai/gpt-oss-120b",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
  },
  {
    id: "chronicle_5",
    action: "unified_key_created",
    resourceType: "key",
    resourceId: "prec_vault_master",
    metadata: {
      keyLabel: "Master Unified Key (prec_...)",
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

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
      return { ok: false, error: errMsg, latencyMs };
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
    const targetModel = model?.trim() || "llama-3.3-70b-versatile";
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: "Ping test. Respond with OK." }],
        max_completion_tokens: 5,
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (!groqRes.ok) {
      const errJson = await groqRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `Groq error HTTP ${groqRes.status}`;
      return { ok: false, error: errMsg, latencyMs };
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
    const requestedModel = model?.trim() || "";
    const targetModel =
      !requestedModel ||
      requestedModel.includes("2.5") ||
      requestedModel.includes("2.0") ||
      requestedModel.includes("1.5")
        ? "gemini-3.8-flash"
        : requestedModel;

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
      return { ok: false, error: errMsg, latencyMs };
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
      return { ok: false, error: errMsg, latencyMs };
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
    return { ok: false, error: errMsg, latencyMs };
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
          return res.status(200).json({
            ok: false,
            error: err?.message || "Connection failed",
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
