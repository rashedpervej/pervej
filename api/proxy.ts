import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { getStructuredPortfolioData } from "./_lib/chatKnowledge";
import { recordAuditLog, recordTokenUsage } from "./_lib/auditTracker";

export default async function proxyChatCompletionsHandler(req: Request, res: Response) {
  // Support CORS for external web apps calling from anywhere
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: { message: "Method Not Allowed. Use POST.", type: "invalid_request_error" },
    });
  }

  const startTime = Date.now();

  try {
    // 1. Authenticate Precious Master Key
    const authHeader = req.headers.authorization || (req.headers["x-api-key"] as string) || "";
    const bearerKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!bearerKey) {
      return res.status(401).json({
        error: {
          message: "Unauthorized: Missing API key. Provide Authorization: Bearer <master_key> header.",
          type: "invalid_request_error",
          code: "missing_api_key",
        },
      });
    }

    // 2. Load Vault Configuration and Master Key
    const structuredData = await getStructuredPortfolioData();
    const vault: any[] = Array.isArray(structuredData?.aiVault) ? structuredData.aiVault : [];
    const savedMasterKey = structuredData?.masterUnifiedKey || process.env.MASTER_UNIFIED_KEY || process.env.PRECIOUS_MASTER_KEY;

    if (!savedMasterKey) {
      return res.status(503).json({
        error: {
          message: "Precious Master Key has not been configured in Admin AI Vault yet.",
          type: "service_unavailable",
          code: "master_key_not_configured",
        },
      });
    }

    if (bearerKey !== savedMasterKey) {
      return res.status(401).json({
        error: {
          message: "Unauthorized: Invalid Master API Key provided.",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      });
    }

    // Extract OpenAI standard payload
    const { model, messages, temperature = 0.6, max_tokens = 1000 } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: { message: "Missing required 'messages' array in request body.", type: "invalid_request_error" },
      });
    }

    // Prepare Vault candidates
    const activeCandidates = vault
      .filter((k) => k && k.apiKey && k.isActive !== false)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));

    // Add env candidates as backstops if not already present
    if (process.env.GROQ_API_KEY && !activeCandidates.some((c) => c.apiKey === process.env.GROQ_API_KEY)) {
      activeCandidates.push({
        provider: "groq",
        apiKey: process.env.GROQ_API_KEY,
        model: "openai/gpt-oss-120b",
        label: "Groq Backstop",
      });
    }
    if (process.env.GEMINI_API_KEY && !activeCandidates.some((c) => c.apiKey === process.env.GEMINI_API_KEY)) {
      activeCandidates.push({
        provider: "gemini",
        apiKey: process.env.GEMINI_API_KEY,
        model: "gemini-3.8-flash",
        label: "Gemini Backstop",
      });
    }

    if (activeCandidates.length === 0) {
      return res.status(503).json({
        error: {
          message: "No active provider keys sealed in the Precious Vault. Please add a Groq or Gemini key in the Vault.",
          type: "vault_empty_error",
        },
      });
    }

    let completionText = "";
    let finalModel = model || "";
    let finalProvider = "";
    let totalTokens = 0;
    let lastError: any = null;

    // Route across Fallback Chain
    for (const candidate of activeCandidates) {
      const provider = (candidate.provider || "gemini").toLowerCase();
      const apiKey = candidate.apiKey;
      const targetModel = model || candidate.model || (provider === "groq" ? "openai/gpt-oss-120b" : "gemini-3.8-flash");

      try {
        if (provider === "groq" || provider === "openrouter" || provider === "openai" || provider === "cerebras" || provider === "mistral") {
          const endpoint =
            provider === "openrouter"
              ? "https://openrouter.ai/api/v1/chat/completions"
              : provider === "openai"
              ? "https://api.openai.com/v1/chat/completions"
              : provider === "cerebras"
              ? "https://api.cerebras.ai/v1/chat/completions"
              : provider === "mistral"
              ? "https://api.mistral.ai/v1/chat/completions"
              : "https://api.groq.com/openai/v1/chat/completions";

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: targetModel,
              messages: messages,
              temperature,
              max_completion_tokens: max_tokens,
            }),
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(`Provider ${provider} responded with status ${response.status}: ${JSON.stringify(errBody)}`);
          }

          const data = await response.json();
          completionText = data.choices?.[0]?.message?.content || "";
          totalTokens = data.usage?.total_tokens || 800;
          finalModel = targetModel;
          finalProvider = provider;
          break; // Success!
        } else {
          // Gemini provider
          const ai = new GoogleGenAI({ apiKey });
          const geminiModel = targetModel.includes("gemini") ? targetModel : "gemini-3.8-flash";

          // Format contents
          const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
          const conversationMessages = messages.filter((m: any) => m.role !== "system");

          const contents = conversationMessages.map((m: any) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content || "" }],
          }));

          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
            config: {
              systemInstruction: systemMsg || undefined,
              temperature,
              maxOutputTokens: max_tokens,
            },
          });

          completionText = response.text || "";
          totalTokens = response.usageMetadata?.totalTokenCount || 650;
          finalModel = geminiModel;
          finalProvider = "gemini";
          break; // Success!
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Precious Proxy Fallback]: Provider ${candidate.label || provider} failed. Trying next...`, err.message);
      }
    }

    if (!completionText) {
      throw lastError || new Error("All vault providers failed to process the request.");
    }

    const latencyMs = Date.now() - startTime;

    // Record token usage in capacity ledger
    recordTokenUsage(finalProvider, totalTokens);

    // Record audit chronicle
    const lastUserQuery = messages.filter((m: any) => m.role === "user").slice(-1)[0]?.content || "Proxy API Request";
    recordAuditLog({
      action: "chat_request",
      resourceType: "proxy_api",
      resourceId: `proxy_${Date.now()}`,
      metadata: {
        provider: finalProvider,
        model: finalModel,
        tokens: totalTokens,
        latencyMs,
        question: String(lastUserQuery).slice(0, 90),
      },
    });

    // Return Standard OpenAI Completion Format
    return res.status(200).json({
      id: `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: finalModel,
      provider: finalProvider,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: completionText,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: Math.round(totalTokens * 0.4),
        completion_tokens: Math.round(totalTokens * 0.6),
        total_tokens: totalTokens,
      },
    });
  } catch (error: any) {
    console.error("[Precious Proxy Error]:", error);
    return res.status(500).json({
      error: {
        message: error?.message || "Internal server error during proxy routing.",
        type: "internal_error",
      },
    });
  }
}
