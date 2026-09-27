import type { Request, Response } from "express";

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

// In-memory ledger initialized with realistic portfolio transmutation chronicles
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

export default function auditLogsHandler(req: Request, res: Response) {
  if (req.method === "POST") {
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
  }

  // GET: Return all entries
  return res.status(200).json({
    ok: true,
    entries: auditLogLedger,
  });
}
