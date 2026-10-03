import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePortfolio, AiVaultKey, AiRouterSettings } from "../context/PortfolioContext";
import { encryptVaultData, decryptVaultData, maskApiKey, isEncryptedVault } from "../utils/vaultCrypto";
import {
  Shield,
  Zap,
  Sparkles,
  Layers,
  Cpu,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Sliders,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Bot,
  Activity,
  Download,
  Search,
  Key,
  Flame,
  ChevronDown,
} from "lucide-react";

interface AdminAiVaultProps {
  isDemo?: boolean;
}

type TabMode = "keys" | "audit" | "tokens";
type Banner = { variant: "success" | "error" | "warn"; text: string };

interface ProviderMeta {
  id: string;
  name: string;
  riskLevel: "low" | "medium" | "high";
  freeTier?: boolean;
  keyless?: boolean;
  keySetupUrl: string;
  keySetupHint: string;
  keySetupLinkLabel?: string;
  docsAnchor?: string;
  defaultModel: string;
  models: { id: string; name: string }[];
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "groq",
    name: "Groq",
    riskLevel: "low",
    freeTier: true,
    keySetupUrl: "https://console.groq.com/keys",
    keySetupHint: "Sign up free → API Keys → Create. Keys start with gsk_",
    docsAnchor: "groq",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile (Active Flagship • High Bangla Support)" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant (Ultra-Fast Inference)" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B (High Reasoning)" },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://aistudio.google.com/apikey",
    keySetupHint: "Google AI Studio → Get API key → Create. Free tier available.",
    docsAnchor: "google-gemini",
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Active Flagship • Recommended)" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fast & Stable)" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Deep Multimodal)" },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    riskLevel: "low",
    freeTier: true,
    keySetupUrl: "https://cloud.cerebras.ai/platform",
    keySetupHint: "Sign up free → API Keys → Create. Very fast inference on Qwen3 235B.",
    docsAnchor: "cerebras",
    defaultModel: "gpt-oss-120b",
    models: [
      { id: "gpt-oss-120b", name: "GPT-OSS 120B (Active • High Reasoning)" },
      { id: "zai-glm-4.7", name: "GLM 4.7 Flash" },
      { id: "qwen-3-235b", name: "Qwen 3 235B (Ultra-Fast)" },
      { id: "llama-3.3-70b", name: "Llama 3.3 70B" },
    ],
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://dash.cloudflare.com/?to=/:account/ai/workers-ai",
    keySetupHint: "Paste key as account_id:api_token. Create token at Profile → API Tokens with Workers AI Read.",
    docsAnchor: "cloudflare",
    defaultModel: "@cf/moonshotai/kimi-k2.6",
    models: [
      { id: "@cf/moonshotai/kimi-k2.6", name: "Kimi K2.6" },
      { id: "@cf/zai-org/glm-4.7-flash", name: "GLM 4.7 Flash" },
      { id: "@cf/meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
      { id: "@cf/meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
    ],
  },
  {
    id: "github-models",
    name: "GitHub Models",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://github.com/settings/tokens",
    keySetupHint: "Create a classic PAT (Tokens → Generate new token → Generate new token (classic)). No extra scopes needed — the token just authenticates your GitHub account. Browse models at github.com/marketplace/models.",
    docsAnchor: "github-models",
    defaultModel: "openai/gpt-4.1",
    models: [
      { id: "openai/gpt-4.1", name: "GPT-4.1" },
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://openrouter.ai/keys",
    keySetupHint: "Sign up → Keys → Create (sk-or-…). Free models share global capacity — 429 during peak is common even with zero personal use.",
    docsAnchor: "openrouter",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)" },
      { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash Exp (Free)" },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)" },
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Instruct (Free)" },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    riskLevel: "low",
    freeTier: true,
    keySetupUrl: "https://console.mistral.ai/api-keys/",
    keySetupHint: "Create account → API Keys → Create new key.",
    docsAnchor: "mistral",
    defaultModel: "mistral-small-latest",
    models: [
      { id: "mistral-small-latest", name: "Mistral Small Latest" },
      { id: "mistral-large-latest", name: "Mistral Large Latest" },
      { id: "codestral-latest", name: "Codestral Latest" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    riskLevel: "medium",
    freeTier: false,
    keySetupUrl: "https://platform.openai.com/api-keys",
    keySetupHint: "💳 Requires billing — no free API tier. Add $5+ at platform.openai.com/account/billing, then create a new key. For free OpenAI models, use OpenRouter or GitHub Models instead.",
    docsAnchor: "openai",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
    ],
  },
  {
    id: "huggingface",
    name: "HuggingFace Router",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://huggingface.co/settings/tokens",
    keySetupHint: "Create a read token → Inference Providers router. ~$0.10/mo free credit.",
    docsAnchor: "huggingface",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    models: [
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3" },
      { id: "moonshotai/Kimi-K2-Instruct", name: "Kimi K2 Instruct" },
    ],
  },
  {
    id: "ollama-cloud",
    name: "Ollama Cloud",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://ollama.com/signin",
    keySetupHint: "Free plan: 1 concurrent model, GPU-time quota. Sign in → API key in settings.",
    docsAnchor: "ollama-cloud",
    defaultModel: "glm-4.7",
    models: [
      { id: "glm-4.7", name: "GLM 4.7" },
      { id: "kimi-k2", name: "Kimi K2" },
    ],
  },
  {
    id: "opencode",
    name: "OpenCode Zen",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://opencode.ai/auth",
    keySetupHint: "Free account (no card) → promotional models. Prompts may be used for training.",
    docsAnchor: "opencode",
    defaultModel: "deepseek-v4-flash",
    models: [
      { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    ],
  },
  {
    id: "zhipu",
    name: "Z.ai (Zhipu)",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    keySetupHint: "Register at open.bigmodel.cn → API Keys. GLM-4.5 / GLM-4.7 Flash free tier.",
    docsAnchor: "zhipu",
    defaultModel: "glm-4-flash",
    models: [
      { id: "glm-4-flash", name: "GLM-4 Flash" },
      { id: "glm-4.5-flash", name: "GLM-4.5 Flash" },
    ],
  },
  {
    id: "llm7",
    name: "LLM7",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://llm7.io",
    keySetupHint: "Free tier ~100 req/hr. Anonymous access works for basic models; optional API token.",
    docsAnchor: "llm7",
    defaultModel: "gpt-oss-20b",
    models: [
      { id: "gpt-oss-20b", name: "GPT-OSS 20B" },
      { id: "llama-3.1-turbo", name: "Llama 3.1 Turbo" },
    ],
  },
  {
    id: "cohere",
    name: "Cohere",
    riskLevel: "high",
    freeTier: true,
    keySetupUrl: "https://dashboard.cohere.com/api-keys",
    keySetupHint: "Trial tier available. ToS restricts personal/household use — local-only in Precious.",
    docsAnchor: "cohere",
    defaultModel: "command-r-plus-08-2024",
    models: [
      { id: "command-r-plus-08-2024", name: "Command R+ (08-2024)" },
    ],
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    riskLevel: "high",
    freeTier: true,
    keySetupUrl: "https://build.nvidia.com/",
    keySetupHint: "Evaluation-only ToS. Generate API key at build.nvidia.com. Local-only in Precious.",
    docsAnchor: "nvidia",
    defaultModel: "meta/llama-3.1-70b-instruct",
    models: [
      { id: "meta/llama-3.1-70b-instruct", name: "Llama 3.1 70B Instruct" },
    ],
  },
  {
    id: "pollinations",
    name: "Pollinations",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://pollinations.ai",
    keySetupLinkLabel: "Pollinations docs →",
    keySetupHint: "Anonymous tier — no API key needed. GPT-OSS 20B, rate-limited.",
    keyless: true,
    docsAnchor: "pollinations",
    defaultModel: "openai-fast",
    models: [
      { id: "openai-fast", name: "OpenAI Fast (Keyless)" },
    ],
  },
  {
    id: "kilo",
    name: "Kilo Gateway",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://kilo.ai",
    keySetupLinkLabel: "Kilo Gateway docs →",
    keySetupHint: "Anonymous :free routes (~200 req/hr per IP). Prompts logged for training.",
    keyless: true,
    docsAnchor: "kilo",
    defaultModel: "kilo/free",
    models: [
      { id: "kilo/free", name: "Kilo Free (Keyless)" },
    ],
  },
  {
    id: "openai-compat",
    name: "Custom OpenAI-compatible",
    riskLevel: "medium",
    freeTier: true,
    keySetupUrl: "https://docs.ollama.com/api/openai-compatibility",
    keySetupLinkLabel: "Ollama OpenAI API docs →",
    keySetupHint: "Runs on your machine (Ollama, LM Studio, etc.). No cloud signup — install the server, pull a model, then paste the base URL below.",
    docsAnchor: "custom",
    defaultModel: "llama3.2",
    models: [
      { id: "llama3.2", name: "llama3.2" },
    ],
  },
];

interface ProviderUsageSegment {
  providerId: string;
  label: string;
  weightPercent: number;
  usedFraction: number;
  remainingFraction: number;
  tokensToday: number;
  tokenBudget: number;
  source?: "live" | "estimated";
}

interface UsageSummary {
  segments: ProviderUsageSegment[];
  totalDailyLimit: number;
  totalTokensToday: number;
  totalTokenBudget: number;
  metric: "tokens";
  resetsDayAt: number | null;
}

export const PROVIDER_TOKEN_BUDGETS: Record<string, number> = {
  groq: 500_000,
  gemini: 1_500_000,
  "google-gemini": 1_500_000,
  cerebras: 1_000_000,
  cloudflare: 500_000,
  "github-models": 500_000,
  openrouter: 100_000,
  mistral: 500_000,
  openai: 100_000,
  huggingface: 100_000,
  "ollama-cloud": 100_000,
  opencode: 50_000,
  zhipu: 200_000,
  llm7: 100_000,
  cohere: 100_000,
  nvidia: 50_000,
  pollinations: 100_000,
  kilo: 200_000,
  "openai-compat": 100_000_000,
};

export const PROVIDER_BAR_COLORS: Record<string, { charge: string; drained: string; ring: string }> = {
  gemini: { charge: "bg-amber-400", drained: "bg-amber-950/80", ring: "ring-amber-500/40" },
  "google-gemini": { charge: "bg-amber-400", drained: "bg-amber-950/80", ring: "ring-amber-500/40" },
  groq: { charge: "bg-fuchsia-400", drained: "bg-fuchsia-950/80", ring: "ring-fuchsia-500/40" },
  cerebras: { charge: "bg-rose-400", drained: "bg-rose-950/80", ring: "ring-rose-500/40" },
  cloudflare: { charge: "bg-yellow-400", drained: "bg-yellow-950/80", ring: "ring-yellow-500/40" },
  "github-models": { charge: "bg-purple-400", drained: "bg-purple-950/80", ring: "ring-purple-500/40" },
  openrouter: { charge: "bg-violet-400", drained: "bg-violet-950/80", ring: "ring-violet-500/40" },
  mistral: { charge: "bg-orange-400", drained: "bg-orange-950/80", ring: "ring-orange-500/40" },
  openai: { charge: "bg-teal-400", drained: "bg-teal-950/80", ring: "ring-teal-500/40" },
  "openai-compat": { charge: "bg-sky-400", drained: "bg-sky-950/80", ring: "ring-sky-500/40" },
  huggingface: { charge: "bg-indigo-400", drained: "bg-indigo-950/80", ring: "ring-indigo-500/40" },
  "ollama-cloud": { charge: "bg-cyan-400", drained: "bg-cyan-950/80", ring: "ring-cyan-500/40" },
};

export function getProviderBarColor(providerId: string) {
  const norm = providerId.toLowerCase().replace("google-", "");
  return PROVIDER_BAR_COLORS[providerId] || PROVIDER_BAR_COLORS[norm] || {
    charge: "bg-emerald-400",
    drained: "bg-emerald-950/80",
    ring: "ring-emerald-500/40",
  };
}

export function buildUsageSummaryFromKeys(
  vaultKeys: AiVaultKey[],
  liveUsage?: Record<string, number>
): UsageSummary {
  const byProvider = new Map<
    string,
    {
      keyCount: number;
      tokenBudget: number;
      tokensToday: number;
      label: string;
    }
  >();

  const activeKeys = vaultKeys.filter((k) => k && k.isActive !== false);

  for (const k of activeKeys) {
    const norm = (k.provider || "gemini").toLowerCase().replace("google-", "");
    const providerMeta = PROVIDERS.find((p) => p.id === k.provider || (p.id === "google-gemini" && norm === "gemini"));
    const budget = PROVIDER_TOKEN_BUDGETS[k.provider] || PROVIDER_TOKEN_BUDGETS[norm] || 500_000;
    const existing = byProvider.get(norm) ?? {
      keyCount: 0,
      tokenBudget: 0,
      tokensToday: liveUsage?.[norm] ?? 0,
      label: providerMeta?.name || norm.charAt(0).toUpperCase() + norm.slice(1),
    };
    existing.keyCount += 1;
    existing.tokenBudget += budget; // ACCUMULATES PER KEY (Primary + Backup keys scale budget!)
    byProvider.set(norm, existing);
  }

  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const resetsDayAt = nextMidnight.getTime();

  // If no keys in vault yet, return empty
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
      label: v.label,
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

function formatReset(ms: number | null): string {
  if (ms == null) return "resets in 7h 11m (06:00 AM BST)";
  const diff = ms - Date.now();
  if (diff <= 0) return "resets soon (06:00 AM BST)";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `resets in ${h}h ${m}m (06:00 AM BST)`;
  return `resets in ${m}m (06:00 AM BST)`;
}

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: {
    provider?: string;
    model?: string;
    tokens?: number;
    latencyMs?: number;
    question?: string;
    error?: string;
    failoverFrom?: string;
    attempts?: number;
    streamFailed?: boolean;
    keyLabel?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
}

export default function AdminAiVault({ isDemo = false }: AdminAiVaultProps) {
  const { siteSettings, setSiteSettings, refreshData } = usePortfolio();

  // Navigation Tabs: Keys, Audit, Tokens
  const [activeTab, setActiveTab] = useState<TabMode>("keys");

  // Master Chatbot Toggle
  const [enableChatbot, setEnableChatbot] = useState(siteSettings.enableChatbot !== false);

  // Vault Keys & Router State
  const [aiVault, setAiVault] = useState<AiVaultKey[]>(() => {
    if (Array.isArray(siteSettings.aiVault) && siteSettings.aiVault.length > 0) {
      return siteSettings.aiVault;
    }
    const currentKey = siteSettings.aiApiKey || (siteSettings as any).geminiApiKey || "";
    if (currentKey) {
      const isGroq = currentKey.startsWith("gsk_");
      return [
        {
          id: "vault_seed_1",
          provider: isGroq ? "groq" : "gemini",
          label: isGroq ? "Groq (Llama 3.3 70B Active)" : "Google Gemini Flash",
          apiKey: currentKey,
          model: isGroq ? "llama-3.3-70b-versatile" : "gemini-2.0-flash",
          isActive: true,
          priority: 1,
          status: "healthy",
        },
      ];
    }
    return [];
  });

  const [aiRouterSettings, setAiRouterSettings] = useState<AiRouterSettings>(() => {
    return siteSettings.aiRouterSettings || { cooldownSeconds: 30, temperature: 0.55, maxTokens: 1500, contextMode: "compact", selectedModel: "auto" };
  });

  // Model Selection Dropdown State (Matching Hall of Keys requirement)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasGroqKey = aiVault.some((k) => (k.provider === "groq" || k.apiKey?.startsWith("gsk_")) && k.isActive);
  // Dynamic model options derived from active keys in aiVault and configured providers
  const modelOptions = useMemo(() => {
    const list: Array<{ id: string; label: string; provider: string; hasClip: boolean }> = [
      { id: "auto", label: "AUTO (BEST AVAILABLE)", provider: "auto", hasClip: false },
    ];

    // 1. Gather all models directly configured on sealed active keys in the vault
    aiVault.forEach((k) => {
      if (k.isActive && k.model) {
        const fullId = `${k.provider}:${k.model}`;
        if (!list.some((item) => item.id.toLowerCase() === fullId.toLowerCase())) {
          list.push({
            id: fullId,
            label: `${k.provider.toUpperCase()} · ${k.model.toUpperCase()}`,
            provider: k.provider,
            hasClip: true,
          });
        }
      }
    });

    // 2. Also populate known models for any active provider in vault
    PROVIDERS.forEach((prov) => {
      const hasKeyForProvider = aiVault.some(
        (k) => (k.provider === prov.id || (prov.id === "google-gemini" && k.provider === "gemini")) && k.isActive
      );
      if (hasKeyForProvider && Array.isArray(prov.models)) {
        prov.models.forEach((m) => {
          const providerTag = prov.id === "google-gemini" ? "gemini" : prov.id;
          const fullId = `${providerTag}:${m.id}`;
          if (!list.some((item) => item.id.toLowerCase() === fullId.toLowerCase())) {
            list.push({
              id: fullId,
              label: `${providerTag.toUpperCase()} · ${m.name.toUpperCase()}`,
              provider: providerTag,
              hasClip: true,
            });
          }
        });
      }
    });

    return list;
  }, [aiVault]);

  const currentSelectedModelId = aiRouterSettings?.selectedModel || "auto";
  const selectedModelOption = modelOptions.find((o) => o.id.toLowerCase() === currentSelectedModelId.toLowerCase()) || modelOptions[0];

  const handleSelectModel = async (optionId: string, optionLabel: string) => {
    setIsModelDropdownOpen(false);
    const nextSettings: AiRouterSettings = {
      ...aiRouterSettings,
      selectedModel: optionId,
    };
    setAiRouterSettings(nextSettings);
    await persistVault(
      aiVault,
      nextSettings,
      enableChatbot,
      `Active AI model set to ${optionLabel}!`,
      unifiedKey
    );
  };

  // Unified Key (Precious-Style Master Token)
  // Only revealed on screen in-memory when forged until the next page reload!
  const [recentlyForgedKey, setRecentlyForgedKey] = useState<string | null>(null);
  const [unifiedKey, setUnifiedKey] = useState<string | null>(() => {
    if (siteSettings?.masterUnifiedKey) {
      return siteSettings.masterUnifiedKey;
    }
    return null;
  });

  // Vault Capacity Usage Summary State (Authentic Precious Meter)
  const [liveTokenStats, setLiveTokenStats] = useState<Record<string, number>>({});
  const [healthSummary, setHealthSummary] = useState<string | null>(null);

  // Dynamically reactive to any key additions, backup keys, or changes in aiVault
  const usageSummary = useMemo(() => {
    return buildUsageSummaryFromKeys(aiVault, liveTokenStats);
  }, [aiVault, liveTokenStats]);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/vault?type=usage");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.segments) && data.segments.length > 0) {
          const stats: Record<string, number> = {};
          data.segments.forEach((s: any) => {
            if (s && s.providerId) {
              stats[s.providerId] = s.tokensToday;
            }
          });
          setLiveTokenStats((prev) => ({ ...prev, ...stats }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 15000);
    return () => clearInterval(interval);
  }, []);

  // UI Alerts & Diagnostic State
  const [banner, setBanner] = useState<Banner | null>(null);
  const [probingAll, setProbingAll] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Seal New Key Form
  const [addMode, setAddMode] = useState<"new" | "backup">("new");
  const [sealProviderId, setSealProviderId] = useState("groq");
  const [sealLabel, setSealLabel] = useState("");
  const [sealModel, setSealModel] = useState("llama-3.3-70b-versatile");
  const [sealApiKey, setSealApiKey] = useState("");
  const [sealCloudflareAccountId, setSealCloudflareAccountId] = useState("");
  const [sealCustomBaseUrl, setSealCustomBaseUrl] = useState("");
  const [showSealKey, setShowSealKey] = useState(false);
  const addSectionRef = useRef<HTMLElement>(null);

  // Inline Replace Key State
  const [replacingKeyId, setReplacingKeyId] = useState<string | null>(null);
  const [replaceForm, setReplaceForm] = useState({ label: "", apiKey: "", model: "" });

  // Audit Chronicles State
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditSearch, setAuditSearch] = useState("");

  const keysSectionRef = useRef<HTMLElement>(null);
  const selectedProviderMeta = PROVIDERS.find((p) => p.id === sealProviderId) ?? PROVIDERS[0];
  const hasProviderKeys = aiVault.length > 0;

  const startBackup = (providerId: string) => {
    setAddMode("backup");
    const matchedId = providerId === "google-gemini" ? "gemini" : providerId;
    setSealProviderId(matchedId);
    const pMeta = PROVIDERS.find((p) => p.id === matchedId || (matchedId === "gemini" && p.id === "google-gemini"));
    if (pMeta) {
      setSealModel(pMeta.defaultModel);
      setSealLabel(`${pMeta.name} Backup`);
    } else {
      setSealLabel(`${matchedId} backup`);
    }
    setSealApiKey("");
    setSealCloudflareAccountId("");
    setSealCustomBaseUrl("");
    setReplacingKeyId(null);
    addSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Sync state on remote update
  // Sync state on remote update with automatic AES-256-GCM decryption
  useEffect(() => {
    setEnableChatbot(siteSettings.enableChatbot !== false);
    if (siteSettings.masterUnifiedKey && !unifiedKey) {
      setUnifiedKey(siteSettings.masterUnifiedKey);
    }
    if (siteSettings.aiRouterSettings) {
      setAiRouterSettings(siteSettings.aiRouterSettings);
    }

    let isSubscribed = true;
    async function resolveVault() {
      let rawEnc = (siteSettings as any)?.encrypted_ai_vault || (siteSettings as any)?.aiVault;
      if (!rawEnc && supabase) {
        try {
          const { data } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "encrypted_ai_vault")
            .maybeSingle();
          if (data?.value) {
            rawEnc = data.value;
          }
        } catch (_) {}
      }
      if (typeof rawEnc === "string" && isEncryptedVault(rawEnc)) {
        try {
          const dec = await decryptVaultData(rawEnc);
          if (isSubscribed && Array.isArray(dec) && dec.length > 0) {
            setAiVault(dec);
            return;
          }
        } catch (e) {
          console.warn("[AdminAiVault] Could not decrypt vault from siteSettings:", e);
        }
      }
      if (isSubscribed && Array.isArray(siteSettings.aiVault) && siteSettings.aiVault.length > 0) {
        setAiVault(siteSettings.aiVault);
      }
    }
    resolveVault();

    return () => {
      isSubscribed = false;
    };
  }, [siteSettings]);

  // Helper to retrieve authenticated headers for Admin API operations
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      } catch {}
    }
    return headers;
  };

  // Fetch Audit Chronicles with Supabase DB integration & live merging
  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      // 1. Fetch live in-memory logs from API router
      let apiEntries: AuditEntry[] = [];
      try {
        const authHeaders = await getAuthHeaders();
        const res = await fetch("/api/vault?type=audit", { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.entries)) {
            apiEntries = data.entries;
          }
        }
      } catch {}

      // 2. Fetch from Supabase site_settings and chatbot_interactions
      let dbEntries: AuditEntry[] = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: vaultLogSetting } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "ai_audit_logs")
            .maybeSingle();

          if (vaultLogSetting?.value) {
            try {
              const parsed = JSON.parse(vaultLogSetting.value);
              if (Array.isArray(parsed)) {
                dbEntries.push(...parsed);
              }
            } catch {}
          }
        } catch {}

        try {
          const { data: chatInteractions } = await supabase
            .from("chatbot_interactions")
            .select("*")
            .order("timestamp", { ascending: false })
            .limit(100);

          if (Array.isArray(chatInteractions)) {
            chatInteractions.forEach((row: any) => {
              const createdTime = row.timestamp || row.created_at || new Date().toISOString();
              const isError = !row.answer || row.response_source?.toLowerCase().includes("error") || row.response_source?.toLowerCase().includes("hiccup");
              const hasFailover = row.response_source?.toLowerCase().includes("failover") || Boolean(row.failover_from);
              const failoverMatch = row.response_source?.match(/failover from ([^)]+)/i);
              const extractedFailover = failoverMatch ? failoverMatch[1] : (hasFailover ? "primary provider" : undefined);

              dbEntries.push({
                id: `db_chat_${row.id || row.conversation_id || Math.random()}`,
                action: "chat_request",
                resourceType: "chat",
                resourceId: row.conversation_id || null,
                metadata: {
                  provider: row.response_source?.toLowerCase().replace(/\s*\(failover.*\)/i, "").trim() || "groq",
                  model: row.response_source?.toLowerCase() === "gemini" ? "gemini-2.0-flash" : "llama-3.3-70b-versatile",
                  tokens: row.token_usage || 0,
                  latencyMs: row.response_time_ms || 0,
                  question: row.question,
                  error: isError ? "Stream interrupted" : undefined,
                  failoverFrom: row.failover_from || extractedFailover,
                  attempts: hasFailover ? 2 : 1,
                },
                createdAt: createdTime,
              });
            });
          }
        } catch {}
      }

      // Merge and deduplicate by ID
      const map = new Map<string, AuditEntry>();
      [...apiEntries, ...dbEntries].forEach((e) => {
        if (e && e.id && !map.has(e.id)) {
          map.set(e.id, e);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setAuditEntries(merged);
    } catch {
      // Fallback
    } finally {
      setAuditLoading(false);
    }
  };

  const persistAuditLog = async (entry: Omit<AuditEntry, "id" | "createdAt">) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: `chronicle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    // 1. Post to API router
    try {
      const authHeaders = await getAuthHeaders();
      await fetch("/api/vault", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(newEntry),
      });
    } catch {}

    // 2. Persist to Supabase site_settings
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "ai_audit_logs")
          .maybeSingle();

        let currentLogs: AuditEntry[] = [];
        if (data?.value) {
          try {
            currentLogs = JSON.parse(data.value);
          } catch {}
        }
        currentLogs.unshift(newEntry);
        if (currentLogs.length > 200) currentLogs = currentLogs.slice(0, 200);

        await supabase
          .from("site_settings")
          .upsert({ key: "ai_audit_logs", value: JSON.stringify(currentLogs) }, { onConflict: "key" });
      } catch (e) {
        console.warn("[Audit Sync] Supabase audit upsert warning:", e);
      }
    }

    fetchAuditLogs();
  };

  const showBanner = (variant: Banner["variant"], text: string) => {
    setBanner({ variant, text });
    setTimeout(() => setBanner(null), 5000);
  };

  // Save to Database Helper with Military-Grade AES-256-GCM Encryption
  const persistVault = async (
    updatedVault: AiVaultKey[],
    updatedRouter = aiRouterSettings,
    updatedChatbot = enableChatbot,
    successMsg?: string,
    newMasterKey?: string
  ) => {
    setIsSaving(true);
    const masterToSave = newMasterKey || unifiedKey || siteSettings.masterUnifiedKey || "";

    // 1. Encrypt vault using AES-256-GCM
    let encryptedVaultStr = "";
    try {
      encryptedVaultStr = await encryptVaultData(updatedVault);
    } catch (err: any) {
      setIsSaving(false);
      showBanner("error", `Encryption failed: ${err.message}`);
      return;
    }

    const updated = {
      enableChatbot: updatedChatbot,
      aiVault: updatedVault,
      encrypted_ai_vault: encryptedVaultStr,
      aiRouterSettings: updatedRouter,
      masterUnifiedKey: masterToSave,
    };

    setSiteSettings((prev) => {
      const next = { ...prev, ...updated };
      try {
        // Security sanitization: NEVER write raw plaintext keys to browser localStorage
        const safeSettings = {
          ...next,
          aiVault: [],
          masterUnifiedKey: "",
        };
        localStorage.setItem("portfolio_site_settings", JSON.stringify(safeSettings));
      } catch (e) {}
      return next;
    });

    if (isDemo || !isSupabaseConfigured || !supabase) {
      setTimeout(() => {
        setIsSaving(false);
        if (successMsg) showBanner("success", successMsg);
      }, 300);
      return;
    }

    try {
      // Payload: Store ONLY encrypted_ai_vault in the database! Never plaintext!
      const payload = [
        { key: "enableChatbot", value: updatedChatbot },
        { key: "aiRouterSettings", value: JSON.stringify(updatedRouter) },
        { key: "encrypted_ai_vault", value: encryptedVaultStr },
        { key: "masterUnifiedKey", value: masterToSave },
      ];

      for (const row of payload) {
        const { error: upsertErr } = await supabase
          .from("site_settings")
          .upsert({ key: row.key, value: row.value }, { onConflict: "key" });
        if (upsertErr) {
          console.error(`[AdminAiVault] Supabase upsert error for ${row.key}:`, upsertErr);
          throw upsertErr;
        }
      }

      await refreshData();
      if (successMsg) showBanner("success", successMsg);
    } catch (err: any) {
      showBanner("error", `Failed to save to database: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Master Bot Toggle Handler
  const handleToggleChatbot = async () => {
    const nextVal = !enableChatbot;
    setEnableChatbot(nextVal);
    await persistVault(aiVault, aiRouterSettings, nextVal, nextVal ? "Chatbot activated across portfolio!" : "Chatbot deactivated.");
  };

  // Move priority in Fallback Chain (▲ / ▼)
  const moveChain = async (index: number, dir: -1 | 1) => {
    const swap = index + dir;
    if (swap < 0 || swap >= aiVault.length) return;
    const next = [...aiVault];
    const temp = next[index];
    next[index] = next[swap];
    next[swap] = temp;
    const reordered = next.map((item, idx) => ({ ...item, priority: idx + 1 }));
    setAiVault(reordered);
    await persistVault(reordered, aiRouterSettings, enableChatbot, "Fallback chain priority updated.");
  };

  // Test single key connection with latency ping
  const testKey = async (keyItem: AiVaultKey) => {
    setTestingKeyId(keyItem.id);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/vault", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          action: "test",
          provider: keyItem.provider,
          apiKey: keyItem.apiKey,
          model: keyItem.model,
        }),
      });
      const data = await res.json();
      const keyStatus = data.ok ? "healthy" : (data.status === "rate_limited" ? "rate_limited" : "error");
      const updatedVault = aiVault.map((k) =>
        k.id === keyItem.id
          ? {
              ...k,
              status: keyStatus as any,
              lastLatencyMs: data.latencyMs,
              lastError: data.ok ? undefined : (data.error || "Connection failed"),
              lastTested: new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " BST",
            }
          : k
      );
      setAiVault(updatedVault);
      if (data.ok) {
        showBanner("success", `${keyItem.label} ping verified! Roundtrip latency: ${data.latencyMs}ms`);
      } else if (data.status === "rate_limited") {
        showBanner("warn", `${keyItem.label}: ${data.error || "Rate limited. Temporary quota exhausted."}`);
      } else {
        showBanner("error", `${keyItem.label} test failed: ${data.error || "Endpoint unreachable"}`);
      }
      await persistVault(updatedVault, aiRouterSettings, enableChatbot);
    } catch (err: any) {
      showBanner("error", `${keyItem.label} test failed: ${err.message}`);
    } finally {
      setTestingKeyId(null);
    }
  };

  // Run Health Check on ALL keys
  const runHealthCheck = async () => {
    setProbingAll(true);
    try {
      const authHeaders = await getAuthHeaders();
      const updatedVault = [...aiVault];
      for (let i = 0; i < updatedVault.length; i++) {
        const k = updatedVault[i];
        try {
          const res = await fetch("/api/vault", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              action: "test",
              provider: k.provider,
              apiKey: k.apiKey,
              model: k.model,
            }),
          });
          const data = await res.json();
          const keyStatus = data.ok ? "healthy" : (data.status === "rate_limited" ? "rate_limited" : "error");
          updatedVault[i] = {
            ...k,
            status: keyStatus,
            lastLatencyMs: data.latencyMs,
            lastError: data.ok ? undefined : data.error,
            lastTested: new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " BST",
          };
        } catch {
          updatedVault[i] = { ...k, status: "error" };
        }
      }
      setAiVault(updatedVault);
      showBanner("success", "Health check complete. All provider keys pinged.");
      await persistVault(updatedVault, aiRouterSettings, enableChatbot);
    } finally {
      setProbingAll(false);
    }
  };

  // Seal / Add Key to Vault
  const handleSealKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const providerObj = PROVIDERS.find((p) => p.id === sealProviderId) ?? PROVIDERS[0];

    let effectiveApiKey = sealApiKey.trim();
    if (sealProviderId === "cloudflare") {
      if (!sealCloudflareAccountId.trim() || !effectiveApiKey) {
        showBanner("error", "Both Cloudflare Account ID and API Token are required.");
        return;
      }
      effectiveApiKey = `${sealCloudflareAccountId.trim()}:${effectiveApiKey}`;
    } else if (sealProviderId === "openai-compat") {
      if (!effectiveApiKey) {
        effectiveApiKey = "ollama";
      }
    } else if (providerObj.keyless) {
      if (!effectiveApiKey) {
        effectiveApiKey = "anonymous";
      }
    } else if (!effectiveApiKey) {
      showBanner("error", "API Key cannot be empty.");
      return;
    }

    const newEntry: AiVaultKey = {
      id: `vault_${Date.now()}`,
      provider: sealProviderId as any,
      label: sealLabel.trim() || (addMode === "backup" ? `${providerObj.name} Backup` : `${providerObj.name} Primary`),
      apiKey: effectiveApiKey,
      model: sealModel.trim() || providerObj.defaultModel,
      isActive: true,
      priority: aiVault.length + 1,
      status: "healthy",
      lastTested: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    const nextVault = [...aiVault, newEntry];
    setAiVault(nextVault);
    setSealApiKey("");
    setSealLabel("");
    setSealCloudflareAccountId("");
    setSealCustomBaseUrl("");
    await persistVault(nextVault, aiRouterSettings, enableChatbot, `Key "${newEntry.label}" sealed into vault successfully!`);

    // Log chronicle to DB
    persistAuditLog({
      action: "key_created",
      resourceType: "key",
      resourceId: newEntry.id,
      metadata: { providerId: newEntry.provider, keyLabel: newEntry.label, model: newEntry.model },
    });
  };

  // Replace existing key
  const handleReplaceKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingKeyId || !replaceForm.apiKey.trim()) return;

    const targetKey = aiVault.find((k) => k.id === replacingKeyId);
    const nextVault = aiVault.map((k) =>
      k.id === replacingKeyId
        ? {
            ...k,
            label: replaceForm.label.trim() || k.label,
            apiKey: replaceForm.apiKey.trim(),
            model: replaceForm.model.trim() || k.model,
            status: "healthy" as const,
            lastTested: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          }
        : k
    );

    setAiVault(nextVault);
    setReplacingKeyId(null);
    setReplaceForm({ label: "", apiKey: "", model: "" });
    await persistVault(nextVault, aiRouterSettings, enableChatbot, "Key credentials successfully replaced!");

    persistAuditLog({
      action: "key_updated",
      resourceType: "key",
      resourceId: replacingKeyId,
      metadata: { providerId: targetKey?.provider, keyLabel: replaceForm.label.trim() || targetKey?.label },
    });
  };

  // Remove key
  const handleDeleteKey = async (id: string) => {
    const target = aiVault.find((k) => k.id === id);
    if (!window.confirm(`Are you sure you want to remove "${target?.label || "this key"}" from the Vault?`)) {
      return;
    }
    const nextVault = aiVault.filter((k) => k.id !== id).map((item, idx) => ({ ...item, priority: idx + 1 }));
    setAiVault(nextVault);
    await persistVault(nextVault, aiRouterSettings, enableChatbot, "Key removed from vault.");

    // Log chronicle to DB
    persistAuditLog({
      action: "key_deleted",
      resourceType: "key",
      resourceId: id,
      metadata: { providerId: target?.provider, keyLabel: target?.label },
    });
  };

  // Forge Unified prec_ Key
  const generateUnifiedKey = async () => {
    if (!hasProviderKeys) {
      showBanner("warn", "Seal at least one provider key before forging a unified prec_ key.");
      return;
    }
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newKey = `prec_live_${randomHex}`;
    setRecentlyForgedKey(newKey);
    setUnifiedKey(newKey);
    await persistVault(aiVault, aiRouterSettings, enableChatbot, "Master unified prec_ key forged and sealed in Vault!", newKey);

    // Log chronicle to DB
    persistAuditLog({
      action: "unified_key_created",
      resourceType: "key",
      resourceId: "prec_master",
      metadata: { keyLabel: "Unified Master Key" },
    });
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Filtered audit entries
  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditEntries;
    return auditEntries.filter((e) => {
      const p = e.metadata?.provider?.toLowerCase() || "";
      const m = e.metadata?.model?.toLowerCase() || "";
      const quest = e.metadata?.question?.toLowerCase() || "";
      const act = e.action.toLowerCase();
      return p.includes(q) || m.includes(q) || quest.includes(q) || act.includes(q);
    });
  }, [auditEntries, auditSearch]);

  const auditStats = useMemo(() => {
    const chat = auditEntries.filter((e) => e.action === "chat_request");
    const failed = chat.filter((e) => e.metadata?.error || e.metadata?.streamFailed).length;
    const success = Math.max(chat.length - failed, 0);
    const reliability = chat.length === 0 ? null : Math.round((success / chat.length) * 1000) / 10;
    const tokenFlux = chat.reduce((acc, curr) => acc + (curr.metadata?.tokens || 0), 0);
    const failovers = chat.filter((e) => !!(e.metadata?.failoverFrom || e.metadata?.streamFailed || (typeof e.metadata?.attempts === "number" && e.metadata.attempts > 1))).length;
    return { reliability, tokenFlux, failovers, total: chat.length };
  }, [auditEntries]);

  const exportAuditJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredAudit, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `precious-chronicles-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-12 space-y-7 animate-fade-in text-[#dce4e0]">
      {/* Top Header with Precious Tab Bar and Master Bot Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#0d3b2e]/60">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4a853]/70 font-cinzel">HALL OF KEYS</p>
          <h1 className="font-cinzel text-2xl md:text-3xl text-[#f2c36b] gold-glow tracking-wide mt-0.5">THE VAULT</h1>
        </div>

        {/* Precious Style Pill Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#08100e]/90 border border-[#0d3b2e]/60 rounded-xl overflow-x-auto shrink-0 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab("keys")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-cinzel transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "keys"
                ? "bg-gradient-to-r from-[#0d3b2e] to-[#112820] text-[#f2c36b] border border-[#d4a853]/40 shadow-sm"
                : "text-[#8aab9a] hover:text-[#dce4e0] hover:bg-[#0d1513]"
            }`}
          >
            Hall of Keys
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-cinzel transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "audit"
                ? "bg-gradient-to-r from-[#0d3b2e] to-[#112820] text-[#f2c36b] border border-[#d4a853]/40 shadow-sm"
                : "text-[#8aab9a] hover:text-[#dce4e0] hover:bg-[#0d1513]"
            }`}
          >
            Audit Chronicles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tokens")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-cinzel transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "tokens"
                ? "bg-gradient-to-r from-[#0d3b2e] to-[#112820] text-[#f2c36b] border border-[#d4a853]/40 shadow-sm"
                : "text-[#8aab9a] hover:text-[#dce4e0] hover:bg-[#0d1513]"
            }`}
          >
            Token Settings
          </button>
        </div>

        {/* Master Chatbot Toggle */}
        <div className="flex items-center gap-3 bg-[#0d1513] border border-[#0d3b2e]/60 px-3 py-1.5 rounded-xl shadow-xs shrink-0">
          <Bot className={`w-4 h-4 ${enableChatbot ? "text-[#f2c36b]" : "text-[#8aab9a]"}`} />
          <div className="text-left">
            <span className="text-[11px] font-semibold text-[#dce4e0] block leading-tight">Chatbot Engine</span>
            <span className={`text-[9px] font-mono ${enableChatbot ? "text-emerald-400" : "text-[#8aab9a]"}`}>
              {enableChatbot ? "Online • Active" : "Disabled"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleChatbot}
            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-all outline-none cursor-pointer ${
              enableChatbot ? "bg-[#d4a853] justify-end shadow-sm shadow-[#d4a853]/30" : "bg-[#161d1b] border border-[#0d3b2e] justify-start"
            }`}
          >
            <div className={`w-4 h-4 rounded-full shadow-xs ${enableChatbot ? "bg-[#0d1513]" : "bg-[#8aab9a]"}`} />
          </button>
        </div>
      </div>

      {/* Banner Toast Notification */}
      {banner && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-fade-in ${
            banner.variant === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : banner.variant === "warn"
                ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                : "bg-red-950/60 border-red-500/40 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.variant === "success" ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : banner.variant === "warn" ? (
              <Flame className="w-4 h-4 shrink-0 text-amber-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{banner.text}</span>
          </div>
          <button onClick={() => setBanner(null)} className="text-[#8aab9a] hover:text-white text-xs font-mono">
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: HALL OF KEYS (http://localhost:3002/settings/keys)
          ========================================================================= */}
      {activeTab === "keys" && (
        <div className="space-y-8 animate-fade-in">
          {/* Top Hero Card: THE ONE KEY */}
          <section className="vault-card p-6 md:p-8 relative z-30">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-3 min-w-0 flex-1 max-w-xl">
                <h2 className="font-cinzel text-2xl md:text-3xl text-[#f2c36b] gold-glow tracking-wide uppercase font-bold">
                  THE ONE KEY
                </h2>
                <p className="text-sm md:text-base text-[#8aab9a] leading-relaxed font-sans">
                  A single <code className="text-[#f2c36b] font-mono bg-[#08100e] px-1.5 py-0.5 rounded border border-[#0d3b2e]">prec_</code> token to rule your inference. Routes across your fallback chain with full conversation context on failover.
                </p>

                {!hasProviderKeys && !recentlyForgedKey && (
                  <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>A Ring without a bearer goes nowhere. Seal at least one provider key so routing has someone to carry it.</span>
                  </div>
                )}

                {recentlyForgedKey ? (
                  <div className="mt-2 p-3.5 bg-[#08100e]/90 rounded-lg font-mono text-xs text-[#f2c36b] break-all border border-[#d4a853]/30 shadow-inner flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm tracking-wide">{recentlyForgedKey}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard("unified", recentlyForgedKey)}
                          className="px-2.5 py-1 bg-[#112820] hover:bg-[#1a5c45] border border-[#d4a853]/40 rounded-lg text-xs text-[#f2c36b] transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKeyId === "unified" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKeyId === "unified" ? "Copied" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={generateUnifiedKey}
                          className="px-2.5 py-1 bg-[#161d1b] hover:bg-[#242c29] border border-[#0d3b2e] rounded-lg text-xs text-[#8aab9a] hover:text-[#dce4e0] cursor-pointer"
                          title="Roll / regenerate master key"
                        >
                          Roll prec_ key
                        </button>
                      </div>
                    </div>
                    <p className="text-red-300 text-xs mt-2 font-display">
                      Copy now — shown once only. Lose it and you must forge anew.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={generateUnifiedKey}
                    className="precious-btn-gold mt-2 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    disabled={!hasProviderKeys}
                    title={!hasProviderKeys ? "A Ring without a bearer goes nowhere. Seal at least one provider key so routing has someone to carry it." : undefined}
                  >
                    Forge prec_ key
                  </button>
                )}
                {/* Model / Routing Mode Selector Dropdown */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#d4a853] font-cinzel font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#f2c36b]" />
                      Active Model Router
                    </label>
                    <span className="text-[10px] font-mono text-[#8aab9a]">
                      {currentSelectedModelId === "auto" ? "Dynamic Failover Chain" : "Pinned Model Override"}
                    </span>
                  </div>

                  <div className="relative w-full sm:w-64 max-w-[280px]" ref={modelDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#08100e] border border-[#d4a853] text-[#dce4e0] text-xs font-mono tracking-wider shadow-lg hover:border-[#f2c36b] transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#d4a853]"
                      aria-label="Auto (Best Available) or select model"
                    >
                      <span className="font-semibold uppercase tracking-wide truncate">
                        {selectedModelOption.label}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#d4a853] shrink-0 transition-transform duration-200 ${
                          isModelDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isModelDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1.5 w-full bg-[#08100e] border border-[#d4a853] rounded-lg shadow-2xl shadow-black/95 z-[100] overflow-hidden divide-y divide-[#0d3b2e]/60">
                        {modelOptions.map((opt) => {
                          const isSelected = opt.id.toLowerCase() === currentSelectedModelId.toLowerCase();
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleSelectModel(opt.id, opt.label)}
                              className={`w-full text-left px-3.5 py-2.5 text-xs font-mono tracking-wider flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 text-white font-semibold"
                                  : "text-[#dce4e0] hover:bg-blue-600/80 hover:text-white"
                              }`}
                            >
                              <span className="truncate">{opt.label}</span>
                              {opt.hasClip && (
                                <span
                                  className={`shrink-0 ml-2 text-xs ${isSelected ? "text-white" : "text-[#8aab9a]"}`}
                                  title="Key configured in Vault"
                                >
                                  📎
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Circular Emblem */}
              <div
                className={`shrink-0 self-center flex flex-col items-center justify-center w-36 h-36 md:w-40 md:h-40 rounded-full border-4 bg-[#0d3b2e]/20 shadow-[0_0_50px_rgba(242,195,107,0.1)] ${
                  hasProviderKeys ? "border-[#d4a853]/30" : "border-[#0d3b2e]/40"
                }`}
              >
                <Shield className={`w-10 h-10 ${hasProviderKeys ? "text-[#f2c36b] animate-pulse" : "text-[#8aab9a]/40"}`} />
                <p className={`text-[10px] uppercase tracking-widest mt-2 font-cinzel font-bold ${hasProviderKeys ? "text-[#f2c36b]" : "text-[#8aab9a]/50"}`}>
                  {hasProviderKeys ? (unifiedKey ? "ACTIVE" : "SECURED") : "NO ACTIVE KEY"}
                </p>
              </div>
            </div>
          </section>

          {/* 2-Column Grid: Fallback Chain on Left + Vault Capacity & Seal Form on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Fallback chain */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-cinzel text-base text-[#dce4e0] tracking-wide uppercase font-semibold">
                  THE FALLBACK CHAIN
                </h2>
                {aiVault.length > 0 && (
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#8aab9a] font-mono">
                    Priority flow
                  </span>
                )}
              </div>

              {aiVault.length === 0 ? (
                <div className="precious-card p-5 text-center">
                  <p className="text-sm text-[#8aab9a] font-cinzel italic">No provider keys in vault. Seal one below to forge the fallback chain.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-2">
                    {aiVault.map((item, idx) => {
                      const providerObj = PROVIDERS.find((p) => p.id === item.provider || (item.provider === "gemini" && p.id === "google-gemini"));
                      const providerDisplayName = providerObj ? providerObj.name.toUpperCase() : item.provider.toUpperCase();
                      const isHealthy = item.status === "healthy";
                      return (
                        <li
                          key={item.id}
                          className="precious-card p-3 flex items-center gap-3 hover:border-[#d4a853]/40 transition-colors"
                        >
                          <span className="text-[#8aab9a]/60 font-mono text-xs w-4 shrink-0 font-bold">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-cinzel text-xs text-[#f2c36b] uppercase tracking-wider truncate font-semibold">
                              {providerDisplayName}
                            </p>
                            <p className="text-[11px] text-[#8aab9a] truncate font-mono">{item.model}</p>
                          </div>

                          {/* Health Dot */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isHealthy
                                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                  : item.status === "rate_limited"
                                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                                  : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                              }`}
                              title={item.status}
                            />
                          </div>

                          {/* Reorder Buttons */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveChain(idx, -1)}
                              disabled={idx === 0}
                              className="text-[#d4a853] hover:text-[#f2c36b] px-1 disabled:opacity-25 text-xs font-bold transition-colors cursor-pointer"
                              title="Move up"
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveChain(idx, 1)}
                              disabled={idx === aiVault.length - 1}
                              className="text-[#d4a853] hover:text-[#f2c36b] px-1 disabled:opacity-25 text-xs font-bold transition-colors cursor-pointer"
                              title="Move down"
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    onClick={() => persistVault(aiVault, aiRouterSettings, enableChatbot, "Fallback chain order saved successfully.")}
                    disabled={isSaving}
                    className="precious-btn-gold w-full text-xs py-2 font-cinzel tracking-wider uppercase cursor-pointer"
                  >
                    {isSaving ? "Saving order..." : "Save order"}
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: Vault Capacity & Seal Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Vault Capacity Bar - only rendered when provider keys exist */}
              {hasProviderKeys && usageSummary.segments.length > 0 && (
                <section className="precious-card p-6 space-y-4">
                  <h2 className="font-cinzel text-lg text-[#dce4e0] tracking-wide uppercase font-semibold">
                    VAULT CAPACITY
                  </h2>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#8aab9a]">
                      <span className="font-cinzel tracking-wide text-[#d4a853] text-[11px] uppercase font-semibold">
                        VAULT CAPACITY · {usageSummary.totalTokensToday.toLocaleString()} /{" "}
                        {usageSummary.totalTokenBudget.toLocaleString()} TODAY
                      </span>
                      <span className="font-mono text-[11px] text-[#8aab9a]/90">
                        {formatReset(usageSummary.resetsDayAt)}
                      </span>
                    </div>

                    {/* Stacked battery: each provider owns a slice; charge drains left -> right */}
                    <div
                      className="flex h-3.5 w-full rounded-full overflow-hidden border border-emerald-900/60 bg-[#08100e] shadow-inner"
                      role="meter"
                      aria-label="Combined provider routing budget"
                    >
                      {usageSummary.segments.map((seg) => {
                        const colors = getProviderBarColor(seg.providerId);
                        const remainingPct = Math.round(seg.remainingFraction * 100);
                        return (
                          <div
                            key={seg.providerId}
                            className={`relative h-full border-r border-[#0d1513] last:border-r-0 ${colors.drained}`}
                            style={{ width: `${seg.weightPercent}%` }}
                            role="meter"
                            title={`${seg.label}: ${seg.tokensToday.toLocaleString()} / ${seg.tokenBudget.toLocaleString()} tokens today (${remainingPct}% left)`}
                          >
                            <div
                              className={`absolute inset-y-0 right-0 ${colors.charge} transition-all duration-500 ease-out`}
                              style={{ width: `${remainingPct}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend below the bar */}
                    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#8aab9a]">
                      {usageSummary.segments.map((seg) => {
                        const colors = getProviderBarColor(seg.providerId);
                        const remainingPct = Math.round(seg.remainingFraction * 100);
                        return (
                          <li key={seg.providerId} className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-xs ${colors.charge} ring-1 ${colors.ring}`} aria-hidden />
                            <span className="text-[#8aab9a]">
                              <strong className="text-[#dce4e0] font-semibold">{seg.label}</strong>{" "}
                              <span className="font-mono text-white font-bold">{remainingPct}%</span>{" "}
                              <span className="text-[#8aab9a]/70 font-mono text-[11px]">
                                ({seg.tokensToday.toLocaleString()}/{seg.tokenBudget.toLocaleString()})
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Footnote matching screenshot exactly */}
                    <p className="text-[11px] text-[#8aab9a]/80 leading-relaxed font-sans pt-1">
                      Bar width = each provider's share of your combined daily budget. Color drains as Precious routes requests through that key. Google/Groq may enforce their own limits separately — this is your local routing meter.
                    </p>
                  </div>
                </section>
              )}

              {/* Seal a New Secret Form */}
              <section ref={addSectionRef} className="precious-card p-6 md:p-8 scroll-mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
                  <h2 className="font-cinzel text-xl text-[#d4a853] tracking-wide uppercase font-semibold">
                    {addMode === "backup" ? `ADD BACKUP KEY — ${selectedProviderMeta.name.toUpperCase()}` : "SEAL A NEW SECRET"}
                  </h2>
                  {addMode === "backup" && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddMode("new");
                        setSealLabel("");
                        setSealApiKey("");
                        setSealCloudflareAccountId("");
                        setSealCustomBaseUrl("");
                      }}
                      className="text-xs text-[#8aab9a] hover:text-[#d4a853] cursor-pointer"
                    >
                      Cancel backup
                    </button>
                  )}
                </div>
                {addMode !== "backup" && (
                  <p className="text-sm text-[#8aab9a]">
                    Encrypt and store a new API key in the vault.
                  </p>
                )}
                {addMode === "backup" && (
                  <p className="text-xs text-[#8aab9a] mb-4 leading-relaxed">
                    Add a secondary key for {selectedProviderMeta.name}. It sits behind the primary in the router and activates only if the primary fails.
                  </p>
                )}

                <form onSubmit={handleSealKey} className="space-y-3 pt-2">
                  <label className="block text-[10px] uppercase tracking-[0.16em] text-[#8aab9a] font-sans font-semibold">
                    SELECT PROVIDER
                  </label>
                  <select
                    value={sealProviderId}
                    disabled={addMode === "backup"}
                    onChange={(e) => {
                      const provId = e.target.value;
                      setSealProviderId(provId);
                      const pMeta = PROVIDERS.find((p) => p.id === provId);
                      if (pMeta) {
                        setSealModel(pMeta.defaultModel);
                        setSealLabel(addMode === "backup" ? `${pMeta.name} Backup` : `My ${pMeta.name} key`);
                      }
                    }}
                    className="precious-input cursor-pointer text-xs"
                    style={{ color: "#dce4e0", background: "#08100e" }}
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id} style={{ background: "#0d1513", color: "#dce4e0" }}>
                        {p.name} ({p.riskLevel} risk){p.freeTier === false ? " · paid" : ""}
                      </option>
                    ))}
                  </select>

                  {/* Provider Setup Hint Box */}
                  {selectedProviderMeta?.keySetupUrl && (
                    <div className="rounded-lg border border-[#0d3b2e] bg-[#08100e]/80 p-4 text-xs space-y-2">
                      <p className="text-[#8aab9a] leading-relaxed font-sans">
                        {selectedProviderMeta.keySetupHint ?? "Create an API key at the provider, then paste it below."}
                      </p>
                      {selectedProviderMeta.id === "openai-compat" && (
                        <ol className="list-decimal pl-5 space-y-1.5 text-[#8aab9a] text-xs leading-relaxed">
                          <li>Install Ollama from ollama.com/download (Windows/Mac/Linux). It usually starts automatically.</li>
                          <li>Open a terminal and run: ollama pull llama3.2 (or any model name you want to use).</li>
                          <li>Check it works: ollama list should show your model; the server listens on port 11434.</li>
                          <li>In the form below — Label: anything (e.g. My Ollama). API key: ollama (any text; Ollama ignores it). Base URL: http://localhost:11434/v1 (include /v1).</li>
                          <li>In Sanctum, pick Custom · llama3.2 (or the exact name from ollama list). Model names are case-sensitive.</li>
                        </ol>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                        <a
                          href={selectedProviderMeta.keySetupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-cinzel text-xs text-[#d4a853] hover:underline uppercase tracking-wide font-semibold inline-flex items-center gap-1"
                        >
                          {selectedProviderMeta.keySetupLinkLabel || `Get ${selectedProviderMeta.name} API key →`}
                        </a>
                        <a
                          href={`/docs#${selectedProviderMeta.docsAnchor || selectedProviderMeta.id}`}
                          className="text-xs text-[#8aab9a] hover:text-[#d4a853] hover:underline"
                        >
                          Full setup guide
                        </a>
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    className="precious-input text-xs"
                    placeholder={addMode === "backup" ? `Label (e.g. ${selectedProviderMeta.name} backup)` : `Label (e.g. My ${selectedProviderMeta.name} key)`}
                    value={sealLabel}
                    onChange={(e) => setSealLabel(e.target.value)}
                    required
                  />

                  {sealProviderId === "cloudflare" && (
                    <>
                      <input
                        type="text"
                        className="precious-input text-xs"
                        placeholder="Account ID (from dashboard URL or Workers AI page)"
                        value={sealCloudflareAccountId}
                        onChange={(e) => setSealCloudflareAccountId(e.target.value)}
                        required
                      />
                      <input
                        type="password"
                        className="precious-input font-mono text-xs"
                        placeholder="API Token (with Workers AI Read permission)"
                        value={sealApiKey}
                        onChange={(e) => setSealApiKey(e.target.value)}
                        required
                      />
                    </>
                  )}

                  {sealProviderId !== "cloudflare" && (
                    <input
                      type="password"
                      className="precious-input font-mono text-xs"
                      placeholder={
                        selectedProviderMeta?.keyless
                          ? "API key (optional — anonymous tier)"
                          : sealProviderId === "openai-compat"
                          ? "API key (use ollama for local Ollama)"
                          : "API key"
                      }
                      value={sealApiKey}
                      onChange={(e) => setSealApiKey(e.target.value)}
                      required={!selectedProviderMeta?.keyless}
                    />
                  )}

                  {sealProviderId === "openai-compat" && (
                    <>
                      <p className="text-[11px] text-[#8aab9a] -mt-1">
                        Not a real secret for local Ollama — type ollama so the field is filled. LM Studio often accepts lm-studio or any placeholder.
                      </p>
                      <input
                        type="text"
                        className="precious-input font-mono text-xs"
                        placeholder="Base URL — http://localhost:11434/v1"
                        value={sealCustomBaseUrl}
                        onChange={(e) => setSealCustomBaseUrl(e.target.value)}
                      />
                      <p className="text-[11px] text-[#8aab9a] -mt-1">
                        Must end with /v1 — e.g. http://localhost:11434/v1. For LM Studio, usually http://localhost:1234/v1.
                      </p>
                    </>
                  )}

                  <button
                    type="submit"
                    className="precious-btn-primary w-full text-xs font-semibold py-2.5 font-cinzel uppercase tracking-wider cursor-pointer text-[#f2c36b]"
                  >
                    {addMode === "backup" ? "Add backup key" : "Seal to vault"}
                  </button>
                </form>
              </section>
            </div>
          </div>

          {/* Bottom Section: YOUR KEYS */}
          <section ref={keysSectionRef} className="precious-card p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#0d3b2e]/60 flex-wrap gap-3">
              <h2 className="font-cinzel text-lg text-[#dce4e0] tracking-wide uppercase font-semibold">
                YOUR KEYS
              </h2>
              {hasProviderKeys && (
                <button
                  type="button"
                  onClick={runHealthCheck}
                  disabled={probingAll}
                  className="text-xs text-[#f2c36b] hover:underline font-cinzel disabled:opacity-50 flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${probingAll ? "animate-spin" : ""}`} />
                  {probingAll ? "Testing all keys..." : "Run health check"}
                </button>
              )}
            </div>

            {probingAll && (
              <p className="text-xs text-[#f2c36b]/90 mb-3 animate-pulse" role="status">
                Sending a tiny test request to each provider — this can take a few seconds…
              </p>
            )}
            {healthSummary && !probingAll && (
              <p
                className="text-xs text-[#8aab9a] mb-3 leading-relaxed border border-[#0d3b2e] rounded-lg px-3 py-2 bg-[#08100e]/80"
                role="status"
              >
                {healthSummary}
              </p>
            )}
            <p className="text-xs text-[#8aab9a] leading-relaxed">
              Backup keys: if one key hits a rate limit, Precious tries the next key on that provider before switching to another. Separate accounts work best; same-account keys may share quota. Use the ✓ icon to test one key.
            </p>

            {aiVault.length === 0 ? (
              <p className="text-[#8aab9a] text-xs font-cinzel italic py-6 text-center">
                No keys yet. The vault is empty — seal one above.
              </p>
            ) : (
              <ul className="space-y-3">
                {aiVault.map((k) => {
                  const isHealthy = k.status === "healthy";
                  const isTesting = testingKeyId === k.id;
                  const isReplacing = replacingKeyId === k.id;
                  const providerMeta = PROVIDERS.find((p) => p.id === k.provider || (k.provider === "gemini" && p.id === "google-gemini"));
                  const riskLevel = providerMeta?.riskLevel || (k.provider === "openai" ? "medium" : "low");

                  return (
                    <li
                      key={k.id}
                      className="precious-card p-4 border border-[#0d3b2e]/50 hover:border-[#d4a853]/25 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isHealthy
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                : k.status === "rate_limited"
                                ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                                : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                            }`}
                            title={k.status}
                          />
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-semibold text-[#dce4e0]">{k.label}</span>
                            <span className="text-xs text-[#8aab9a] font-mono">({k.provider})</span>
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                riskLevel === "low"
                                  ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                                  : "bg-amber-950/60 border border-amber-500/40 text-amber-300"
                              }`}
                            >
                              {riskLevel === "low" ? "LOW RISK" : "MEDIUM RISK"}
                            </span>
                            {k.status === "rate_limited" && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                                RATE LIMITED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons matching screenshot */}
                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          {/* Live single key test button */}
                          <button
                            type="button"
                            onClick={() => testKey(k)}
                            disabled={isTesting || probingAll}
                            className="text-[#8aab9a] hover:text-[#f2c36b] disabled:opacity-50 p-0.5 rounded cursor-pointer"
                            title="Test key with a small request"
                            aria-label={`Test ${k.label}`}
                          >
                            {isTesting ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-[#f2c36b]" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>

                          {/* Replace */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isReplacing) {
                                setReplacingKeyId(null);
                              } else {
                                setReplacingKeyId(k.id);
                                setReplaceForm({ label: k.label, apiKey: "", model: k.model });
                              }
                            }}
                            className="text-[#f2c36b] hover:underline cursor-pointer font-medium"
                          >
                            {isReplacing ? "Cancel" : "Replace"}
                          </button>

                          {/* Add backup */}
                          <button
                            type="button"
                            onClick={() => startBackup(k.provider)}
                            className="text-[#8aab9a] hover:text-[#f2c36b] hover:underline cursor-pointer font-medium"
                          >
                            Add backup
                          </button>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => handleDeleteKey(k.id)}
                            className="text-red-400 hover:text-red-300 hover:underline cursor-pointer font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Test result status feedback */}
                      {isHealthy && k.lastLatencyMs && !isReplacing && (
                        <p className="text-[11px] text-emerald-400 font-mono pl-4">
                          ✓ {k.label}: key is working ({k.lastLatencyMs}ms)
                          {k.lastTested && <span className="text-[#8aab9a]/80 ml-2 font-normal">at {k.lastTested}</span>}
                        </p>
                      )}
                      {!isHealthy && k.lastError && !isReplacing && (
                        <p className={`text-[11px] font-mono pl-4 leading-relaxed ${k.status === "rate_limited" ? "text-amber-300" : "text-red-300"}`}>
                          {k.status === "rate_limited" ? "⚠️" : "✕"} {k.lastError}
                          {k.lastTested && <span className="text-[#8aab9a]/80 ml-2 font-normal">({k.lastTested})</span>}
                        </p>
                      )}

                      {/* Inline Replace Key Form */}
                      {isReplacing && (
                        <form onSubmit={handleReplaceKey} className="pt-2 border-t border-[#0d3b2e]/60 space-y-2 pl-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              className="precious-input text-xs"
                              placeholder="Label"
                              value={replaceForm.label}
                              onChange={(e) => setReplaceForm({ ...replaceForm, label: e.target.value })}
                            />
                            <input
                              type="password"
                              className="precious-input font-mono text-xs"
                              placeholder="New API key"
                              value={replaceForm.apiKey}
                              onChange={(e) => setReplaceForm({ ...replaceForm, apiKey: e.target.value })}
                              required
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button type="submit" className="precious-btn-primary text-xs py-1.5 px-3 cursor-pointer">
                              Save new key
                            </button>
                            <button
                              type="button"
                              onClick={() => setReplacingKeyId(null)}
                              className="text-xs text-[#8aab9a] hover:text-[#dce4e0] px-2 py-1 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="text-center font-cinzel text-xs tracking-[0.25em] uppercase text-[#d4a853]/40 pt-2">
            The Precious Vault
          </p>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AUDIT CHRONICLES (http://localhost:3002/settings/audit)
          ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-2 border-b border-[#0d3b2e]/60">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4a853]/70 font-cinzel">CHRONICLES</p>
              <h1 className="font-cinzel text-2xl md:text-3xl text-[#f2c36b] gold-glow tracking-wide mt-0.5">
                Audit Chronicles
              </h1>
              <p className="text-[#8aab9a] text-xs mt-1 max-w-2xl leading-relaxed">
                Every whisper and interaction within the Vault, preserved in the immutable ledger of API traffic.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-2 text-xs text-[#8aab9a] border border-[#0d3b2e] rounded-full px-3 py-1.5 bg-[#08100e]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live ledger
              </span>
              <button
                type="button"
                onClick={exportAuditJson}
                disabled={filteredAudit.length === 0}
                className="precious-btn-gold text-xs py-1.5 px-3 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 inline mr-1" />
                Export archive
              </button>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="precious-card p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#8aab9a] font-mono mb-2">Reliability score</p>
              <p className="font-cinzel text-3xl text-[#f2c36b] font-bold">{auditStats.reliability == null ? "—" : `${auditStats.reliability}%`}</p>
              <p className="text-xs text-[#8aab9a] mt-1">{auditStats.total === 0 ? "No chat requests yet" : `${auditStats.total} transmutations in ledger`}</p>
            </div>

            <div className="precious-card p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#8aab9a] font-mono mb-2">Token flux</p>
              <p className="font-cinzel text-3xl text-[#f2c36b] font-bold">{auditStats.tokenFlux.toLocaleString()}</p>
              <p className="text-xs text-[#8aab9a] mt-1">Across recorded chat requests</p>
            </div>

            <div className="precious-card p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#8aab9a] font-mono mb-2">Failover incidents</p>
              <p className="font-cinzel text-3xl text-[#f2c36b] font-bold">{auditStats.failovers}</p>
              <p className="text-xs text-[#8aab9a] mt-1">Retries and provider switches</p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="precious-card overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-[#0d3b2e]">
              <h2 className="font-cinzel text-sm tracking-wide text-[#f2c36b] font-semibold">Recent transmutations</h2>
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-[#8aab9a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search the ledger..."
                  className="precious-input pl-8 py-1.5 text-xs"
                />
              </div>
            </div>

            {auditLoading ? (
              <div className="py-16 text-center text-xs text-[#8aab9a] font-cinzel">
                Unsealing chronicles...
              </div>
            ) : filteredAudit.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#8aab9a] font-cinzel italic">
                {auditSearch ? "No matching chronicles in ledger." : "No chronicles yet. Whisper in Sanctum and return."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#0d3b2e] text-left text-[#8aab9a] text-[11px] uppercase tracking-wider font-mono">
                      <th className="py-3 px-4 font-medium">Time</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Route &amp; fallback</th>
                      <th className="py-3 px-4 font-medium hidden md:table-cell">Detail</th>
                      <th className="py-3 px-4 font-medium text-right">Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0d3b2e]/40">
                    {filteredAudit.map((entry) => {
                      const isErr = !!entry.metadata?.error;
                      return (
                        <tr key={entry.id} className="hover:bg-[#112820]/40 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-[#8aab9a] whitespace-nowrap">
                            <span className="text-[#dce4e0]/80">
                              {new Date(entry.createdAt).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", month: "short", day: "numeric" })}
                            </span>{" "}
                            {new Date(entry.createdAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", second: "2-digit" })} BST
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide border ${
                                isErr
                                  ? "border-red-700/50 text-red-300 bg-red-950/30"
                                  : "border-emerald-700/50 text-emerald-300 bg-emerald-950/30"
                              }`}
                            >
                              {isErr ? "Terminated" : "Success"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono">
                            {entry.action === "chat_request" ? (
                              entry.metadata?.streamFailedProvider ? (
                                <span className="text-[#f2c36b] font-semibold">
                                  {entry.metadata.streamFailedProvider} ✗ → {entry.metadata.provider || "unknown"} · {entry.metadata.model || "default"}
                                </span>
                              ) : isErr ? (
                                <span className="text-red-300/90 font-medium">
                                  Failed — {(entry.metadata?.error || "").slice(0, 45)}
                                </span>
                              ) : (
                                <span className="text-[#dce4e0] font-semibold">
                                  {entry.metadata?.provider || "unknown"} · {entry.metadata?.model || "default"}
                                </span>
                              )
                            ) : entry.action === "key_created" ? (
                              <span className="text-[#f2c36b]">Key sealed — {entry.metadata?.providerId || entry.metadata?.keyLabel || "secret"}</span>
                            ) : entry.action === "key_updated" ? (
                              <span className="text-[#8aab9a]">Key replaced</span>
                            ) : entry.action === "key_deleted" ? (
                              <span className="text-red-300/80">Key removed</span>
                            ) : entry.action === "unified_key_created" ? (
                              <span className="text-[#f2c36b]">Master key forged</span>
                            ) : (
                              <span className="text-[#8aab9a]">{entry.action}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-[#8aab9a] hidden md:table-cell max-w-xs truncate">
                            {entry.metadata?.failoverFrom ? (
                              `failover from ${entry.metadata.failoverFrom}${entry.metadata.attempts ? ` · ${entry.metadata.attempts} attempts` : ""}${entry.metadata.error ? ` · error: ${entry.metadata.error}` : ""}`
                            ) : entry.metadata?.error ? (
                              `error: ${entry.metadata.error}`
                            ) : entry.metadata?.question ? (
                              `"${entry.metadata.question}"`
                            ) : (
                              "Normal routing"
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-[#f2c36b]">
                            {entry.metadata?.tokens ? entry.metadata.tokens.toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-5 py-3 border-t border-[#0d3b2e] text-[11px] text-[#8aab9a] flex items-center justify-between">
              <span>Showing {filteredAudit.length} chronicles</span>
              <button
                type="button"
                onClick={fetchAuditLogs}
                className="text-[#f2c36b] hover:underline font-mono text-[11px] cursor-pointer"
              >
                Refresh ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: TOKEN SETTINGS (Precious Theme - http://localhost:3002/settings/keys)
          ========================================================================= */}
      {activeTab === "tokens" && (
        <div className="space-y-6 animate-fade-in max-w-4xl">
          <div className="pb-2 border-b border-[#0d3b2e]/60">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4a853]/70 font-cinzel">ROUTER POLICY</p>
            <h1 className="font-cinzel text-2xl md:text-3xl text-[#f2c36b] gold-glow tracking-wide mt-0.5">
              Token & Router Settings
            </h1>
            <p className="text-[#8aab9a] text-xs mt-1 max-w-2xl leading-relaxed">
              Precious-style failover rules, token constraints, and inference parameters applied in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Failover Cooldown */}
            <div className="precious-card p-5 space-y-2">
              <label className="block text-[11px] font-cinzel text-[#f2c36b] uppercase tracking-wider font-semibold">
                Failover Cooldown
              </label>
              <div className="space-y-1">
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={aiRouterSettings.cooldownSeconds || 30}
                  onChange={(e) =>
                    setAiRouterSettings((prev) => ({
                      ...prev,
                      cooldownSeconds: Number(e.target.value) || 30,
                    }))
                  }
                  className="precious-input font-mono text-sm py-2 text-center"
                />
                <span className="text-[10px] font-mono text-[#8aab9a] block text-center">Seconds</span>
              </div>
              <p className="text-[11px] text-[#8aab9a] leading-relaxed pt-1">
                Duration a rate-limited or failed key sleeps before retry (Standard: 30s).
              </p>
            </div>

            {/* LLM Temperature */}
            <div className="precious-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-cinzel text-[#f2c36b] uppercase tracking-wider font-semibold">
                  Temperature
                </label>
                <span className="font-mono text-xs text-[#f2c36b] font-bold">
                  {aiRouterSettings.temperature ?? 0.55}
                </span>
              </div>
              <div className="space-y-2 pt-1">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={aiRouterSettings.temperature ?? 0.55}
                  onChange={(e) =>
                    setAiRouterSettings((prev) => ({
                      ...prev,
                      temperature: parseFloat(e.target.value) || 0.55,
                    }))
                  }
                  className="w-full accent-[#d4a853] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8aab9a]">
                  <span>Precise (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>
              <p className="text-[11px] text-[#8aab9a] leading-relaxed pt-1">
                0.55 recommended for grounded portfolio conversations without hallucinations.
              </p>
            </div>

            {/* Max Output Tokens */}
            <div className="precious-card p-5 space-y-2">
              <label className="block text-[11px] font-cinzel text-[#f2c36b] uppercase tracking-wider font-semibold">
                Max Output Tokens
              </label>
              <div className="space-y-1">
                <input
                  type="number"
                  min={100}
                  max={2500}
                  step={50}
                  value={aiRouterSettings.maxTokens || 750}
                  onChange={(e) =>
                    setAiRouterSettings((prev) => ({
                      ...prev,
                      maxTokens: Number(e.target.value) || 750,
                    }))
                  }
                  className="precious-input font-mono text-sm py-2 text-center"
                />
                <span className="text-[10px] font-mono text-[#8aab9a] block text-center">Tokens per query</span>
              </div>
              <p className="text-[11px] text-[#8aab9a] leading-relaxed pt-1">
                Token budget allocated per visitor interaction to keep responses concise.
              </p>
            </div>

            {/* Context Optimization */}
            <div className="precious-card p-5 space-y-2">
              <label className="block text-[11px] font-cinzel text-[#f2c36b] uppercase tracking-wider font-semibold">
                Context Mode
              </label>
              <div className="space-y-1">
                <select
                  value={aiRouterSettings.contextMode || "compact"}
                  onChange={(e) =>
                    setAiRouterSettings((prev) => ({
                      ...prev,
                      contextMode: e.target.value as "compact" | "full",
                    }))
                  }
                  className="precious-input text-xs cursor-pointer py-2 text-center"
                  style={{ color: "#dce4e0", background: "#08100e" }}
                >
                  <option value="compact">⚡ Smart Compact (~800 tok)</option>
                  <option value="full">📚 Full Knowledge (~3,700 tok)</option>
                </select>
                <span className="text-[10px] font-mono text-[#8aab9a] block text-center">Prompt Payload</span>
              </div>
              <p className="text-[11px] text-[#8aab9a] leading-relaxed pt-1">
                Compact trims verbose descriptions, saving ~75% tokens per message.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => persistVault(aiVault, aiRouterSettings, enableChatbot, "Token & router policy saved to database.")}
              disabled={isSaving}
              className="precious-btn-primary px-6 py-2.5 text-xs font-cinzel"
            >
              {isSaving ? "Saving Policy..." : "Save Router Policy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
