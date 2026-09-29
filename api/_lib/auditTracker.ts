import { getStructuredPortfolioData } from "./chatKnowledge.ts";

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
  } catch (e) {}

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

export const auditLogLedger: AuditLogEntry[] = [];

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
