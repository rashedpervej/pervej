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

import {
  cleanHealthError,
  probeCandidateKey,
  resolveActiveProviderChain,
} from "./_lib/centralKeyResolver.js";

export { cleanHealthError };

/* =========================================================================
   4. VAULT KEY TESTER LOGIC (Powered by Universal Central Probe)
   ========================================================================= */

async function testApiKey(provider: string, apiKey: string, model?: string) {
  const probe = await probeCandidateKey({
    provider,
    apiKey,
    model,
  });

  return {
    ...probe,
    provider,
    model: model || (provider === "groq" ? "llama-3.3-70b-versatile" : "default"),
    testedAt: Date.now(),
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
    // Require admin authentication for sensitive key testing, audit log operations, and usage data
    if (isTest || isAudit || isUsage) {
      const auth = await verifyAdminAuth(req, "Admin authentication required for Vault diagnostics, usage, and audit ledger.");
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
          if (!result.ok) {
            recordAuditLog({
              action: "key_probe_failed",
              resourceType: "key",
              resourceId: provider,
              metadata: {
                provider,
                model,
                httpStatus: result.httpStatus,
                status: result.status,
                error: result.error,
              },
            });
          }
          return res.status(200).json(result);
        } catch (err: any) {
          const cleaned = cleanHealthError(err, provider, model);
          recordAuditLog({
            action: "key_probe_failed",
            resourceType: "key",
            resourceId: provider,
            metadata: {
              provider,
              model,
              error: cleaned.message,
            },
          });
          return res.status(200).json({
            ok: false,
            status: cleaned.status,
            httpStatus: 500,
            error: cleaned.message,
            latencyMs: Date.now() - startTime,
            testedAt: Date.now(),
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
