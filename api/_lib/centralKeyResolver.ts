import { getStructuredPortfolioData } from "./chatKnowledge.js";

export interface ResolvedKeyCandidate {
  id: string;
  provider: string;
  label: string;
  apiKey: string;
  model: string;
  source: "vault" | "env";
  priority: number;
  isActive: boolean;
  status?: string;
  lastTested?: string;
  lastLatencyMs?: number;
  lastHttpStatus?: number;
  lastError?: string;
}

export function cleanHealthError(
  rawError: any,
  provider?: string,
  model?: string
): { message: string; status: "rate_limited" | "invalid" | "error" } {
  let text = typeof rawError === "string" ? rawError : rawError?.message || String(rawError || "");

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

/**
 * Filter out unconfigured, stale or mock providers.
 * Gemini is ONLY allowed if explicitly provided with a genuine AIzaSy key.
 */
export function isAllowedConfiguredKey(k: any): boolean {
  if (!k || !k.apiKey || typeof k.apiKey !== "string" || !k.apiKey.trim()) {
    return false;
  }
  const prov = (k.provider || "").toLowerCase().trim();
  const label = (k.label || "").toLowerCase().trim();
  const key = k.apiKey.trim();

  // Strictly purge unconfigured dead Gemini keys that were hardcoded or lingering
  if (prov === "gemini" || prov === "google-gemini" || label.includes("gemini") || key.startsWith("AQ.")) {
    if (!key.startsWith("AIzaSy")) {
      return false; // Stale/dead OAuth or mock credential
    }
  }

  return true;
}

/**
 * ONE CENTRAL PROVIDER/KEY RESOLVER
 * Both Admin Health Check and Chat API MUST use this exact function.
 *
 * Priority order:
 * Primary: Active keys from Admin AI Vault (stored in DB/encrypted vault)
 * Fallback: Environment keys (process.env.GROQ_API_KEY, etc.)
 */
export async function resolveActiveProviderChain(options?: {
  filterCooldown?: boolean;
  cooldownMap?: Map<string, number>;
}): Promise<ResolvedKeyCandidate[]> {
  const structuredData = await getStructuredPortfolioData();
  const candidates: ResolvedKeyCandidate[] = [];
  const seenKeys = new Set<string>();

  // 1. Primary: Vault Keys from DB
  const rawVault = Array.isArray(structuredData?.aiVault) ? structuredData.aiVault : [];
  const validVaultKeys = rawVault.filter((k: any) => isAllowedConfiguredKey(k) && k.isActive !== false);

  // Sort by user-configured priority
  validVaultKeys.sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99));

  for (let i = 0; i < validVaultKeys.length; i++) {
    const vk = validVaultKeys[i];
    const cleanKey = vk.apiKey.trim();
    seenKeys.add(cleanKey);

    let resolvedProv = (vk.provider || "").toLowerCase().trim();
    if (!resolvedProv) {
      if (cleanKey.startsWith("gsk_")) resolvedProv = "groq";
      else if (cleanKey.startsWith("sk-or-")) resolvedProv = "openrouter";
      else if (cleanKey.startsWith("csk-")) resolvedProv = "cerebras";
      else if (cleanKey.startsWith("sk-")) resolvedProv = "openai";
      else resolvedProv = "groq";
    }

    // Dynamic model default per provider
    let defaultModel = "llama-3.3-70b-versatile";
    if (resolvedProv === "openrouter") defaultModel = "meta-llama/llama-3.3-70b-instruct:free";
    else if (resolvedProv === "openai") defaultModel = "gpt-4o-mini";
    else if (resolvedProv === "gemini" || resolvedProv === "google-gemini") defaultModel = "gemini-2.0-flash";

    candidates.push({
      id: vk.id || `vault_${i}`,
      provider: resolvedProv,
      label: vk.label || `${resolvedProv.toUpperCase()} (Vault Key)`,
      apiKey: cleanKey,
      model: vk.model || defaultModel,
      source: "vault",
      priority: vk.priority || i + 1,
      isActive: vk.isActive !== false,
      status: vk.status,
      lastTested: vk.lastTested,
      lastLatencyMs: vk.lastLatencyMs,
      lastHttpStatus: vk.lastHttpStatus,
      lastError: vk.lastError,
    });
  }

  // 2. Fallback: Environment Variables (e.g. Vercel GROQ_API_KEY)
  const envGroq = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || process.env.GROQ_KEY;
  if (envGroq && typeof envGroq === "string" && envGroq.trim() && !envGroq.startsWith("MY_")) {
    const cleanEnvGroq = envGroq.trim();
    if (!seenKeys.has(cleanEnvGroq)) {
      candidates.push({
        id: "vault_groq_env",
        provider: "groq",
        label: "Groq Cloud (Vercel Environment)",
        apiKey: cleanEnvGroq,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        source: "env",
        priority: candidates.length + 1,
        isActive: true,
      });
      seenKeys.add(cleanEnvGroq);
    }
  }

  // 3. Fallback: Environment OpenAI if explicitly set
  const envOpenAI = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (envOpenAI && typeof envOpenAI === "string" && envOpenAI.trim() && !envOpenAI.startsWith("MY_")) {
    const cleanEnvOai = envOpenAI.trim();
    if (!seenKeys.has(cleanEnvOai)) {
      candidates.push({
        id: "vault_openai_env",
        provider: "openai",
        label: "OpenAI (Environment)",
        apiKey: cleanEnvOai,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        source: "env",
        priority: candidates.length + 1,
        isActive: true,
      });
      seenKeys.add(cleanEnvOai);
    }
  }

  // Filter out candidates on cooldown if requested
  if (options?.filterCooldown && options.cooldownMap) {
    const now = Date.now();
    const viable = candidates.filter((c) => {
      const cooldownUntil = options.cooldownMap!.get(c.id || c.apiKey) || 0;
      return now >= cooldownUntil;
    });
    if (viable.length > 0) {
      return viable;
    }
  }

  return candidates;
}

/**
 * Universal Probe Function used by both Health Check and Chat preflight.
 */
export async function probeCandidateKey(candidate: {
  provider: string;
  apiKey: string;
  model?: string;
}): Promise<{
  ok: boolean;
  httpStatus: number;
  latencyMs: number;
  error?: string;
  status: "healthy" | "invalid" | "rate_limited" | "error";
}> {
  const startTime = Date.now();
  const cleanKey = (candidate.apiKey || "").trim();
  const provider = (candidate.provider || "").toLowerCase().trim();

  if (!cleanKey) {
    return {
      ok: false,
      httpStatus: 400,
      latencyMs: 0,
      error: "API key is missing",
      status: "invalid",
    };
  }

  try {
    if (provider === "groq" || cleanKey.startsWith("gsk_")) {
      const targetModel = candidate.model || "llama-3.3-70b-versatile";
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      if (!groqRes.ok) {
        const errJson = await groqRes.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `Groq error HTTP ${groqRes.status}`;
        const cleaned = cleanHealthError(errMsg, "groq", targetModel);
        return {
          ok: false,
          httpStatus: groqRes.status,
          latencyMs,
          error: cleaned.message,
          status: cleaned.status,
        };
      }

      return {
        ok: true,
        httpStatus: groqRes.status,
        latencyMs,
        status: "healthy",
      };
    }

    if (provider === "openrouter" || cleanKey.startsWith("sk-or-")) {
      const targetModel = candidate.model || "meta-llama/llama-3.3-70b-instruct:free";
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      if (!orRes.ok) {
        const errJson = await orRes.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `OpenRouter error HTTP ${orRes.status}`;
        const cleaned = cleanHealthError(errMsg, "openrouter", targetModel);
        return {
          ok: false,
          httpStatus: orRes.status,
          latencyMs,
          error: cleaned.message,
          status: cleaned.status,
        };
      }

      return {
        ok: true,
        httpStatus: orRes.status,
        latencyMs,
        status: "healthy",
      };
    }

    if (provider === "gemini" || provider === "google-gemini" || cleanKey.startsWith("AIzaSy")) {
      if (!cleanKey.startsWith("AIzaSy")) {
        return {
          ok: false,
          httpStatus: 401,
          latencyMs: Date.now() - startTime,
          error: "Invalid Gemini API key format (must start with AIzaSy)",
          status: "invalid",
        };
      }
      const { GoogleGenAI } = await import("@google/genai");
      const targetModel = candidate.model || "gemini-2.0-flash";
      const ai = new GoogleGenAI({
        apiKey: cleanKey,
        httpOptions: { timeout: 15000 },
      });
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: "Ping",
      });
      const latencyMs = Date.now() - startTime;
      if (response && response.text) {
        return {
          ok: true,
          httpStatus: 200,
          latencyMs,
          status: "healthy",
        };
      }
      throw new Error("Empty response from Gemini");
    }

    // Default OpenAI or compatible
    const targetModel = candidate.model || "gpt-4o-mini";
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
      return {
        ok: false,
        httpStatus: oaiRes.status,
        latencyMs,
        error: cleaned.message,
        status: cleaned.status,
      };
    }

    return {
      ok: true,
      httpStatus: oaiRes.status,
      latencyMs,
      status: "healthy",
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const cleaned = cleanHealthError(err, provider, candidate.model);
    return {
      ok: false,
      httpStatus: (err?.status && typeof err.status === "number") ? err.status : 500,
      latencyMs,
      error: cleaned.message,
      status: cleaned.status,
    };
  }
}
