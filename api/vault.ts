import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { getStructuredPortfolioData } from "./_lib/chatKnowledge.js";
import { verifyAdminAuth } from "./_lib/auth.js";

import {
  type ProviderUsageSegment,
  type UsageSummary,
  type AuditLogEntry,
  recordTokenUsage,
  getUsageSummary,
  auditLogLedger,
  recordAuditLog,
  getAuditLogs,
} from "./_lib/auditTracker.js";

export {
  type ProviderUsageSegment,
  type UsageSummary,
  type AuditLogEntry,
  recordTokenUsage,
  getUsageSummary,
  auditLogLedger,
  recordAuditLog,
  getAuditLogs,
};

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
    let targetModel = model?.trim() || "llama-3.3-70b-versatile";
    if (targetModel.includes("oss") || targetModel.includes("120b") || targetModel.includes("20b") || targetModel.startsWith("gemini") || targetModel.includes("google")) {
      targetModel = "llama-3.3-70b-versatile";
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
    let targetModel = model?.trim() || "gemini-2.0-flash";
    if (targetModel.includes("3.8") || targetModel.includes("2.5") || targetModel.includes("llama") || targetModel.includes("gpt") || targetModel.includes("qwen") || !targetModel.startsWith("gemini")) {
      targetModel = "gemini-2.0-flash";
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

  if (req.method === "POST" && (!req.body || typeof req.body === "string" || Buffer.isBuffer(req.body))) {
    let payload = req.body;
    if (!payload && typeof (req as any).on === "function") {
      try {
        const rawBody = await new Promise<string>((resolve, reject) => {
          let data = "";
          (req as any).on("data", (chunk: any) => { data += chunk; });
          (req as any).on("end", () => resolve(data));
          (req as any).on("error", (err: any) => reject(err));
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
    (req as any).body = payload || {};
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
