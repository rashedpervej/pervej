import React, { useEffect } from "react";
import { ArrowLeft, ExternalLink, Shield } from "lucide-react";

interface GuideItem {
  id: string;
  title: string;
  risk: "low" | "medium" | "high";
  steps: string[];
  url: string;
  linkLabel?: string;
  notice?: string;
}

const cloudGuides: GuideItem[] = [
  {
    id: "cerebras",
    title: "Cerebras",
    risk: "low",
    steps: [
      "Go to cloud.cerebras.ai/platform and sign up for a free account",
      "Navigate to API & Keys → Create an API Key",
      "Copy your key (starts with csk-)",
      "In The Vault, select Cerebras (low risk) and paste into the vault",
    ],
    url: "https://cloud.cerebras.ai/platform",
    linkLabel: "Cerebras Platform →",
  },
  {
    id: "groq",
    title: "Groq",
    risk: "low",
    steps: [
      "Go to console.groq.com and create an account",
      "Navigate to API Keys → Create API Key",
      "Copy the key (starts with gsk_)",
      "In The Vault, select Groq and paste",
    ],
    url: "https://console.groq.com/keys",
    linkLabel: "Groq Console →",
  },
  {
    id: "google-gemini",
    title: "Google Gemini",
    risk: "low",
    steps: [
      "Go to aistudio.google.com/apikey",
      "Create API key in Google AI Studio",
      "Copy the key (starts with AIzaSy... or AQ...)",
      "In The Vault, select Google Gemini and paste",
    ],
    url: "https://aistudio.google.com/apikey",
    linkLabel: "Google AI Studio →",
  },
  {
    id: "cloudflare",
    title: "Cloudflare Workers AI",
    risk: "low",
    steps: [
      "Open your Cloudflare Dashboard at dash.cloudflare.com",
      "Find your Account ID on the right side of the Workers & Pages Overview page",
      "Go to My Profile → API Tokens → Create Token → Use Workers AI template (with Read permission)",
      "Copy the token, then enter your key formatted as account_id:api_token into The Vault",
    ],
    url: "https://dash.cloudflare.com/?to=/:account/ai/workers-ai",
    linkLabel: "Cloudflare Dashboard →",
  },
  {
    id: "github-models",
    title: "GitHub Models",
    risk: "low",
    steps: [
      "Go to github.com/settings/tokens",
      "Generate new token (classic) with no special scopes required — token authenticates your account",
      "Browse available models at github.com/marketplace/models",
      "Paste your GitHub personal access token (starts with ghp_) into The Vault",
    ],
    url: "https://github.com/settings/tokens",
    linkLabel: "GitHub Tokens →",
  },
  {
    id: "openrouter",
    title: "OpenRouter",
    risk: "low",
    steps: [
      "Sign up at openrouter.ai",
      "Go to Keys → Create Key",
      "Copy the key (starts with sk-or-)",
      "In The Vault, select OpenRouter and paste",
    ],
    url: "https://openrouter.ai/keys",
    linkLabel: "OpenRouter Keys →",
  },
  {
    id: "mistral",
    title: "Mistral",
    risk: "low",
    steps: [
      "Sign up at console.mistral.ai",
      "Create an API key under API Keys",
      "Copy the key",
      "In The Vault, select Mistral and paste",
    ],
    url: "https://console.mistral.ai/api-keys/",
    linkLabel: "Mistral Console →",
  },
  {
    id: "openai",
    title: "OpenAI",
    risk: "medium",
    notice: "⚠️ Requires billing — no free API tier. Add $5+ at platform.openai.com/account/billing, then create a new key.",
    steps: [
      "Sign in at platform.openai.com",
      "Ensure your billing balance is active (Settings → Billing)",
      "Go to API keys → Create new secret key",
      "Copy the key (starts with sk-)",
      "In The Vault, select OpenAI and paste",
    ],
    url: "https://platform.openai.com/api-keys",
    linkLabel: "OpenAI Platform →",
  },
  {
    id: "huggingface",
    title: "HuggingFace Router",
    risk: "low",
    steps: [
      "Sign in at huggingface.co",
      "Go to Settings → Access Tokens",
      "Create a new read token for the Inference Providers router",
      "Paste token into The Vault",
    ],
    url: "https://huggingface.co/settings/tokens",
    linkLabel: "Hugging Face Tokens →",
  },
  {
    id: "ollama-cloud",
    title: "Ollama Cloud",
    risk: "low",
    steps: [
      "Sign in at ollama.com/signin",
      "Navigate to Settings → API Keys",
      "Create and copy your cloud key",
      "Paste into The Vault",
    ],
    url: "https://ollama.com/signin",
    linkLabel: "Ollama Cloud →",
  },
  {
    id: "opencode",
    title: "OpenCode Zen",
    risk: "low",
    steps: [
      "Create a free account at opencode.ai/auth (no card required)",
      "Navigate to API Credentials",
      "Copy your key and paste into The Vault",
    ],
    url: "https://opencode.ai/auth",
    linkLabel: "OpenCode Auth →",
  },
  {
    id: "zhipu",
    title: "Z.ai (Zhipu)",
    risk: "low",
    steps: [
      "Register at open.bigmodel.cn",
      "Navigate to User Center → API Keys",
      "Copy your key for GLM-4.5 / GLM-4.7 Flash free tier access",
      "Paste into The Vault",
    ],
    url: "https://open.bigmodel.cn/usercenter/apikeys",
    linkLabel: "Zhipu Platform →",
  },
  {
    id: "llm7",
    title: "LLM7",
    risk: "low",
    steps: [
      "Visit llm7.io",
      "Free tier provides ~100 requests/hr. Basic models work anonymously, or create an optional token for higher limits",
      "Paste your token or type anonymous into The Vault",
    ],
    url: "https://llm7.io",
    linkLabel: "LLM7 Gateway →",
  },
  {
    id: "cohere",
    title: "Cohere",
    risk: "high",
    notice: "ToS restricts personal/household use — local-only in Precious.",
    steps: [
      "Sign up at dashboard.cohere.com",
      "Navigate to API Keys → Generate Trial Key (1,000 calls/mo free)",
      "Paste your Cohere key into The Vault",
    ],
    url: "https://dashboard.cohere.com/api-keys",
    linkLabel: "Cohere Dashboard →",
  },
  {
    id: "nvidia",
    title: "NVIDIA NIM",
    risk: "high",
    notice: "Evaluation-only ToS with 1,000 free inference credits. Local-only in Precious.",
    steps: [
      "Visit build.nvidia.com",
      "Sign in with your NVIDIA Developer account",
      "Generate an API key for NIM microservices",
      "Paste into The Vault",
    ],
    url: "https://build.nvidia.com/",
    linkLabel: "NVIDIA NIM →",
  },
  {
    id: "pollinations",
    title: "Pollinations",
    risk: "low",
    steps: [
      "Pollinations provides an anonymous free tier without mandatory API keys",
      "In The Vault, you can enter 'pollinations' as key placeholder",
      "Requests route through public community GPU infrastructure",
    ],
    url: "https://pollinations.ai",
    linkLabel: "Pollinations docs →",
  },
  {
    id: "kilo",
    title: "Kilo Gateway",
    risk: "low",
    steps: [
      "Visit kilo.ai for documentation on free anonymous routing (~200 req/hr per IP)",
      "Optional personal tokens can be created in the dashboard",
      "Paste into The Vault",
    ],
    url: "https://kilo.ai",
    linkLabel: "Kilo Gateway docs →",
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 rounded-lg bg-[#08100e] border border-[#0d3b2e] p-3 text-xs text-[#f2c36b] font-mono overflow-x-auto">
      {children}
    </pre>
  );
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const cls =
    level === "low"
      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
      : level === "medium"
        ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
        : "bg-red-950/60 border-red-500/40 text-red-300";
  return (
    <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-mono font-semibold ${cls}`}>
      {level} risk
    </span>
  );
}

export default function DocsPage() {
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const elem = document.getElementById(id);
      if (elem) {
        setTimeout(() => elem.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1513] text-[#dce4e0] font-sans selection:bg-[#d4a853]/30 selection:text-white pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#08100e]/90 backdrop-blur-md border-b border-[#0d3b2e]/60 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-cinzel text-[#8aab9a] hover:text-[#f2c36b] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Vault
          </a>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#d4a853]" />
            <span className="font-cinzel text-xs text-[#d4a853] font-bold tracking-widest uppercase">The Vault Docs</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-4 md:px-6 pt-10 pb-16 space-y-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d4a853]/70 font-cinzel mb-1">
            SETUP & KNOWLEDGE BASE
          </p>
          <h1 className="font-cinzel text-3xl md:text-4xl text-[#f2c36b] gold-glow tracking-wide font-bold">
            Provider Key Setup
          </h1>
          <p className="text-[#8aab9a] text-sm mt-2 leading-relaxed">
            Step-by-step guides for connecting your API credentials into The Vault. Automatic cascade routing cascades across prioritized fallbacks with zero context loss.
          </p>
        </div>

        {/* Guides List */}
        <div className="space-y-6">
          {cloudGuides.map((g) => (
            <section
              key={g.id}
              id={g.id}
              className="precious-card p-6 md:p-7 scroll-mt-24 space-y-3 border border-[#0d3b2e]/60 hover:border-[#d4a853]/30 transition-all"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-cinzel text-xl text-[#f2c36b] tracking-wide font-bold">{g.title}</h2>
                <RiskBadge level={g.risk} />
              </div>

              {g.notice && (
                <p className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-500/30 rounded-lg p-3">
                  {g.notice}
                </p>
              )}

              <ol className="list-decimal pl-5 space-y-2 text-[#8aab9a] text-xs md:text-sm leading-relaxed">
                {g.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>

              <div className="pt-2">
                <a
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-cinzel text-xs text-[#d4a853] hover:underline uppercase tracking-wide font-semibold inline-flex items-center gap-1.5"
                >
                  {g.linkLabel || "Official docs →"} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </section>
          ))}

          {/* Custom OpenAI-compatible (Ollama / LM Studio) */}
          <section
            id="custom"
            className="precious-card p-6 md:p-7 scroll-mt-24 space-y-4 border border-[#0d3b2e]/60 hover:border-[#d4a853]/30 transition-all"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-cinzel text-xl text-[#f2c36b] tracking-wide font-bold">
                Custom OpenAI-compatible (Ollama & LM Studio)
              </h2>
              <RiskBadge level="medium" />
            </div>

            <p className="text-sm text-[#8aab9a] leading-relaxed">
              Use this for models running on <strong className="text-[#dce4e0]">your own computer</strong> — no API signup, no credit card. Ollama and LM Studio talk to The Vault using standard OpenAI-compatible endpoints.
            </p>

            <h3 className="font-cinzel text-sm text-[#f2c36b] font-semibold">1. Install Ollama</h3>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#8aab9a] leading-relaxed">
              <li>
                Download from{" "}
                <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-[#d4a853] hover:underline">
                  ollama.com/download
                </a>{" "}
                (Windows, macOS, or Linux).
              </li>
              <li>Run the installer. On Windows and macOS, Ollama starts in the background automatically.</li>
              <li>
                Verify installation: open terminal and run <code className="text-[#f2c36b] font-mono">ollama --version</code>.
              </li>
            </ol>

            <h3 className="font-cinzel text-sm text-[#f2c36b] font-semibold">2. Download a model</h3>
            <p className="text-xs text-[#8aab9a]">
              Pull your preferred open-source model:
            </p>
            <CodeBlock>{`ollama pull llama3.2`}</CodeBlock>
            <p className="text-xs text-[#8aab9a] mt-1">
              Other recommended models: <code className="text-[#f2c36b] font-mono">llama3.1</code>, <code className="text-[#f2c36b] font-mono">qwen2.5</code>, <code className="text-[#f2c36b] font-mono">mistral</code>. Run <code className="text-[#f2c36b] font-mono">ollama list</code> to see installed weights.
            </p>

            <h3 className="font-cinzel text-sm text-[#f2c36b] font-semibold">3. Confirm local server is running</h3>
            <p className="text-xs text-[#8aab9a]">
              Ollama listens on port 11434. Verify with:
            </p>
            <CodeBlock>{`curl http://localhost:11434/v1/models`}</CodeBlock>

            <h3 className="font-cinzel text-sm text-[#f2c36b] font-semibold">4. Add into The Vault</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-[#0d3b2e] rounded-lg">
                <thead>
                  <tr className="border-b border-[#0d3b2e] text-[#8aab9a] bg-[#08100e]">
                    <th className="p-2.5 font-cinzel">Field</th>
                    <th className="p-2.5 font-cinzel">What to enter</th>
                  </tr>
                </thead>
                <tbody className="text-[#8aab9a]">
                  <tr className="border-b border-[#0d3b2e]/60">
                    <td className="p-2.5 text-[#dce4e0] font-semibold">Provider</td>
                    <td className="p-2.5 text-[#f2c36b] font-mono">Custom OpenAI-compatible (medium risk)</td>
                  </tr>
                  <tr className="border-b border-[#0d3b2e]/60">
                    <td className="p-2.5 text-[#dce4e0] font-semibold">Label</td>
                    <td className="p-2.5 text-[#f2c36b] font-mono">My Ollama Local</td>
                  </tr>
                  <tr className="border-b border-[#0d3b2e]/60">
                    <td className="p-2.5 text-[#dce4e0] font-semibold">API key</td>
                    <td className="p-2.5 text-[#f2c36b] font-mono">ollama (placeholder)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[#dce4e0] font-semibold">Base URL</td>
                    <td className="p-2.5 text-[#f2c36b] font-mono">http://localhost:11434/v1</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex flex-wrap gap-4">
              <a
                href="https://docs.ollama.com/api/openai-compatibility"
                target="_blank"
                rel="noopener noreferrer"
                className="font-cinzel text-xs text-[#d4a853] hover:underline uppercase tracking-wide font-semibold inline-flex items-center gap-1"
              >
                Ollama OpenAI API Docs → <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://lmstudio.ai/docs/api/openai-api"
                target="_blank"
                rel="noopener noreferrer"
                className="font-cinzel text-xs text-[#8aab9a] hover:text-[#d4a853] hover:underline uppercase tracking-wide inline-flex items-center gap-1"
              >
                LM Studio Local Server Docs → <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>

        <p className="text-center font-cinzel text-xs tracking-[0.25em] uppercase text-[#d4a853]/40 pt-8">
          The Precious Vault • Active Inference Gateway
        </p>
      </article>
    </div>
  );
}
