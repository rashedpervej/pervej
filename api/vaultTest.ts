import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

export default async function vaultTestHandler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const { provider, apiKey, model } = req.body || {};

  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return res.status(400).json({ ok: false, error: "API Key is required" });
  }

  const cleanKey = apiKey.trim();
  const startTime = Date.now();

  try {
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
        return res.status(200).json({ ok: false, error: errMsg, latencyMs });
      }

      return res.status(200).json({
        ok: true,
        latencyMs,
        provider: "cerebras",
        model: targetModel,
        status: "Healthy",
      });
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
        return res.status(200).json({ ok: false, error: errMsg, latencyMs });
      }

      return res.status(200).json({
        ok: true,
        latencyMs,
        provider: "groq",
        model: targetModel,
        status: "Healthy",
      });
    }

    if (provider === "google-gemini" || provider === "gemini" || cleanKey.startsWith("AIzaSy") || cleanKey.startsWith("AQ.")) {
      // Auto-migrate any deprecated model requests (2.5, 2.0, 1.5) to active gemini-3.8-flash
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
        return res.status(200).json({
          ok: true,
          latencyMs,
          provider: "gemini",
          model: targetModel,
          status: "Healthy",
        });
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
        return res.status(200).json({ ok: false, error: errMsg, latencyMs });
      }

      return res.status(200).json({
        ok: true,
        latencyMs,
        provider: "mistral",
        model: targetModel,
        status: "Healthy",
      });
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
        return res.status(200).json({ ok: false, error: errMsg, latencyMs });
      }

      return res.status(200).json({
        ok: true,
        latencyMs,
        provider: "openrouter",
        model: targetModel,
        status: "Healthy",
      });
    }

    // Default: OpenAI or standard OpenAI-compatible endpoint
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
      return res.status(200).json({ ok: false, error: errMsg, latencyMs });
    }

    return res.status(200).json({
      ok: true,
      latencyMs,
      provider: "openai",
      model: targetModel,
      status: "Healthy",
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(200).json({
      ok: false,
      error: err?.message || "Connection failed",
      latencyMs,
    });
  }
}
