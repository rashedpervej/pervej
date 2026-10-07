import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Check,
  ExternalLink,
  Phone,
  Mail,
  FileText,
  Shield,
  ArrowRight,
  Palette,
  User,
  Plus,
  History,
  MessageSquarePlus,
  Volume2,
  VolumeX,
  Home,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePortfolio, ChatActionButton, StarterQuestionItem, ChatbotSettings } from "../context/PortfolioContext";
import { FaqFallbackItem, DEFAULT_CHATBOT_SETTINGS, DEFAULT_CHAT_ACTION_BUTTONS, DEFAULT_PROJECT_BRIEF_SETTINGS } from "../data/fallbackContent";
import { getInitialFaqs } from "../utils/persistentSnapshot";

export interface StoredUserLead {
  name: string;
  emailOrPhone: string;
  phone?: string;
  email?: string;
  timestamp?: string;
}

export function getStoredUserLead(): StoredUserLead | null {
  try {
    const saved = localStorage.getItem("portfolio_user_lead");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && parsed.name) {
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

export function saveStoredUserLead(lead: Partial<StoredUserLead>): StoredUserLead {
  try {
    const prev = getStoredUserLead() || { name: "", emailOrPhone: "" };
    const updated: StoredUserLead = {
      name: (lead.name !== undefined ? lead.name : prev.name || "").trim(),
      emailOrPhone: (lead.emailOrPhone !== undefined ? lead.emailOrPhone : prev.emailOrPhone || "").trim(),
      phone: lead.phone !== undefined ? lead.phone : prev.phone,
      email: lead.email !== undefined ? lead.email : prev.email,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("portfolio_user_lead", JSON.stringify(updated));
    localStorage.setItem("portfolio_prechat_passed", "true");
    sessionStorage.setItem("portfolio_prechat_passed", "true");
    return updated;
  } catch (_) {
    return lead as StoredUserLead;
  }
}

export interface ChatThread {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  messages: Message[];
}

export function getSavedChatThreads(): ChatThread[] {
  try {
    const raw = localStorage.getItem("portfolio_chat_threads");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t: any) => ({
          ...t,
          messages: (t.messages || []).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
      }
    }
  } catch (_) {}
  return [];
}

export function saveChatThreads(threads: ChatThread[]) {
  try {
    localStorage.setItem("portfolio_chat_threads", JSON.stringify(threads));
  } catch (e) {
    console.warn("Failed to save chat threads:", e);
  }
}

export interface MessageAction {
  label: string;
  type: "behance" | "whatsapp" | "email" | "brief" | "link";
  url?: string;
  primary?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  actions?: MessageAction[];
  showLeadForm?: boolean;
  leadSubmitted?: boolean;
  feedback?: "helpful" | "unhelpful" | null;
  feedbackReason?: string;
}

/**
 * Automatically extracts actionable direct CTAs (WhatsApp, Email, Project Brief)
 * from model answers so visitors can convert with zero friction.
 */
/**
 * Strips raw URLs and awkward formatting from bot display text
 * so links are always presented as interactive buttons instead of ugly raw text.
 */
function cleanDisplayContent(text: string): string {
  if (!text || typeof text !== "string") return "";
  let cleaned = text;

  // 1. If text contains raw Behance link, smoothly convert phrase into clean natural invitation
  if (/https?:\/\/(?:www\.)?(?:be\.net|behance\.net)/i.test(cleaned)) {
    cleaned = cleaned.replace(
      /(?:এখানে\s+)?(?:Rashed[-‑]এর\s+)?(?:সম্পূর্ণ\s+)?পোর্টফোলিও(?:\s*(?:লিঙ্ক|লিংক|link|url))?\s*:\s*https?:\/\/[^\s]+(?:\s*[।\.])?/gi,
      "নিচের লিংকে ঢুকে আপনি আপডেটেড প্রজেক্টস দেখতে পাবেন। "
    );
    // Also remove any remaining bare behance URLs
    cleaned = cleaned.replace(/https?:\/\/(?:www\.)?(?:be\.net|behance\.net)\/[a-zA-Z0-9_\-\/]+/gi, "");
  }

  // 2. Remove raw WhatsApp links or mailto links
  cleaned = cleaned.replace(/https?:\/\/wa\.me\/[0-9\?=\-_%a-zA-Z]+/gi, "");
  cleaned = cleaned.replace(/mailto:[^\s\)]+/gi, "");

  // 3. Remove AI action tags like [ACTION: behance] or [CTA: brief]
  cleaned = cleaned.replace(/\[(?:ACTION|CTA):\s*[a-zA-Z0-9_-]+\]/gi, "");

  // 4. Remove markdown link wrapper if it wrapped a URL, keeping just readable text
  cleaned = cleaned.replace(/\[([^\]]+)\]\((?:https?:\/\/[^\)]+|mailto:[^\)]+)\)/g, "$1");

  // 5. Clean up any trailing empty colons
  cleaned = cleaned.replace(/:\s*[।\.]/g, "।");
  cleaned = cleaned.replace(/[।\.]\s*([।\.])/g, "$1");

  // 6. Clean up duplicate empty lines or dangling list dashes
  cleaned = cleaned.replace(/^\s*-\s*$/gm, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}

/**
 * Dynamic Action Buttons Resolver:
 * Resolves interactive CTA buttons strictly from:
 * 1. AI-directed [ACTION: <type>] tags embedded by the model based on genuine intent.
 * 2. Live Admin-configured Action Buttons & keywords in /admin.
 * Zero hardcoded lists, URLs, or scripted fallbacks in code.
 */
function getImplicitActions(text: string, dynamicButtons?: ChatActionButton[]): MessageAction[] {
  const actions: MessageAction[] = [];
  if (!text || typeof text !== "string") return actions;

  const lower = text.toLowerCase();
  const activeButtons = (Array.isArray(dynamicButtons) && dynamicButtons.length > 0 ? dynamicButtons : DEFAULT_CHAT_ACTION_BUTTONS)
    .filter((b) => b && b.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // 1. Check for AI-driven explicit action tags: [ACTION: <type>] or [CTA: <type>]
  const tagMatches = text.match(/\[(?:ACTION|CTA):\s*([a-zA-Z0-9_-]+)\]/gi);
  if (tagMatches) {
    for (const match of tagMatches) {
      const type = match.replace(/\[(?:ACTION|CTA):\s*/i, "").replace(/\]/, "").trim().toLowerCase();
      const matchedBtn = activeButtons.find((b) => b.type.toLowerCase() === type || b.id.toLowerCase() === type);
      if (matchedBtn && !actions.some((a) => a.type === matchedBtn.type)) {
        actions.push({
          label: matchedBtn.label,
          type: matchedBtn.type,
          url: matchedBtn.url,
          primary: !!matchedBtn.primary,
        });
      }
    }
  }

  // 2. Evaluate Admin Dynamic Action Buttons triggerKeywords (configured in /admin)
  // Guard: If the text is a polite closing or courtesy acknowledgment (e.g. "you're welcome", "take care", "goodbye"),
  // do NOT attach CTA buttons unless explicitly requested via [ACTION: ...] tag.
  const isPoliteClosing = /^(?:you(?:'re| are)?\s+welcome|no problem|anytime|glad to help|my pleasure|have a (?:great|good|nice) day|take care|bye|goodbye|বিদায়|ধন্যবাদ|স্বাগতম)\b/i.test(lower.trim());

  if (!isPoliteClosing) {
    for (const btn of activeButtons) {
      if (actions.some((a) => a.type === btn.type)) continue;
      const keywords = Array.isArray(btn.triggerKeywords) ? btn.triggerKeywords : [];
      // Match keywords as whole words or precise phrases rather than arbitrary substrings
      const isMatched = keywords.some((k) => {
        if (!k || !k.trim()) return false;
        const kw = k.trim().toLowerCase();
        // For short single-word keywords like 'work' or 'kaj', require word boundary matching
        if (/^[a-z0-9_-]+$/i.test(kw)) {
          const regex = new RegExp(`\\b${kw}\\b`, "i");
          return regex.test(lower);
        }
        return lower.includes(kw);
      });
      if (isMatched) {
        actions.push({
          label: btn.label,
          type: btn.type,
          url: btn.url,
          primary: !!btn.primary,
        });
      }
    }
  }

  return actions;
}

/**
 * Returns a concise, punchy title for FAQ suggestions (keeps pills short and clean)
 */
function getFaqDisplayTitle(faq: FaqFallbackItem): string {
  if (faq.shortTitle && faq.shortTitle.trim()) {
    return faq.shortTitle.trim();
  }
  return faq.question.trim();
}

/** Opens external links; mailto/tel go through the current window so no blank tab is left behind. */
function openExternal(url: string) {
  if (/^(mailto:|tel:)/i.test(url)) {
    window.location.href = url;
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Project Brief Sheet — two quiet steps inside the chat drawer.
 * Step 1: choices only (category list, budget slider, timeline segments).
 * Step 2: contact + optional notes, with a one-line recap of step 1.
 * Props, state values, option strings and the submit payload are unchanged.
 */
function FullWidthProjectBriefSheet({
  isLight,
  onClose,
  onSubmitBrief,
  briefSettings,
}: {
  isLight: boolean;
  onClose: () => void;
  onSubmitBrief: (data: {
    name: string;
    emailOrPhone: string;
    projectType: string;
    budget: string;
    timeline: string;
    notes: string;
  }) => Promise<void>;
  briefSettings?: any;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const storedLead = getStoredUserLead();
  const [name, setName] = useState(() => storedLead?.name || "");
  const [emailOrPhone, setEmailOrPhone] = useState(
    () => storedLead?.emailOrPhone || storedLead?.phone || storedLead?.email || ""
  );

  const cfg = briefSettings || DEFAULT_PROJECT_BRIEF_SETTINGS;

  const projectTypes: string[] =
    Array.isArray(cfg.categories) && cfg.categories.length > 0
      ? cfg.categories
      : DEFAULT_PROJECT_BRIEF_SETTINGS.categories;

  const rawBudgetOptions: string[] =
    Array.isArray(cfg.budgetOptions) && cfg.budgetOptions.length > 0
      ? cfg.budgetOptions
      : DEFAULT_PROJECT_BRIEF_SETTINGS.budgetOptions;

  const enableFlex = cfg.enableFlexibleBudget !== false;

  const timelineOptions: Array<{ value: string; label: string; hint?: string }> =
    Array.isArray(cfg.timelineOptions) && cfg.timelineOptions.length > 0
      ? cfg.timelineOptions
      : DEFAULT_PROJECT_BRIEF_SETTINGS.timelineOptions;

  const [projectType, setProjectType] = useState(() => projectTypes[0] || "Brand Identity");
  const [budget, setBudget] = useState(() => rawBudgetOptions[1] || rawBudgetOptions[0] || "$500 - $1.5k");
  const [timeline, setTimeline] = useState(() => timelineOptions[1]?.value || timelineOptions[0]?.value || "Standard (2-4 wks)");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [contactErr, setContactErr] = useState("");

  const lastRangeIdx = useRef(1);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (projectTypes.length > 0 && !projectTypes.includes(projectType)) {
      setProjectType(projectTypes[0]);
    }
  }, [projectTypes]);

  useEffect(() => {
    if (rawBudgetOptions.length > 0 && !rawBudgetOptions.includes(budget) && budget !== "Flexible") {
      setBudget(rawBudgetOptions[0]);
    }
  }, [rawBudgetOptions]);

  // Budget slider covers the stops; "Flexible" is an optional separate toggle.
  const rangeStops = rawBudgetOptions;
  const isFlexible = enableFlex && budget === "Flexible";
  const rangeIdx = isFlexible
    ? lastRangeIdx.current
    : Math.max(0, rangeStops.indexOf(budget));
  const activeTimeline = timelineOptions.find((o) => o.value === timeline);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let ok = true;
    if (!name.trim()) {
      setNameErr("Please enter your name");
      ok = false;
    } else {
      setNameErr("");
    }
    if (!emailOrPhone.trim()) {
      setContactErr("Please provide your WhatsApp number or Email");
      ok = false;
    } else {
      setContactErr("");
    }
    if (!ok) return;

    setErrorMsg("");
    setIsSubmitting(true);
    try {
      saveStoredUserLead({
        name: name.trim(),
        emailOrPhone: emailOrPhone.trim(),
      });
      await onSubmitBrief({
        name: name.trim(),
        emailOrPhone: emailOrPhone.trim(),
        projectType,
        budget,
        timeline,
        notes: notes.trim(),
      });
      setIsDone(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit. Please contact Rashed directly via WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared style tokens
  const line = isLight ? "border-zinc-200" : "border-white/10";
  const muted = isLight ? "text-zinc-500" : "text-zinc-400";
  const labelCls = `block mb-2 text-[13px] font-medium ${isLight ? "text-zinc-600" : "text-zinc-300"}`;
  const fieldBase = (invalid: boolean) =>
    `w-full px-4 rounded-xl border outline-none text-[16px] sm:text-[14px] transition-all ${
      invalid
        ? "border-rose-500"
        : isLight
          ? "border-transparent hover:border-zinc-300 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
          : "border-transparent hover:border-white/15 focus:border-purple-400 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-400/15"
    } ${
      isLight
        ? "bg-zinc-100/80 text-zinc-900 placeholder:text-zinc-400"
        : "bg-white/5 text-white placeholder:text-zinc-500"
    }`;
  const primaryBtn =
    "flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer";
  const ghostBtn = `inline-flex items-center justify-center h-12 px-5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
    isLight ? "border-zinc-200 text-zinc-700 hover:bg-zinc-100" : "border-white/10 text-zinc-300 hover:bg-white/5"
  }`;
  const headingCls = "text-[22px] font-bold tracking-tight leading-tight outline-none";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`absolute inset-0 z-40 flex flex-col backdrop-blur-2xl overflow-hidden ${
        isLight
          ? "bg-[#fafafa]/98 text-zinc-900"
          : "bg-[#090a10]/98 text-zinc-100"
      }`}
    >
      {/* Header: progress + close */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0 select-none">
        {isDone ? (
          <span />
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5" aria-hidden="true">
              <i className="block h-[3px] w-8 rounded-full bg-purple-500" />
              <i
                className={`block h-[3px] w-8 rounded-full transition-colors ${
                  step === 2 ? "bg-purple-500" : isLight ? "bg-zinc-200" : "bg-white/10"
                }`}
              />
            </div>
            <span className={`text-[11px] font-mono uppercase tracking-wider ${muted}`}>
              Step {step} of 2
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
            isLight
              ? "text-zinc-500 hover:text-zinc-900 hover:bg-black/5"
              : "text-zinc-400 hover:text-white hover:bg-white/10"
          }`}
          title="Back to conversation"
          aria-label="Back to conversation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {isDone ? (
        <div className="flex-1 overflow-y-auto px-5 py-8 scrollbar-thin">
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-xl tracking-tight">{cfg.successTitle || "Project Brief Received!"}</h3>
              <p className={`text-sm max-w-xs mx-auto leading-relaxed ${muted}`}>
                Thank you, <strong className={isLight ? "text-zinc-800" : "text-zinc-200"}>{name}</strong>! {cfg.successMessage || "Rashed has been notified with your project specifications and will review your scope promptly."}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
              <a
                href="https://wa.me/8801932623969?text=Hi%20Rashed%2C%20I%20just%20submitted%20a%20project%20brief%20through%20your%20portfolio!"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                {cfg.whatsappButtonText || "Chat Now on WhatsApp"}
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>

              <button type="button" onClick={onClose} className={`w-full ${ghostBtn}`}>
                Return to Chat
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-6 scrollbar-thin">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {step === 1 ? (
                <div className="space-y-7">
                  <div>
                    <h3 ref={headingRef} tabIndex={-1} className={headingCls}>
                      {cfg.step1Title || "What are we making?"}
                    </h3>
                    <p className={`mt-1 text-sm ${muted}`}>
                      {cfg.step1Subtitle || "Pick what fits. You can add detail next."}
                    </p>
                  </div>

                  {/* Category: one list, hairline dividers */}
                  <fieldset className="min-w-0">
                    <legend className={labelCls}>Project Category</legend>
                    <div className={`rounded-2xl border overflow-hidden ${line}`}>
                      {projectTypes.map((type, i) => {
                        const selected = projectType === type;
                        return (
                          <label
                            key={type}
                            className={`relative block cursor-pointer ${i > 0 ? `border-t ${line}` : ""}`}
                          >
                            <input
                              type="radio"
                              name="brief-category"
                              value={type}
                              checked={selected}
                              onChange={() => setProjectType(type)}
                              className="peer sr-only"
                            />
                            <span
                              className={`flex items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-purple-500 ${
                                selected
                                  ? isLight
                                    ? "bg-purple-500/10 text-purple-700"
                                    : "bg-purple-500/15 text-purple-300"
                                  : isLight
                                    ? "hover:bg-zinc-100/80"
                                    : "hover:bg-white/5"
                              }`}
                            >
                              {type}
                              <span
                                className={`shrink-0 w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center ${
                                  selected
                                    ? "border-purple-500"
                                    : isLight
                                      ? "border-zinc-300"
                                      : "border-white/25"
                                }`}
                                aria-hidden="true"
                              >
                                {selected && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {/* Budget: stepped slider + Flexible toggle */}
                  <div>
                    <label htmlFor="brief-budget" className={labelCls}>
                      Estimated Budget
                    </label>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div
                        className="font-mono text-xl font-medium tracking-tight min-w-0 break-words"
                        aria-live="polite"
                      >
                        {budget}
                      </div>
                      {enableFlex && (
                        <button
                          type="button"
                          aria-pressed={isFlexible}
                          onClick={() =>
                            setBudget(isFlexible ? rangeStops[lastRangeIdx.current] : "Flexible")
                          }
                          className={`shrink-0 text-xs font-mono px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
                            isFlexible
                              ? isLight
                                ? "bg-purple-500/10 border-purple-500 text-purple-700"
                                : "bg-purple-500/15 border-purple-400 text-purple-300"
                              : isLight
                                ? "border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-400"
                                : "border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
                          }`}
                        >
                          Flexible
                        </button>
                      )}
                    </div>
                    {rangeStops.length > 1 && (
                      <div className={`transition-opacity ${isFlexible ? "opacity-40" : ""}`}>
                        <input
                          id="brief-budget"
                          type="range"
                          min={0}
                          max={Math.max(0, rangeStops.length - 1)}
                          step={1}
                          value={rangeIdx}
                          disabled={isFlexible}
                          aria-valuetext={rangeStops[rangeIdx]}
                          onChange={(e) => {
                            const i = Number(e.target.value);
                            lastRangeIdx.current = i;
                            setBudget(rangeStops[i]);
                          }}
                          className="w-full h-5 cursor-pointer accent-purple-600 disabled:cursor-default"
                        />
                        <div className="flex justify-between px-2 mt-1" aria-hidden="true">
                          {rangeStops.map((s) => (
                            <i
                              key={s}
                              className={`block w-1 h-1 rounded-full ${isLight ? "bg-zinc-300" : "bg-white/20"}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline: segmented control */}
                  <fieldset className="min-w-0">
                    <legend className={labelCls}>Preferred Timeline</legend>
                    <div
                      className={`grid grid-cols-${Math.min(timelineOptions.length, 4)} gap-1 p-1 rounded-xl ${
                        isLight ? "bg-zinc-100" : "bg-white/5"
                      }`}
                      style={{ gridTemplateColumns: `repeat(${timelineOptions.length}, minmax(0, 1fr))` }}
                    >
                      {timelineOptions.map((opt) => {
                        const selected = timeline === opt.value;
                        return (
                          <label key={opt.value} className="relative block min-w-0 cursor-pointer">
                            <input
                              type="radio"
                              name="brief-timeline"
                              value={opt.value}
                              checked={selected}
                              onChange={() => setTimeline(opt.value)}
                              className="peer sr-only"
                            />
                            <span
                              className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500 ${
                                selected
                                  ? isLight
                                    ? "bg-white text-zinc-900 shadow-xs"
                                    : "bg-white/12 text-white"
                                  : isLight
                                    ? "text-zinc-500 hover:text-zinc-900"
                                    : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              {opt.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {activeTimeline?.hint && (
                      <p className={`mt-2.5 text-xs font-mono ${muted}`}>{activeTimeline.hint}</p>
                    )}
                  </fieldset>
                </div>
              ) : (
                <form
                  id="project-brief-form"
                  onSubmit={handleSubmit}
                  noValidate
                  className="space-y-6 text-left"
                >
                  <div>
                    <h3 ref={headingRef} tabIndex={-1} className={headingCls}>
                      {cfg.step2Title || "Where do I reach you?"}
                    </h3>
                    <p className={`mt-1 text-sm ${muted}`}>
                      {cfg.step2Subtitle || "Takes about 15 seconds."}
                    </p>
                  </div>

                  {/* Recap of step 1 */}
                  <div
                    className={`flex items-center justify-between gap-3 rounded-xl border border-dashed px-3.5 py-2.5 ${line}`}
                  >
                    <p className={`min-w-0 text-xs font-mono break-words ${muted}`}>
                      <span className={`font-medium ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>
                        {projectType}
                      </span>{" "}
                      · {budget} · {timeline}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="shrink-0 text-xs underline underline-offset-4 cursor-pointer text-purple-600 hover:text-purple-500 dark:text-purple-400"
                    >
                      Edit
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="brief-name" className="text-[13px] font-medium">
                        Your Name <span className="text-purple-500">*</span>
                      </label>
                      {storedLead?.name && (
                        <span className="text-[11px] font-mono text-purple-500">
                          ✓ Auto-filled
                        </span>
                      )}
                    </div>
                    <input
                      id="brief-name"
                      type="text"
                      placeholder="e.g. Alex Morgan"
                      autoComplete="name"
                      value={name}
                      aria-invalid={!!nameErr}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameErr) setNameErr("");
                      }}
                      className={`${fieldBase(!!nameErr)} h-12`}
                    />
                    {nameErr && <p className="mt-1.5 px-1 text-[13px] text-rose-500" role="alert">{nameErr}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="brief-contact" className="text-[13px] font-medium">
                        WhatsApp Number or Email <span className="text-purple-500">*</span>
                      </label>
                      {storedLead?.emailOrPhone && (
                        <span className="text-[11px] font-mono text-purple-500">
                          ✓ Auto-filled
                        </span>
                      )}
                    </div>
                    <input
                      id="brief-contact"
                      type="text"
                      placeholder="+880 1... or alex@brand.com"
                      autoComplete="email"
                      value={emailOrPhone}
                      aria-invalid={!!contactErr}
                      onChange={(e) => {
                        setEmailOrPhone(e.target.value);
                        if (contactErr) setContactErr("");
                      }}
                      className={`${fieldBase(!!contactErr)} h-12`}
                    />
                    {contactErr && <p className="mt-1.5 px-1 text-[13px] text-rose-500" role="alert">{contactErr}</p>}
                  </div>

                  <div>
                    <label htmlFor="brief-notes" className={labelCls}>
                      {cfg.scopeLabel || "Project Scope / Key Deliverables"}{" "}
                      <span className="opacity-70 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      id="brief-notes"
                      rows={3}
                      placeholder={cfg.scopePlaceholder || "A few lines on what you need designed."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={`${fieldBase(false)} py-3 resize-none leading-relaxed`}
                    />
                  </div>

                  {errorMsg && (
                    <p
                      className="text-xs text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 leading-relaxed"
                      role="alert"
                    >
                      {errorMsg}
                    </p>
                  )}

                  <p className={`text-[11px] flex items-center gap-1.5 ${muted}`}>
                    <Shield className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>{cfg.confidentialityNotice || "Strictly confidential. Direct communication with Rashed."}</span>
                  </p>
                </form>
              )}
            </motion.div>
          </div>

          {/* Sticky footer actions */}
          <div className={`shrink-0 px-5 py-4 border-t flex gap-2.5 ${line}`}>
            {step === 1 ? (
              <button type="button" onClick={() => setStep(2)} className={primaryBtn}>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button type="button" onClick={() => setStep(1)} className={ghostBtn}>
                  Back
                </button>
                <button
                  type="submit"
                  form="project-brief-form"
                  disabled={isSubmitting}
                  className={primaryBtn}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Project Scope...</span>
                    </>
                  ) : (
                    <>
                      <span>{cfg.submitButtonText || "Send Project Brief"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

/**
 * Clean Welcome Page — Exact Implementation of User's Provided Spec.
 * - Synced with site brand colors and theme (Dark Mode & Light Mode)
 * - Brand text logo top-left matching header/hero (or uploaded image logo)
 * - Centered 32px rounded glass card with Figtree typography
 * - Two 56px pill input fields with separator icon & real-time validation
 * - 56px brand gradient pill CTA button with shadow & chat icon
 * - Connecting loading state with animated dots and "Edit details"
 * - Admin synchronized: Titles, Subtitle, CTA text, and Logo
 */
function FullWidthWelcomeScreen({
  isLight,
  personalInfo,
  siteSettings,
  chatbotSettings,
  onStartChat,
  onClose,
}: {
  isLight: boolean;
  personalInfo?: any;
  siteSettings?: any;
  chatbotSettings?: ChatbotSettings;
  onStartChat: (data?: { name: string; emailOrPhone: string }) => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const handoffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (handoffTimer.current) clearTimeout(handoffTimer.current);
    };
  }, []);

  const welcomeTitle = chatbotSettings?.welcomeTitle || "Welcome";
  const welcomeSubtitle = chatbotSettings?.welcomeSubtitle || "Let’s chat together";
  const welcomeButtonText = chatbotSettings?.welcomeButtonText || "Chat now";

  // Derive text logo from personal info (matching site header / hero, e.g. "RASHED.P")
  // Strip any HTML tags (e.g. <div><span>) in case user used styled rich text in Admin
  const rawName = String(personalInfo?.name || "Rashed Pervej");
  const cleanFullName = rawName.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const nameParts = cleanFullName.split(" ").filter(Boolean);
  const firstName = nameParts.length > 0 ? nameParts[0].toUpperCase() : "RASHED";
  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toUpperCase() : "P";

  // Brand colors
  const brandPrimary = siteSettings?.primaryColor || "#8b5cf6";
  const brandDeep = isLight ? "#6d28d9" : "#5b21b6";

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    let ok = true;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setNameErr("Enter your name.");
      ok = false;
    } else {
      setNameErr("");
    }

    const digits = cleanPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      setPhoneErr("Enter your mobile number.");
      ok = false;
    } else if (digits.length < 7 || !/^\+?[\d\s\-()]+$/.test(cleanPhone)) {
      setPhoneErr("Use a valid number with country code.");
      ok = false;
    } else {
      setPhoneErr("");
    }

    if (!ok) return;

    // Persist lead profile immediately
    saveStoredUserLead({
      name: cleanName,
      emailOrPhone: cleanPhone,
    });

    // Transition to Connecting state
    setIsConnecting(true);

    // Smooth handoff to chat
    handoffTimer.current = setTimeout(() => {
      onStartChat({
        name: cleanName,
        emailOrPhone: cleanPhone,
      });
    }, 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto select-none"
      style={{
        background: isLight
          ? `radial-gradient(90% 60% at 80% 0%, rgba(167, 139, 250, 0.32), transparent 70%),
             radial-gradient(70% 50% at 0% 100%, rgba(139, 92, 246, 0.22), transparent 70%),
             #f8f9fd`
          : `radial-gradient(90% 60% at 80% 0%, rgba(139, 92, 246, 0.45), transparent 70%),
             radial-gradient(70% 50% at 0% 100%, rgba(109, 40, 217, 0.38), transparent 70%),
             #090a12`,
        backgroundColor: isLight ? "#f8f9fd" : "#090a12",
        color: isLight ? "#0f172a" : "#ffffff",
        fontFamily: '"Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Top Left Logo Sync & Actions */}
      <div className="w-full flex items-center justify-between pt-1">
        {chatbotSettings?.welcomeLogoUrl ? (
          <img
            src={chatbotSettings.welcomeLogoUrl}
            alt="Brand mark"
            className="h-8 max-h-8 w-auto object-contain max-w-[130px]"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={`font-display font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-0.5 ${
                isLight ? "text-zinc-900" : "text-white"
              }`}
            >
              {firstName}
              <span className={isLight ? "text-purple-600" : "text-purple-400"}>.</span>
              {lastInitial}
            </span>
          </div>
        )}

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onStartChat()}
            className={`text-sm px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
              isLight ? "text-zinc-600 hover:text-purple-700 hover:bg-black/5" : "text-purple-200 hover:text-white hover:bg-white/5"
            }`}
          >
            Skip for now →
          </button>
        </div>
      </div>

      {/* Centered Main Card */}
      <div className="my-auto py-4 flex flex-col items-center justify-center w-full">
        <div
          className="w-full max-w-[380px] rounded-[32px] p-8 sm:p-9 text-center transition-all"
          style={{
            background: isLight ? "rgba(255, 255, 255, 0.88)" : "rgba(18, 20, 32, 0.72)",
            border: isLight ? "1px solid rgba(139, 92, 246, 0.22)" : "1px solid rgba(167, 139, 250, 0.22)",
            boxShadow: isLight
              ? "0 20px 50px -12px rgba(100, 110, 160, 0.16)"
              : "0 25px 60px -15px rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {!isConnecting ? (
            <>
              {/* Head */}
              <div>
                <h1
                  className={`m-0 text-[32px] sm:text-[34px] font-bold leading-tight tracking-[-0.025em] ${
                    isLight ? "text-zinc-950 font-display" : "text-white font-display"
                  }`}
                >
                  {welcomeTitle}
                </h1>
                <p className={`mt-2 text-base ${isLight ? "text-zinc-600" : "text-purple-200/80"}`}>
                  {welcomeSubtitle}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate className="mt-7 flex flex-col gap-4 text-left">
                {/* Field 1: Your real name */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="sr-only" htmlFor="welcome-name">Your real name</label>
                  <div
                    className={`h-14 px-5 rounded-[20px] flex items-center gap-4 transition-all ${
                      nameErr
                        ? isLight
                          ? "border-rose-500"
                          : "border-[#ff9f97]"
                        : isLight
                          ? "border-purple-200/80 focus-within:border-purple-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-500/15"
                          : "border-[rgba(167,139,250,0.2)] focus-within:border-purple-400 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-purple-500/20"
                    }`}
                    style={{
                      background: isLight ? "rgba(245, 243, 255, 0.75)" : "rgba(255, 255, 255, 0.055)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`shrink-0 ${isLight ? "text-purple-600" : "text-purple-300"}`}
                    >
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"/>
                    </svg>
                    <i
                      className={`w-[1px] h-7 shrink-0 ${isLight ? "bg-purple-200" : "bg-white/15"}`}
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      id="welcome-name"
                      placeholder="Your real name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameErr) setNameErr("");
                      }}
                      className={`flex-1 min-w-0 h-full bg-transparent border-0 outline-none select-text text-base font-medium ${
                        isLight
                          ? "text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal"
                          : "text-white placeholder:text-purple-300/50 placeholder:font-normal"
                      }`}
                    />
                  </div>
                  {nameErr && (
                    <p className={`m-0 px-1 text-[13px] ${isLight ? "text-rose-600 font-medium" : "text-[#ff9f97]"}`}>
                      {nameErr}
                    </p>
                  )}
                </div>

                {/* Field 2: Your mobile number */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="sr-only" htmlFor="welcome-phone">Your mobile number</label>
                  <div
                    className={`h-14 px-5 rounded-[20px] flex items-center gap-4 transition-all ${
                      phoneErr
                        ? isLight
                          ? "border-rose-500"
                          : "border-[#ff9f97]"
                        : isLight
                          ? "border-purple-200/80 focus-within:border-purple-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-500/15"
                          : "border-[rgba(167,139,250,0.2)] focus-within:border-purple-400 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-purple-500/20"
                    }`}
                    style={{
                      background: isLight ? "rgba(245, 243, 255, 0.75)" : "rgba(255, 255, 255, 0.055)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`shrink-0 ${isLight ? "text-purple-600" : "text-purple-300"}`}
                    >
                      <path d="M5 4h3.5l1.8 4.5-2.2 1.4a11 11 0 0 0 5 5l1.4-2.2L19 14.5V18a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2z"/>
                    </svg>
                    <i
                      className={`w-[1px] h-7 shrink-0 ${isLight ? "bg-purple-200" : "bg-white/15"}`}
                      aria-hidden="true"
                    />
                    <input
                      type="tel"
                      id="welcome-phone"
                      inputMode="tel"
                      placeholder="Your mobile number"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneErr) setPhoneErr("");
                      }}
                      className={`flex-1 min-w-0 h-full bg-transparent border-0 outline-none select-text text-base font-medium ${
                        isLight
                          ? "text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal"
                          : "text-white placeholder:text-purple-300/50 placeholder:font-normal"
                      }`}
                    />
                  </div>
                  {phoneErr && (
                    <p className={`m-0 px-1 text-[13px] ${isLight ? "text-rose-600 font-medium" : "text-[#ff9f97]"}`}>
                      {phoneErr}
                    </p>
                  )}
                </div>

                {/* Pill CTA Button */}
                <button
                  type="submit"
                  className="mt-2 h-14 w-full flex items-center justify-center gap-2.5 text-base font-semibold text-white rounded-full transition-all cursor-pointer active:scale-[0.985] hover:brightness-110 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${brandPrimary}, ${brandDeep})`,
                    border: "0",
                    boxShadow: isLight
                      ? `inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 8px 24px -8px rgba(124, 58, 237, 0.55)`
                      : `inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 8px 24px -10px rgba(139, 92, 246, 0.8)`,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0 text-white">
                    <path d="M5 3h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6.6L7 21.2a.6.6 0 0 1-1-.5V17H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"/>
                    <circle cx="8.5" cy="10" r="1.3" fill="currentColor" className="opacity-70 text-purple-950"/>
                    <circle cx="12" cy="10" r="1.3" fill="currentColor" className="opacity-70 text-purple-950"/>
                    <circle cx="15.5" cy="10" r="1.3" fill="currentColor" className="opacity-70 text-purple-950"/>
                  </svg>
                  <span>{welcomeButtonText}</span>
                </button>
              </form>
            </>
          ) : (
            /* Done / Connecting Screen */
            <div className="py-4 flex flex-col items-center gap-2 animate-fade-in">
              <h1 className={`m-0 text-3xl font-bold tracking-tight ${isLight ? "text-zinc-950 font-display" : "text-white font-display"}`}>
                Hi, {name.trim().split(" ")[0] || "Friend"}
              </h1>
              <p className={`text-base m-0 ${isLight ? "text-zinc-600" : "text-purple-200/80"}`}>
                Connecting you to the chat
              </p>
              <div className="flex gap-1.5 mt-4">
                <i className={`w-2 h-2 rounded-full ${isLight ? "bg-purple-600" : "bg-purple-400"} animate-pulse`} />
                <i className={`w-2 h-2 rounded-full ${isLight ? "bg-purple-600" : "bg-purple-400"} animate-pulse [animation-delay:0.15s]`} />
                <i className={`w-2 h-2 rounded-full ${isLight ? "bg-purple-600" : "bg-purple-400"} animate-pulse [animation-delay:0.3s]`} />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (handoffTimer.current) clearTimeout(handoffTimer.current);
                  setIsConnecting(false);
                }}
                className={`mt-6 text-sm underline underline-offset-4 cursor-pointer bg-transparent border-0 ${
                  isLight ? "text-purple-600 hover:text-purple-800" : "text-purple-300 hover:text-white"
                }`}
              >
                Edit details
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Conversation History Sheet — gives user access to previous chats.
 * Conversations are never deleted by users; they can switch threads or start a fresh one.
 */
function ConversationHistorySheet({
  isLight,
  activeConvId,
  threads,
  onSelectThread,
  onNewChat,
  onClose,
  isSoundEnabled,
  onToggleSound,
}: {
  isLight: boolean;
  activeConvId: string;
  threads: ChatThread[];
  onSelectThread: (thread: ChatThread) => void;
  onNewChat: () => void;
  onClose: () => void;
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
      className={`absolute inset-0 z-40 flex flex-col backdrop-blur-2xl overflow-hidden ${
        isLight ? "bg-[#fafafa]/98 text-zinc-900" : "bg-[#090a10]/98 text-zinc-100"
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-200/70 dark:border-white/10 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-purple-500" />
          <h3 className="font-display font-bold text-base tracking-tight">
            Conversations
          </h3>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Sound Toggle in History Header */}
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                isSoundEnabled
                  ? "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                  : isLight
                    ? "text-zinc-400 hover:text-zinc-700 hover:bg-black/5"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              }`}
              title={isSoundEnabled ? "Mute chat sounds" : "Enable chat sounds"}
              aria-label={isSoundEnabled ? "Mute chat sounds" : "Enable chat sounds"}
            >
              {isSoundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 opacity-70" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isLight ? "text-zinc-500 hover:text-zinc-900 hover:bg-black/5" : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
            title="Back to conversation"
            aria-label="Back to conversation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Threads List Area (Relative for floating button) */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-2.5 scrollbar-thin">
          {threads.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className={`text-sm font-medium ${isLight ? "text-zinc-700" : "text-zinc-300"}`}>
                No previous conversations yet
              </p>
              <p className={`text-xs max-w-xs mx-auto ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                Your chats are saved automatically and can be resumed at any time.
              </p>
            </div>
          ) : (
            threads.map((t) => {
              const isActive = t.id === activeConvId;
              const validMsgs = (t.messages || []).filter((m) => m.id !== "welcome");
              const lastMsg = t.messages[t.messages.length - 1];
              let dateStr = "";
              try {
                dateStr = new Date(t.updatedAt || t.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
              } catch (_) {
                dateStr = "Recent";
              }

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectThread(t)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? isLight
                        ? "bg-purple-50/90 border-purple-300 ring-1 ring-purple-500/20 shadow-xs"
                        : "bg-purple-500/15 border-purple-500/40 ring-1 ring-purple-400/20 shadow-xs"
                      : isLight
                        ? "bg-white/80 border-zinc-200/80 hover:bg-white hover:border-purple-300"
                        : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-purple-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-semibold truncate ${
                        isActive
                          ? isLight ? "text-purple-900" : "text-purple-200"
                          : isLight ? "text-zinc-900" : "text-zinc-100"
                      }`}
                    >
                      {t.title || "Conversation"}
                    </span>
                    <span className={`text-[10px] font-mono shrink-0 ${isLight ? "text-zinc-400" : "text-zinc-500"}`}>
                      {dateStr}
                    </span>
                  </div>

                  {lastMsg && (
                    <p className={`text-xs line-clamp-1 leading-relaxed ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                      {lastMsg.content.slice(0, 80)}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isActive
                          ? isLight ? "bg-purple-200/70 text-purple-800 font-semibold" : "bg-purple-500/30 text-purple-300 font-semibold"
                          : isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/10 text-zinc-400"
                      }`}
                    >
                      {validMsgs.length} messages
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-semibold text-purple-500 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Floating New Chat Button anchored to bottom-right above the footer */}
        <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer border border-purple-400/30"
            title="Start a new chat"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </motion.button>
        </div>
      </div>

      {/* Footer note */}
      <div
        className={`p-3 border-t text-center text-[11px] font-mono select-none truncate px-3 ${
          isLight ? "border-zinc-200 text-zinc-500 bg-zinc-50" : "border-white/10 text-zinc-400 bg-black/20"
        }`}
      >
        {(() => {
          const lead = getStoredUserLead();
          if (lead?.name) {
            return (
              <span className="truncate">
                {lead.name}
                {lead.emailOrPhone ? ` | ${lead.emailOrPhone}` : ""}
              </span>
            );
          }
          return <span>All conversations are securely preserved on this device.</span>;
        })()}
      </div>
    </motion.div>
  );
}

function ProgressiveLeadGateModal({
  isLight,
  isMandatory,
  onClose,
  onSubmitLead,
}: {
  isLight: boolean;
  isMandatory: boolean;
  botName?: string;
  onClose: () => void;
  onSubmitLead: (lead: { name: string; emailOrPhone: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setNameErr("Enter your name.");
      valid = false;
    } else {
      setNameErr("");
    }

    const digits = cleanPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      setPhoneErr("Enter your mobile number or email.");
      valid = false;
    } else if (cleanPhone.includes("@")) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanPhone)) {
        setPhoneErr("Enter a valid email address.");
        valid = false;
      } else {
        setPhoneErr("");
      }
    } else if (digits.length < 7) {
      setPhoneErr("Use a valid number with country code.");
      valid = false;
    } else {
      setPhoneErr("");
    }

    if (!valid) return;

    setIsSubmitting(true);
    onSubmitLead({ name: cleanName, emailOrPhone: cleanPhone });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-[360px] rounded-[32px] p-6 sm:p-7 text-center relative transition-all"
        style={{
          background: isLight ? "rgba(255, 255, 255, 0.94)" : "rgba(18, 20, 32, 0.88)",
          border: isLight ? "1px solid rgba(139, 92, 246, 0.22)" : "1px solid rgba(167, 139, 250, 0.22)",
          boxShadow: isLight
            ? "0 20px 50px -12px rgba(100, 110, 160, 0.22)"
            : "0 25px 60px -15px rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* If not mandatory, show top-right close X */}
        {!isMandatory && (
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight
                ? "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
            aria-label="Skip for now"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Head */}
        <div>
          <h2
            className={`m-0 text-2xl sm:text-[26px] font-bold leading-tight tracking-[-0.02em] ${
              isLight ? "text-zinc-950 font-display" : "text-white font-display"
            }`}
          >
            Stay Connected
          </h2>
          <p className={`mt-2 text-xs sm:text-[13px] leading-relaxed ${isLight ? "text-zinc-600" : "text-purple-200/80"}`}>
            Enter once. Use them for future chats and project briefs.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-3.5 text-left">
          {/* Field 1: Name */}
          <div className="flex flex-col gap-1 min-w-0">
            <label className="sr-only" htmlFor="lead-modal-name">Your real name</label>
            <div
              className={`h-13 px-4 rounded-[18px] flex items-center gap-3.5 transition-all ${
                nameErr
                  ? isLight
                    ? "border-rose-500"
                    : "border-[#ff9f97]"
                  : isLight
                    ? "border-purple-200/80 focus-within:border-purple-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-500/15"
                    : "border-[rgba(167,139,250,0.2)] focus-within:border-purple-400 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-purple-500/20"
              }`}
              style={{
                background: isLight ? "rgba(245, 243, 255, 0.75)" : "rgba(255, 255, 255, 0.055)",
                borderWidth: "1px",
                borderStyle: "solid",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`shrink-0 ${isLight ? "text-purple-600" : "text-purple-300"}`}
              >
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"/>
              </svg>
              <i
                className={`w-[1px] h-6 shrink-0 ${isLight ? "bg-purple-200" : "bg-white/15"}`}
                aria-hidden="true"
              />
              <input
                type="text"
                id="lead-modal-name"
                placeholder="Your real name"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameErr) setNameErr("");
                }}
                className={`flex-1 min-w-0 h-full bg-transparent border-0 outline-none select-text text-sm sm:text-base font-medium ${
                  isLight
                    ? "text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal"
                    : "text-white placeholder:text-purple-300/50 placeholder:font-normal"
                }`}
              />
            </div>
            {nameErr && (
              <p className={`m-0 px-1 text-[12px] ${isLight ? "text-rose-600 font-medium" : "text-[#ff9f97]"}`}>
                {nameErr}
              </p>
            )}
          </div>

          {/* Field 2: Mobile Number / Email */}
          <div className="flex flex-col gap-1 min-w-0">
            <label className="sr-only" htmlFor="lead-modal-contact">Mobile Number / Email</label>
            <div
              className={`h-13 px-4 rounded-[18px] flex items-center gap-3.5 transition-all ${
                phoneErr
                  ? isLight
                    ? "border-rose-500"
                    : "border-[#ff9f97]"
                  : isLight
                    ? "border-purple-200/80 focus-within:border-purple-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-500/15"
                    : "border-[rgba(167,139,250,0.2)] focus-within:border-purple-400 focus-within:bg-white/[0.08] focus-within:ring-4 focus-within:ring-purple-500/20"
              }`}
              style={{
                background: isLight ? "rgba(245, 243, 255, 0.75)" : "rgba(255, 255, 255, 0.055)",
                borderWidth: "1px",
                borderStyle: "solid",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`shrink-0 ${isLight ? "text-purple-600" : "text-purple-300"}`}
              >
                <path d="M5 4h3.5l1.8 4.5-2.2 1.4a11 11 0 0 0 5 5l1.4-2.2L19 14.5V18a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2z"/>
              </svg>
              <i
                className={`w-[1px] h-6 shrink-0 ${isLight ? "bg-purple-200" : "bg-white/15"}`}
                aria-hidden="true"
              />
              <input
                type="text"
                id="lead-modal-contact"
                placeholder="Mobile number or email"
                autoComplete="email"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneErr) setPhoneErr("");
                }}
                className={`flex-1 min-w-0 h-full bg-transparent border-0 outline-none select-text text-sm sm:text-base font-medium ${
                  isLight
                    ? "text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal"
                    : "text-white placeholder:text-purple-300/50 placeholder:font-normal"
                }`}
              />
            </div>
            {phoneErr && (
              <p className={`m-0 px-1 text-[12px] ${isLight ? "text-rose-600 font-medium" : "text-[#ff9f97]"}`}>
                {phoneErr}
              </p>
            )}
          </div>

          {/* Pill CTA Button (same style as welcome page) */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1.5 h-13 w-full flex items-center justify-center gap-2 text-base font-semibold text-white rounded-full transition-all cursor-pointer active:scale-[0.985] hover:brightness-110 shadow-lg"
            style={{
              background: `linear-gradient(135deg, #8b5cf6, #6d28d9)`,
              border: "0",
              boxShadow: isLight
                ? `inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 8px 24px -8px rgba(124, 58, 237, 0.55)`
                : `inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 8px 24px -10px rgba(139, 92, 246, 0.8)`,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>

          {/* Skip option (when not mandatory) */}
          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className={`mt-1 py-1 text-sm font-medium transition-colors cursor-pointer text-center ${
                isLight ? "text-zinc-500 hover:text-purple-700" : "text-purple-300/90 hover:text-white"
              }`}
            >
              Skip for now →
            </button>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
}

function getDynamicGreeting(customGreeting?: string): string {
  const hour = new Date().getHours();
  let timeSalutation = "Good morning";
  let timeVibe = "Excited to see you exploring Rashed's designs today.";
  if (hour >= 12 && hour < 17) {
    timeSalutation = "Good afternoon";
    timeVibe = "Great to have you here exploring Rashed's creative work.";
  } else if (hour >= 17 || hour < 5) {
    timeSalutation = "Good evening";
    timeVibe = "Hope you're having a relaxing night. Welcome to Rashed's portfolio.";
  }

  if (customGreeting && customGreeting.trim()) {
    const trimmed = customGreeting.trim();
    if (/^(Hello!?|Hi!?|Hey!?)\s*/i.test(trimmed)) {
      return trimmed.replace(/^(Hello!?|Hi!?|Hey!?)\s*/i, `${timeSalutation}! `);
    }
    if (!/Good\s+(morning|afternoon|evening)/i.test(trimmed)) {
      return `${timeSalutation}! ${trimmed}`;
    }
    return trimmed;
  }

  return `${timeSalutation}! ${timeVibe} I am Rashed's Creative Advisor. I can answer questions about his 6+ years of design experience, motion graphics skills, brand identity work, or how to hire him for a project. What would you like to know?`;
}

function formatReturningGreeting(template?: string, name?: string): string {
  const fallback = DEFAULT_CHATBOT_SETTINGS.returningGreetingMessage || "Welcome back, {name}! Great to have you here again. Feel free to start a new inquiry, discuss design packages, or submit another project brief below. What's on your mind?";
  const raw = (template && template.trim()) ? template.trim() : fallback;
  const clientName = (name && name.trim()) ? name.trim().split(/\s+/)[0] : "there";
  return raw.replace(/\{firstName\}/gi, clientName).replace(/\{name\}/gi, clientName);
}

let sharedAudioCtx: AudioContext | null = null;

function playWebAudioChatSound(type: "send" | "receive", isSoundEnabled: boolean) {
  if (!isSoundEnabled || typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;

    if (type === "send") {
      // Soft modern 'pop' droplet
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.07);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else {
      // Delicate double-tone harmonic chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880, now + 0.06); // A5

      osc2.frequency.setValueAtTime(880, now); // A5
      osc2.frequency.setValueAtTime(1174.66, now + 0.06); // D6

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.20);
      osc2.stop(now + 0.20);
    }
  } catch (_) {
    // Graceful ignore
  }
}

export default function AIChatBot() {
  const { siteSettings, portfolioData, theme } = usePortfolio();
  const isLight = theme === "light";

  const isChatbotEnabled = siteSettings?.enableChatbot !== false && (siteSettings?.enableChatbot as any) !== "false";

  const chatbotSettings = siteSettings?.chatbotSettings || DEFAULT_CHATBOT_SETTINGS;
  const botName = chatbotSettings?.botName || "Creative Advisor";
  const botSubtitle = chatbotSettings?.botSubtitle || "Online • Replies in real-time";
  const showAiBadge = chatbotSettings?.showAiBadge === true;
  const botBadgeText = chatbotSettings?.botBadgeText || "Studio Partner";
  const rawGreeting = chatbotSettings?.greetingMessage || DEFAULT_CHATBOT_SETTINGS.greetingMessage || "Hello! I am Rashed's Creative Advisor. I can answer questions about his 6+ years of design experience, motion graphics skills, brand identity work, or how to hire him for a project. What would you like to know?";
  const greetingMessage = getDynamicGreeting(rawGreeting);
  const enableStarterChips = chatbotSettings?.enableStarterChips !== false;
  const maxStarterChips = chatbotSettings?.maxStarterChips ?? 4;
  const enableQuickPills = chatbotSettings?.enableQuickPills !== false;
  const maxQuickPills = chatbotSettings?.maxQuickPills ?? 5;
  const actionButtons = chatbotSettings?.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS;
  const rawStarterQuestions = chatbotSettings?.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || [];
  const starterQuestions = rawStarterQuestions
    .filter((s) => s.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .slice(0, maxStarterChips);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  // Sound toggle state (defaults to on, persisted to localStorage)
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("portfolio_chat_sound") !== "false";
    } catch {
      return true;
    }
  });

  const playSound = (type: "send" | "receive") => {
    playWebAudioChatSound(type, isSoundEnabled);
  };

  // Welcome Liveness: 1-second thinking indicator + Human-speed Typewriter effect
  const [isWelcomeThinking, setIsWelcomeThinking] = useState(false);
  const [welcomeCharCount, setWelcomeCharCount] = useState<number>(Infinity);
  const [isWelcomeTypingDone, setIsWelcomeTypingDone] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("portfolio_chat_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 1) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  });
  const welcomeAnimatedRef = useRef(false);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("portfolio_chat_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validated = parsed
            .filter((m: any) => m && typeof m === "object" && (m.role === "user" || m.role === "model"))
            .map((m: any) => {
              const d = m.timestamp ? new Date(m.timestamp) : new Date();
              return {
                ...m,
                id: m.id || "msg_" + Math.random().toString(36).slice(2),
                content: typeof m.content === "string" ? m.content : "",
                timestamp: isNaN(d.getTime()) ? new Date() : d,
              };
            });
          if (validated.length > 0) {
            return validated;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse saved chat messages:", e);
    }
    const storedLead = getStoredUserLead();
    let initialGreeting = greetingMessage;
    if (storedLead && storedLead.name) {
      initialGreeting = formatReturningGreeting(chatbotSettings?.returningGreetingMessage, storedLead.name);
    }
    return [
      {
        id: "welcome",
        role: "model",
        content: initialGreeting,
        timestamp: new Date()
      }
    ];
  });

  // Sync welcome greeting if updated in Admin
  useEffect(() => {
    const storedLead = getStoredUserLead();
    let expectedGreeting = greetingMessage;
    if (storedLead && storedLead.name) {
      expectedGreeting = formatReturningGreeting(chatbotSettings?.returningGreetingMessage, storedLead.name);
    }
    setMessages((prev) => {
      if (prev.length === 1 && (prev[0].id === "welcome" || prev[0].id.startsWith("welcome"))) {
        return [{ ...prev[0], content: expectedGreeting }];
      }
      return prev;
    });
  }, [greetingMessage, chatbotSettings?.returningGreetingMessage]);

  const [isBriefSheetOpen, setIsBriefSheetOpen] = useState(false);
  const [preChatGatePassed, setPreChatGatePassed] = useState<boolean>(() => {
    try {
      const stored = getStoredUserLead();
      if (stored && stored.name) return true;
      return sessionStorage.getItem("portfolio_prechat_passed") === "true";
    } catch {
      return false;
    }
  });

  const isPreChatGateActive =
    chatbotSettings.enablePreChatGate !== false &&
    !preChatGatePassed &&
    !getStoredUserLead()?.name &&
    messages.length <= 1;

  // Liveness Typewriter entrance for initial welcome message (starts ONLY after passing Welcome Page)
  useEffect(() => {
    if (!isOpen || isPreChatGateActive) return;

    const isFreshWelcome = messages.length === 1 && (messages[0]?.id === "welcome" || messages[0]?.id?.startsWith("welcome"));
    if (isFreshWelcome && !welcomeAnimatedRef.current) {
      welcomeAnimatedRef.current = true;
      setIsWelcomeThinking(true);
      setIsWelcomeTypingDone(false);
      setWelcomeCharCount(0);

      const targetText = cleanDisplayContent(messages[0]?.content || greetingMessage);
      let interval: any = null;

      // Step 1: 1-second warm typing bubble
      const thinkingTimer = setTimeout(() => {
        setIsWelcomeThinking(false);

        // Step 2: Stream typing effect at natural fast human speed
        let current = 0;
        const speed = 16;
        interval = setInterval(() => {
          current += 2;
          if (current >= targetText.length) {
            setWelcomeCharCount(targetText.length);
            setIsWelcomeTypingDone(true);
            playWebAudioChatSound("receive", isSoundEnabled);
            if (interval) clearInterval(interval);
          } else {
            setWelcomeCharCount(current);
          }
        }, speed);
      }, 950);

      return () => {
        clearTimeout(thinkingTimer);
        if (interval) clearInterval(interval);
      };
    } else if (!isFreshWelcome) {
      setIsWelcomeThinking(false);
      setIsWelcomeTypingDone(true);
      setWelcomeCharCount(Infinity);
    }
  }, [isOpen, isPreChatGateActive, messages, greetingMessage, isSoundEnabled]);

  const [isLoading, setIsLoading] = useState(false);
  const isSendingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [progressiveGateState, setProgressiveGateState] = useState<"idle" | "stage1" | "stage2">("idle");
  const [stage1Dismissed, setStage1Dismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("portfolio_lead_stage1_dismissed") === "true";
    } catch {
      return false;
    }
  });
  const [inputFocused, setInputFocused] = useState(false);
  const [userLead, setUserLead] = useState<StoredUserLead | null>(() => getStoredUserLead());
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [savedThreads, setSavedThreads] = useState<ChatThread[]>(() => getSavedChatThreads());

  const [sessionId, setSessionId] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [conversationId, setConversationId] = useState<string>(() => {
    try {
      return (
        localStorage.getItem("portfolio_active_conv_id") ||
        ("conv_" + Math.random().toString(36).substring(2, 15))
      );
    } catch {
      return "conv_" + Math.random().toString(36).substring(2, 15);
    }
  });
  const [showFaqSuggestions, setShowFaqSuggestions] = useState(false);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!messageContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBottom(false);
  };

  const formatTime = (date: Date | string) => {
    try {
      const d = new Date(date);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Dynamic FAQ Knowledge Base (Single source of truth: Supabase `faq_knowledge_base`)
  const [dbFaqs, setDbFaqs] = useState<FaqFallbackItem[]>(() => getInitialFaqs());
  const [answeredFaqIds, setAnsweredFaqIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem("portfolio_answered_faqs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync FAQ knowledge base directly from Supabase
  useEffect(() => {
    let isSubscribed = true;
    const loadFaqs = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from("faq_knowledge_base")
            .select("id, question, answer, keywords, category, status")
            .eq("status", "published");
          if (data && !error && data.length > 0 && isSubscribed) {
            const initial = getInitialFaqs();
            const LEGACY_MAP: Record<string, string> = {
              "what creative tools are you proficient in?": "what creative design software and tools do you specialize in?",
              "where are you located and are you open to remote work?": "where are you located and what is your remote work availability?",
              "what is your current role and company?": "what is your professional background, current role, and experience?",
              "how many years of experience do you have?": "what is your professional background, current role, and experience?",
              "view portfolio": "where can i explore your verified design portfolio and case studies?",
              "can you describe your experience at chaldal ltd.?": "what is your professional background, current role, and experience?",
            };

            const canonicalDb: FaqFallbackItem[] = [];
            const handledCanonicals = new Set<string>();

            for (const d of data) {
              const rawQ = (d.question || "").toLowerCase().trim();
              const canonicalQ = LEGACY_MAP[rawQ] || rawQ;
              if (handledCanonicals.has(canonicalQ)) continue;
              handledCanonicals.add(canonicalQ);

              const masterMatch = initial.find((init) => init.question.trim().toLowerCase() === canonicalQ);
              if (masterMatch) {
                canonicalDb.push({
                  ...d,
                  question: masterMatch.question,
                  answer: masterMatch.answer,
                  shortTitle: masterMatch.shortTitle,
                  keywords: masterMatch.keywords,
                  category: masterMatch.category,
                  status: d.status || masterMatch.status,
                });
              } else {
                canonicalDb.push(d as FaqFallbackItem);
              }
            }

            const existingQuestions = new Set(canonicalDb.map((d) => d.question?.trim().toLowerCase()));
            const complementary = initial.filter((f) => !existingQuestions.has(f.question?.trim().toLowerCase()));
            setDbFaqs([...canonicalDb, ...complementary]);
            return;
          }
        } catch (e) {
          console.warn("Could not load dynamic FAQs from Supabase, using fallback:", e);
        }
      }
      if (isSubscribed) {
        setDbFaqs(getInitialFaqs());
      }
    };

    loadFaqs();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Save answered FAQ IDs
  useEffect(() => {
    try {
      sessionStorage.setItem("portfolio_answered_faqs", JSON.stringify(answeredFaqIds));
    } catch (_) {}
  }, [answeredFaqIds]);

  // Context-aware dynamic 5 FAQ suggestions
  const dynamicFaqSuggestions = React.useMemo(() => {
    // 1. Exclude already answered/viewed questions
    const unanswered = dbFaqs.filter(
      (f) => !answeredFaqIds.includes(f.id) && !answeredFaqIds.includes(f.question.trim().toLowerCase())
    );

    if (unanswered.length === 0) return [];

    // 2. Extract recent intent keywords from conversation messages
    const recentContext = messages
      .slice(-3)
      .map((m) => m.content.toLowerCase())
      .join(" ");

    let targetCategory: string | null = null;
    if (/(price|pricing|cost|budget|quote|rate|fee|how much|taka|dollar)/i.test(recentContext)) {
      targetCategory = "pricing";
    } else if (/(brand|logo|identity|styleguide|typography|guideline)/i.test(recentContext)) {
      targetCategory = "branding";
    } else if (/(packag|box|bottle|dieline|supplement|label|pouch)/i.test(recentContext)) {
      targetCategory = "packaging";
    } else if (/(motion|video|animation|after effects|reels|promo)/i.test(recentContext)) {
      targetCategory = "motion";
    } else if (/(process|timeline|how long|delivery|workflow|step|revision)/i.test(recentContext)) {
      targetCategory = "process";
    } else if (/(pay|payment|bank|wise|bkash|invoice|deposit)/i.test(recentContext)) {
      targetCategory = "payment";
    } else if (/(hire|contact|whatsapp|call|talk|meeting|email)/i.test(recentContext)) {
      targetCategory = "contact";
    }

    // 3. Score candidates based on relevance
    const scored = unanswered.map((faq) => {
      let score = 0;
      if (targetCategory && faq.category === targetCategory) {
        score += 15;
      }
      if (recentContext && Array.isArray(faq.keywords)) {
        for (const kw of faq.keywords) {
          if (recentContext.includes(kw.toLowerCase())) {
            score += 4;
          }
        }
      }
      return { faq, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Pick maximum 5
    return scored.slice(0, 5).map((s) => s.faq);
  }, [dbFaqs, answeredFaqIds, messages]);

  // Handler for clicking any FAQ pill
  const handleSelectFaq = (faq: FaqFallbackItem) => {
    setAnsweredFaqIds((prev) => [...prev, faq.id, faq.question.trim().toLowerCase()]);
    setShowSuggestions(false);
    handleSend(faq.question, true);
  };

  const initialSuggestions = dynamicFaqSuggestions.map((f) => f.question);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const sparkButtonRef = useRef<HTMLButtonElement>(null);

  // Close suggestions popover when clicking/tapping outside or pressing Escape
  useEffect(() => {
    if (!showSuggestions) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        sparkButtonRef.current &&
        !sparkButtonRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSuggestions]);

  useEffect(() => {
    // Generate or retrieve visitor_id (survives browser restart)
    let visId = localStorage.getItem("portfolio_visitor_id");
    if (!visId) {
      visId = "vis_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("portfolio_visitor_id", visId);
    }
    setVisitorId(visId);

    // Generate or retrieve session_id (lasts for the tab session)
    let sessId = sessionStorage.getItem("portfolio_session_id");
    if (!sessId) {
      sessId = "sess_" + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("portfolio_session_id", sessId);
    }
    setSessionId(sessId);

    // Retrieve or initialize conversation_id
    let activeConv = localStorage.getItem("portfolio_active_conv_id");
    if (!activeConv) {
      activeConv = "conv_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("portfolio_active_conv_id", activeConv);
    }
    setConversationId(activeConv);
  }, []);

  // Scroll only when a message is added or the typing state flips, never when an old
  // message is edited (feedback thumbs). A new bot reply scrolls to the START of that
  // reply so long answers are read from the top.
  const lastMsgCountRef = useRef(messages.length);
  useEffect(() => {
    const grew = messages.length !== lastMsgCountRef.current;
    lastMsgCountRef.current = messages.length;
    if (!isOpen) return;
    const last = messages[messages.length - 1];
    if (grew && last && last.role === "model" && messages.length > 1) {
      const el = document.getElementById("chat-msg-" + last.id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    if (grew || isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isLoading, isOpen]);

  // Opening the drawer lands on the latest message
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 60);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.innerWidth >= 640) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keep desktop input auto-focused after message reply completes
  const prevLoadingRef = useRef(isLoading);
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && isOpen && typeof window !== "undefined" && window.innerWidth >= 640) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, isOpen]);

  // Handle mobile hardware/browser back button: closes chat drawer instead of leaving page
  useEffect(() => {
    if (!isOpen) return;

    if (window.history.state?.portfolioChatOpen !== true) {
      window.history.pushState({ ...window.history.state, portfolioChatOpen: true }, "");
    }

    const handlePopState = () => {
      setIsOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isOpen]);

  const handleCloseChat = () => {
    if (window.history.state?.portfolioChatOpen === true) {
      window.history.back();
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // The brief sheet holds typed data and the suggestions popover handles Esc itself
      if (e.key !== "Escape" || isBriefSheetOpen || showSuggestions) return;
      handleCloseChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isBriefSheetOpen, showSuggestions]);

  // Touch gesture to swipe down and dismiss mobile drawer
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 60) {
      handleCloseChat();
    }
    touchStartY.current = null;
  };

  // Lock background page scroll on mobile when chat is open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.innerWidth < 640) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem("portfolio_chat_messages", JSON.stringify(messages));
      if (conversationId) {
        localStorage.setItem("portfolio_active_conv_id", conversationId);

        // Auto-archive thread into persistent threads list only when user has actually asked/sent a message
        const userMsg = messages.find((m) => m.role === "user");
        if (userMsg) {
          const title =
            userMsg.content.slice(0, 42) + (userMsg.content.length > 42 ? "…" : "");

          const currentThreads = getSavedChatThreads();
          const existingIdx = currentThreads.findIndex((t) => t.id === conversationId);

          const threadItem: ChatThread = {
            id: conversationId,
            createdAt: existingIdx >= 0 ? currentThreads[existingIdx].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            title:
              existingIdx >= 0 && currentThreads[existingIdx].title !== "Creative Consultation"
                ? currentThreads[existingIdx].title
                : title,
            messages,
          };

          const updatedThreads = [...currentThreads];
          if (existingIdx >= 0) {
            updatedThreads[existingIdx] = threadItem;
          } else {
            updatedThreads.unshift(threadItem);
          }

          const trimmed = updatedThreads.slice(0, 40);
          saveChatThreads(trimmed);
          setSavedThreads(trimmed);
        }
      }
    } catch (e) {
      console.warn("Failed to save chat messages:", e);
    }
  }, [messages, conversationId]);

  const logInteraction = async ({
    question,
    answer,
    source,
    responseTimeMs,
    tokenUsage = null,
  }: {
    question: string;
    answer: string;
    source: "FAQ" | "Knowledge Base" | "Gemini" | "Groq" | "OpenAI" | "OpenRouter" | "Feedback" | string;
    responseTimeMs?: number;
    tokenUsage?: number | null;
  }) => {
    if (!isSupabaseConfigured || !supabase) return;

    const payload = {
      question,
      answer,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      visitor_id: visitorId,
      response_source: source,
      response_time_ms: responseTimeMs || 0,
      token_usage: tokenUsage,
      conversation_id: conversationId,
    };

    try {
      await supabase.from("chatbot_interactions").insert(payload);
    } catch (err: any) {
      console.warn("[Supabase Audit] Interaction log warning:", err?.message || err);
    }
  };

  const handleFeedback = (messageId: string, type: "helpful" | "unhelpful", reason?: string) => {
    const targetMsg = messages.find((m) => m.id === messageId);
    let precedingPrompt = "";
    if (targetMsg) {
      const idx = messages.findIndex((m) => m.id === messageId);
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          precedingPrompt = messages[i].content;
          break;
        }
      }
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedback: type, feedbackReason: reason || m.feedbackReason } : m
      )
    );

    logInteraction({
      question: precedingPrompt
        ? `[FEEDBACK ${type.toUpperCase()}${reason ? ` (${reason})` : ""}] ${precedingPrompt}`
        : `[FEEDBACK ${type.toUpperCase()}${reason ? ` (${reason})` : ""}]`,
      answer: targetMsg?.content || `Target message: ${messageId}`,
      source: "Feedback"
    });
  };

  const handleSend = async (text: string, isPresetClick = false) => {
    const cleanText = text.trim();
    if (!cleanText || isSendingRef.current || isLoading) return;
    if (progressiveGateState === "stage2" && !getStoredUserLead()?.name) return;

    // Finish any ongoing welcome typewriter immediately
    setIsWelcomeThinking(false);
    setIsWelcomeTypingDone(true);
    setWelcomeCharCount(Infinity);

    // Immediate synchronous lock to prevent double clicks / rapid triggers
    isSendingRef.current = true;
    setIsLoading(true);
    playSound("send");

    const startTime = Date.now();

    const userMessage: Message = {
      id: "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      role: "user",
      content: cleanText,
      timestamp: new Date()
    };

    // Add user message with deduplication protection
    setMessages((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.role === "user" && last.content.trim() === cleanText) {
          return prev;
        }
      }
      return [...prev, userMessage];
    });
    setInput("");

    // Mark question as answered so dynamic FAQ suggestions replenish with the next relevant FAQ
    setAnsweredFaqIds((prev) => {
      const lower = cleanText.toLowerCase();
      if (!prev.includes(lower)) {
        return [...prev, lower];
      }
      return prev;
    });

    try {
      const historyToSend = messages.slice(-8).map((msg) => ({
        role: msg.role,
        content: msg.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanText,
          history: historyToSend,
          selectedModel: siteSettings?.aiRouterSettings?.selectedModel
        })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`[AIChatBot] Server returned HTTP ${res.status}:`, errText);
        throw new Error(`Server returned HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const responseText = data.text || "I'm sorry, I encountered an issue processing that request. Please try again.";

      // Human Conversational Micro-Pacing: Brief smoothing to prevent layout flashes without artificial sluggishness
      const elapsed = Date.now() - startTime;
      if (elapsed < 250) {
        await new Promise((resolve) => setTimeout(resolve, 250 - elapsed));
      }

      const responseTime = Date.now() - startTime;

      const botMessage: Message = {
        id: "bot_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        role: "model",
        content: responseText,
        timestamp: new Date(),
        actions: getImplicitActions(responseText, actionButtons)
      };

      // Add bot reply with strict duplicate prevention
      setMessages((prev) => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.role === "model" && last.content.trim() === responseText.trim()) {
            return prev;
          }
        }
        return [...prev, botMessage];
      });
      playSound("receive");

      // Progressive Lead Gate check (Stage 1 skippable @ 4 user msgs, Stage 2 mandatory @ 7 user msgs)
      const progressiveEnabled =
        chatbotSettings.enableProgressiveLeadGate !== false &&
        chatbotSettings.enablePromptBrief !== false;
      const currentStoredLead = getStoredUserLead();
      const hasLead = Boolean(currentStoredLead && currentStoredLead.name);

      if (progressiveEnabled && !hasLead) {
        const nextUserCount = messages.filter((m) => m.role === "user").length + 1;
        if (nextUserCount >= 7) {
          setTimeout(() => {
            setProgressiveGateState("stage2");
          }, 800);
        } else if (nextUserCount >= 4 && !stage1Dismissed) {
          setTimeout(() => {
            setProgressiveGateState("stage1");
          }, 800);
        }
      }

      // Log successful interaction with accurate source provider
      const rawProv = data.provider || data.source || "System";
      const resolvedSource =
        rawProv.toUpperCase() === "GROQ" ? "Groq" :
        rawProv.toUpperCase() === "GEMINI" ? "Gemini" :
        rawProv.toUpperCase() === "OPENAI" ? "OpenAI" :
        rawProv.toUpperCase() === "OPENROUTER" ? "OpenRouter" :
        rawProv.toUpperCase() === "FAQ" ? "FAQ" :
        rawProv.toUpperCase() === "SYSTEM" ? "System" : rawProv;

      const sourceWithFailover = data.failoverFrom
        ? `${resolvedSource} (Failover from ${data.failoverFrom})`
        : resolvedSource;

      logInteraction({
        question: cleanText,
        answer: responseText,
        source: sourceWithFailover,
        responseTimeMs: responseTime,
        tokenUsage: data.tokenUsage || null
      });
    } catch (error: any) {
      console.warn("[AIChatBot Chat Error - Activating Resilient Grounded Fallback]:", error?.message || error);

      // Conversational Micro-Pacing: Ensure natural thinking time before fallback appears
      const elapsedFallback = Date.now() - startTime;
      if (elapsedFallback < 1250) {
        await new Promise((resolve) => setTimeout(resolve, 1250 - elapsedFallback));
      }

      // Intelligent Client-Side Grounded FAQ Fallback:
      // If server is unreachable or encountering a transient error, check local dbFaqs
      const lowerQuery = cleanText.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
      const matchedFaq = (dbFaqs || []).find((f) => {
        const faqQ = (f.question || "").toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
        return (
          faqQ === lowerQuery ||
          (lowerQuery.length > 15 && faqQ.includes(lowerQuery)) ||
          (faqQ.length > 15 && lowerQuery.includes(faqQ))
        );
      });

      if (matchedFaq && matchedFaq.answer) {
        const faqReply = matchedFaq.answer;
        const botMessage: Message = {
          id: "bot_faq_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
          role: "model",
          content: faqReply,
          timestamp: new Date(),
          actions: getImplicitActions(faqReply, actionButtons)
        };
        setMessages((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (last.role === "model" && last.content.trim() === faqReply.trim()) {
              return prev;
            }
          }
          return [...prev, botMessage];
        });
        playSound("receive");
        logInteraction({
          question: cleanText,
          answer: faqReply,
          source: "FAQ (Client Fallback)",
          responseTimeMs: Date.now() - startTime,
          tokenUsage: null
        });
        return;
      }

      const isBengali = /[\u0980-\u09FF]/.test(cleanText) || /\b(koren|kori|korte|apnar|amake|ki|kemon|kothay|bhalo)\b/i.test(cleanText);
      const fallbackContent = isBengali
        ? "Rashed Pervej একজন Senior Visualizer ও Graphic Designer, যিনি **Brand Identity**, **Packaging Design** এবং **Motion Graphics**-এ বিশেষজ্ঞ। ওনার সাথে সরাসরি যোগাযোগ করতে নিচের WhatsApp বা Email বাটন ব্যবহার করুন:"
        : "Rashed Pervej is a Senior Visualizer specializing in **Brand Identity**, **Packaging Design**, and **Motion Graphics** with 6+ years of international experience. You can reach out directly via WhatsApp or Email below:";

      const errorMessage: Message = {
        id: "err_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        role: "model",
        content: fallbackContent,
        timestamp: new Date(),
        actions: [
          {
            label: "WhatsApp Rashed",
            type: "whatsapp",
            url: "https://wa.me/8801932623969",
            primary: true
          },
          {
            label: "Email Rashed",
            type: "email",
            url: "mailto:rashedpervej2011@gmail.com"
          }
        ]
      };

      setMessages((prev) => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.role === "model" && last.content.trim() === errorMessage.content.trim()) {
            return prev;
          }
        }
        return [...prev, errorMessage];
      });
      playSound("receive");

      const responseTime = Date.now() - startTime;
      logInteraction({
        question: cleanText,
        answer: `[ERROR_FALLBACK] ${error?.message || "Failed to reach backend services"}`,
        source: "System Fallback",
        responseTimeMs: responseTime,
        tokenUsage: null
      });
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
      if (typeof window !== "undefined" && window.innerWidth >= 640) {
        setTimeout(() => inputRef.current?.focus(), 60);
      }
    }
  };

  const handleStartNewChat = () => {
    // If the current conversation doesn't have any user question yet, don't create another empty chat!
    const hasUserMessage = messages.some((m) => m.role === "user");
    if (!hasUserMessage) {
      setShowHistoryDrawer(false);
      if (typeof window !== "undefined" && window.innerWidth >= 640) {
        setTimeout(() => inputRef.current?.focus(), 60);
      }
      return;
    }

    // Generate new unique conversation ID
    const newConvId = "conv_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
    setConversationId(newConvId);
    localStorage.setItem("portfolio_active_conv_id", newConvId);

    // Warm greeting for returning client or reset preChatGate for new guest
    const storedLead = getStoredUserLead();
    let initialBotText = greetingMessage;
    if (storedLead && storedLead.name) {
      initialBotText = formatReturningGreeting(chatbotSettings?.returningGreetingMessage, storedLead.name);
    } else {
      // If visitor never gave their lead details, new chat presents the Welcome Page again
      setPreChatGatePassed(false);
      try {
        sessionStorage.removeItem("portfolio_prechat_passed");
        localStorage.removeItem("portfolio_prechat_passed");
      } catch (_) {}
    }

    const freshMessages: Message[] = [
      {
        id: "welcome_" + Date.now(),
        role: "model",
        content: initialBotText,
        timestamp: new Date(),
      },
    ];

    setMessages(freshMessages);
    try {
      localStorage.setItem("portfolio_chat_messages", JSON.stringify(freshMessages));
    } catch (_) {}

    welcomeAnimatedRef.current = false;
    setIsWelcomeTypingDone(false);
    setWelcomeCharCount(0);

    setSavedThreads(getSavedChatThreads());
    setActiveSuggestions(initialSuggestions);
    setShowFaqSuggestions(false);
    setShowHistoryDrawer(false);
  };

  const handleSelectThread = (thread: ChatThread) => {
    welcomeAnimatedRef.current = true;
    setIsWelcomeThinking(false);
    setIsWelcomeTypingDone(true);
    setWelcomeCharCount(Infinity);
    setConversationId(thread.id);
    localStorage.setItem("portfolio_active_conv_id", thread.id);
    setMessages(thread.messages);
    setShowHistoryDrawer(false);
  };

  const handleSubmitLeadBrief = async (briefData: {
    name: string;
    emailOrPhone: string;
    projectType: string;
    budget: string;
    timeline: string;
    notes: string;
  }) => {
    // Determine Lead Score (Hot, Warm, or New)
    let leadScore = "warm";
    if (
      (briefData.budget && briefData.budget !== "Flexible") ||
      (briefData.timeline && briefData.timeline.includes("Urgent"))
    ) {
      leadScore = "hot";
    }

    const payload = {
      name: briefData.name,
      email: briefData.emailOrPhone.includes("@")
        ? briefData.emailOrPhone
        : `wa_${briefData.emailOrPhone.replace(/\D/g, "")}@whatsapp.lead`,
      phone: briefData.emailOrPhone.includes("@") ? "" : briefData.emailOrPhone,
      company: "",
      subject: `[${leadScore.toUpperCase()} LEAD] ${briefData.projectType} (via Chat Brief)`,
      message: `Project Type: ${briefData.projectType}\nApprox Budget: ${briefData.budget}\nTimeline: ${briefData.timeline}\nNotes: ${briefData.notes || "None provided"}\nVisitor ID: ${visitorId}\nReferrer: ${typeof document !== "undefined" ? document.referrer || "Direct" : "Direct"}`,
      notes: `Lead Score: ${leadScore.toUpperCase()} | Budget: ${briefData.budget} | Timeline: ${briefData.timeline} | Source: ${typeof document !== "undefined" ? document.referrer || "Direct" : "Direct"}`
    };

    let submittedSuccessfully = false;
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        submittedSuccessfully = true;
      }
    } catch (e) {
      // Serverless API network drop, fallback to direct Supabase
    }

    if (!submittedSuccessfully && isSupabaseConfigured && supabase) {
      try {
        const { error: sbErr } = await supabase.from("leads").insert([{
          name: payload.name,
          email: payload.email,
          phone: payload.phone || null,
          company: payload.company || null,
          subject: payload.subject,
          message: payload.message,
          status: "new",
          notes: payload.notes,
          created_at: new Date().toISOString()
        }]);
        if (!sbErr) {
          submittedSuccessfully = true;
        }
      } catch (sbError) {}
    }

    if (!submittedSuccessfully) {
      throw new Error("Unable to send project brief right now. Please reach out to Rashed directly via WhatsApp (+8801932623969).");
    }

    try {
      sessionStorage.setItem("portfolio_lead_submitted", "true");
    } catch (_) {}

    const savedLead = saveStoredUserLead({
      name: briefData.name,
      emailOrPhone: briefData.emailOrPhone,
    });
    setUserLead(savedLead);

    logInteraction({
      question: `[PROJECT BRIEF SUBMITTED] ${briefData.name} - ${briefData.projectType}`,
      answer: `Score: ${leadScore.toUpperCase()} | Contact: ${briefData.emailOrPhone}`,
      source: "Feedback"
    });
  };

  const handleCompletePreChatGate = async (gateData?: { name: string; emailOrPhone: string }) => {
    try {
      sessionStorage.setItem("portfolio_prechat_passed", "true");
    } catch (_) {}
    setPreChatGatePassed(true);

    welcomeAnimatedRef.current = false;
    setIsWelcomeTypingDone(false);
    setWelcomeCharCount(0);

    if (gateData?.name || gateData?.emailOrPhone) {
      const savedLead = saveStoredUserLead({
        name: gateData.name,
        emailOrPhone: gateData.emailOrPhone,
      });
      setUserLead(savedLead);

      // Personalize initial bot welcome message if visitor entered their name
      if (gateData.name) {
        const firstName = gateData.name.trim().split(/\s+/)[0];
        const personalizedGreeting = getDynamicGreeting(
          `Welcome ${firstName}! I am Rashed's Creative Advisor. I can answer questions about his 6+ years of design experience, motion graphics skills, brand identity work, or how to hire him for a project. What would you like to know?`
        );
        setMessages([
          {
            id: "welcome",
            role: "model",
            content: personalizedGreeting,
            timestamp: new Date(),
          },
        ]);
      }

      // Save visitor lead profile seamlessly
      try {
        await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: gateData.name || "Portfolio Visitor",
            email: gateData.emailOrPhone?.includes("@")
              ? gateData.emailOrPhone
              : `wa_${(gateData.emailOrPhone || "").replace(/\D/g, "")}@whatsapp.lead`,
            phone: gateData.emailOrPhone?.includes("@") ? "" : gateData.emailOrPhone,
            company: "",
            subject: `[PRE-CHAT VISITOR] ${gateData.name || "New Contact"} started chat`,
            message: `Visitor initiated conversation.\nName: ${gateData.name || "N/A"}\nContact: ${gateData.emailOrPhone || "N/A"}\nVisitor ID: ${visitorId}`,
            notes: `Pre-Chat Gate Entry | Visitor ID: ${visitorId}`
          })
        });
      } catch (_) {}
    }
  };

  const handleProgressiveLeadSubmit = async (leadData: { name: string; emailOrPhone: string }) => {
    const savedLead = saveStoredUserLead({
      name: leadData.name,
      emailOrPhone: leadData.emailOrPhone,
    });
    setUserLead(savedLead);
    try {
      sessionStorage.setItem("portfolio_prechat_passed", "true");
      localStorage.setItem("portfolio_prechat_passed", "true");
      sessionStorage.setItem("portfolio_lead_submitted", "true");
    } catch (_) {}
    setProgressiveGateState("idle");
    setPreChatGatePassed(true);

    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadData.name,
          email: leadData.emailOrPhone?.includes("@")
            ? leadData.emailOrPhone
            : `wa_${leadData.emailOrPhone.replace(/\D/g, "")}@whatsapp.lead`,
          phone: leadData.emailOrPhone?.includes("@") ? "" : leadData.emailOrPhone,
          company: "",
          subject: `[LEAD GATE] ${leadData.name} registered contact`,
          message: `Visitor registered contact via progressive lead gate.\nName: ${leadData.name}\nContact: ${leadData.emailOrPhone}\nVisitor ID: ${visitorId}`,
          notes: `Progressive Lead Gate Capture | Visitor ID: ${visitorId}`,
        }),
      });
    } catch (_) {}

    const confirmMessage: Message = {
      id: "lead_saved_" + Date.now(),
      role: "model",
      content: `✨ **Thank you, ${leadData.name}!** Your contact details are saved. Rashed can now review our discussion and follow up directly with you. Feel free to continue chatting!`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);
  };

  const handleDismissStage1 = () => {
    setProgressiveGateState("idle");
    setStage1Dismissed(true);
    try {
      sessionStorage.setItem("portfolio_lead_stage1_dismissed", "true");
    } catch (_) {}
  };

  // Sync progressive gate on open or messages change
  useEffect(() => {
    if (isOpen) {
      const progressiveEnabled =
        chatbotSettings.enableProgressiveLeadGate !== false &&
        chatbotSettings.enablePromptBrief !== false;
      const currentStoredLead = getStoredUserLead();
      const hasLead = Boolean(currentStoredLead && currentStoredLead.name);

      if (progressiveEnabled && !hasLead) {
        const userMsgCount = messages.filter((m) => m.role === "user").length;
        if (userMsgCount >= 7) {
          setProgressiveGateState("stage2");
        } else if (userMsgCount >= 4 && !stage1Dismissed) {
          setProgressiveGateState("stage1");
        }
      }
    }
  }, [isOpen, messages.length, stage1Dismissed, chatbotSettings.enableProgressiveLeadGate, chatbotSettings.enablePromptBrief]);

  if (!isChatbotEnabled) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-none flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              role="dialog"
              aria-label={botName}
              initial={
                typeof window !== "undefined" && window.innerWidth < 640
                  ? { opacity: 0, y: "100%" }
                  : { opacity: 0, y: 24, scale: 0.95 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                typeof window !== "undefined" && window.innerWidth < 640
                  ? { opacity: 0, y: "100%" }
                  : { opacity: 0, y: 24, scale: 0.95 }
              }
              transition={{
                type: "spring",
                damping: 28,
                stiffness: 320,
                mass: 0.75,
              }}
              className={`pointer-events-auto fixed sm:relative inset-x-0 bottom-0 top-0 sm:top-auto sm:inset-auto w-full sm:w-[420px] h-[100dvh] sm:h-[min(620px,calc(100dvh_-_7.5rem))] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden sm:mb-4 z-50 backdrop-blur-2xl ${
                isLight
                  ? "bg-[#fafafa]/98 border-purple-200/80 shadow-[0_20px_60px_-15px_rgba(147,51,234,0.22)]"
                  : "bg-[#090a10]/98 border-purple-500/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]"
              }`}
            >
              {/* Header with Touch Gesture Listener for Swipe-Down-to-Dismiss */}
              {!isPreChatGateActive && (
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className={`p-3 sm:p-4 border-b flex flex-col shrink-0 select-none ${
                    isLight
                      ? "bg-white/95 backdrop-blur-md border-zinc-200/80"
                      : "bg-zinc-950/95 backdrop-blur-md border-white/10"
                  }`}
                >
                  {/* Mobile Drag / Pull to Minimize Indicator */}
                  <div className="sm:hidden w-full flex justify-center pb-2 select-none -mt-1">
                    <button
                      type="button"
                      onClick={handleCloseChat}
                      aria-label="Minimize chat drawer"
                      className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 active:scale-95 transition-transform cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      {/* Avatar with Online Status Indicator */}
                      <div className="relative">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                            isLight ? "bg-purple-100 border border-purple-200" : "bg-purple-600/20 border border-purple-500/30"
                          }`}
                        >
                          <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 ${
                            isLight ? "border-white" : "border-[#0a0a12]"
                          } animate-pulse`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className={`font-display font-semibold text-sm sm:text-[15px] ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>
                            {botName}
                          </h3>
                          {showAiBadge ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                              AI
                            </span>
                          ) : botBadgeText ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-sans font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {botBadgeText}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center font-medium">
                          {botSubtitle}
                        </p>
                      </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {/* Sound Mute/Unmute Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSoundEnabled((prev) => {
                            const next = !prev;
                            try {
                              localStorage.setItem("portfolio_chat_sound", String(next));
                            } catch (_) {}
                            return next;
                          });
                        }}
                        className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                          isSoundEnabled
                            ? "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                            : isLight
                              ? "text-zinc-400 hover:text-zinc-700 hover:bg-black/5"
                              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        }`}
                        title={isSoundEnabled ? "Mute chat sounds" : "Enable chat sounds"}
                        aria-label={isSoundEnabled ? "Mute chat sounds" : "Enable chat sounds"}
                      >
                        {isSoundEnabled ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4 opacity-70" />
                        )}
                      </button>

                      {/* Home Button (opens Conversation History / SS2) */}
                      <button
                        type="button"
                        onClick={() => setShowHistoryDrawer(true)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                          showHistoryDrawer
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            : isLight
                              ? "text-zinc-500 hover:text-zinc-900 hover:bg-black/5"
                              : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                        }`}
                        title="Conversations & Home"
                        aria-label="Conversations & Home"
                      >
                        <Home className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseChat}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          isLight ? "text-zinc-500 hover:text-zinc-900 hover:bg-black/5" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                        }`}
                        title="Close chat"
                        aria-label="Close chat"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversation History Drawer Sheet */}
              <AnimatePresence>
                {showHistoryDrawer && (
                  <ConversationHistorySheet
                    isLight={isLight}
                    activeConvId={conversationId}
                    threads={savedThreads}
                    onSelectThread={handleSelectThread}
                    onNewChat={handleStartNewChat}
                    onClose={() => setShowHistoryDrawer(false)}
                    isSoundEnabled={isSoundEnabled}
                    onToggleSound={() => {
                      setIsSoundEnabled((prev) => {
                        const next = !prev;
                        try {
                          localStorage.setItem("portfolio_chat_sound", String(next));
                        } catch (_) {}
                        return next;
                      });
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Full-Width Project Brief Form Sheet (Idea Redesign) */}
              <AnimatePresence>
                {isBriefSheetOpen && (
                  <FullWidthProjectBriefSheet
                    isLight={isLight}
                    onClose={() => setIsBriefSheetOpen(false)}
                    onSubmitBrief={handleSubmitLeadBrief}
                    briefSettings={chatbotSettings?.projectBriefSettings}
                  />
                )}
              </AnimatePresence>

              {/* Clean CSS Welcome Screen (User Requested Reference Design) */}
              <AnimatePresence>
                {isPreChatGateActive && (
                  <FullWidthWelcomeScreen
                    isLight={isLight}
                    personalInfo={portfolioData?.personalInfo}
                    siteSettings={siteSettings}
                    chatbotSettings={chatbotSettings}
                    onStartChat={handleCompletePreChatGate}
                    onClose={handleCloseChat}
                  />
                )}
              </AnimatePresence>

              {/* Progressive Lead Gate Modal (Stage 1: Skippable @ 4 msgs, Stage 2: Mandatory @ 7 msgs) */}
              <AnimatePresence>
                {progressiveGateState !== "idle" && !getStoredUserLead()?.name && (
                  <ProgressiveLeadGateModal
                    isLight={isLight}
                    isMandatory={progressiveGateState === "stage2"}
                    botName={botName}
                    onClose={handleDismissStage1}
                    onSubmitLead={handleProgressiveLeadSubmit}
                  />
                )}
              </AnimatePresence>

              {/* Message Scroll Area & Input Bar */}
              {!isPreChatGateActive && (
                <>
                  <div className="relative flex-1 min-h-0 flex flex-col">
                    <div
                      ref={messageContainerRef}
                      onScroll={handleScroll}
                      onClick={() => setShowSuggestions(false)}
                      role="log"
                      aria-live="polite"
                      aria-relevant="additions"
                      aria-label="Conversation"
                      className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 scrollbar-thin cursor-default"
                    >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    id={"chat-msg-" + msg.id}
                    className={`flex flex-col scroll-mt-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-4 py-3 sm:py-2.5 text-[15px] sm:text-[14px] leading-relaxed tracking-normal ${
                        msg.role === "user"
                          ? isLight
                            ? "chat-user-bubble bg-purple-100/90 border border-purple-200 text-purple-950 font-medium rounded-br-xs font-sans shadow-2xs"
                            : "chat-user-bubble bg-purple-950/70 border border-purple-500/30 text-purple-100 rounded-br-xs font-sans shadow-2xs"
                          : isLight
                            ? "chat-bot-bubble bg-white/95 border border-zinc-200/80 text-zinc-900 rounded-bl-xs font-sans shadow-xs"
                            : "chat-bot-bubble bg-[#13141f]/95 border border-white/10 text-zinc-100 rounded-bl-xs font-sans"
                      }`}
                    >
                      {/* Render formatted text */}
                      {msg.role === "model" && (msg.id === "welcome" || msg.id.startsWith("welcome")) && isWelcomeThinking ? (
                        <div className="flex items-center gap-2 py-1 px-1">
                          <span className="flex items-center gap-1.5" aria-hidden="true">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                          </span>
                          <span className={`text-xs font-mono font-medium ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                            Typing...
                          </span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {msg.role === "model" && (msg.id === "welcome" || msg.id.startsWith("welcome")) && !isWelcomeTypingDone ? (
                            <p className="leading-relaxed">
                              {cleanDisplayContent(msg.content).slice(0, welcomeCharCount)}
                              <span className="inline-block w-1.5 h-3.5 bg-purple-500 animate-pulse ml-0.5 align-middle rounded-xs" />
                            </p>
                          ) : (
                            cleanDisplayContent(msg.content).split("\n").map((paragraph, idx) => {
                              const elements: React.ReactNode[] = [];
                              const regex = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
                              let lastIndex = 0;
                              let match: RegExpExecArray | null;

                              while ((match = regex.exec(paragraph)) !== null) {
                                if (match.index > lastIndex) {
                                  elements.push(paragraph.substring(lastIndex, match.index));
                                }
                                const token = match[0];
                                if (token.startsWith("**") && token.endsWith("**")) {
                                  const boldText = token.slice(2, -2);
                                  elements.push(
                                    <strong
                                      key={match.index}
                                      className={isLight ? "text-purple-700 font-semibold" : "text-purple-300 font-semibold"}
                                    >
                                      {boldText}
                                    </strong>
                                  );
                                } else if (token.startsWith("[") && token.includes("](")) {
                                  const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
                                  if (linkMatch) {
                                    const [, linkLabel, linkUrl] = linkMatch;
                                    elements.push(
                                      <a
                                        key={match.index}
                                        href={linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-600 dark:text-purple-400 underline font-medium hover:opacity-80 inline-flex items-center gap-0.5"
                                      >
                                        {linkLabel}
                                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                      </a>
                                    );
                                  } else {
                                    elements.push(token);
                                  }
                                }
                                lastIndex = regex.lastIndex;
                              }

                              if (lastIndex < paragraph.length) {
                                elements.push(paragraph.substring(lastIndex));
                              }

                              return (
                                <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
                                  {elements.length > 0 ? elements : paragraph}
                                </p>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Direct Project Brief Sheet Trigger Card */}
                      {msg.showLeadForm && (
                        <div className="mt-2.5 p-3 rounded-xl border border-purple-500/25 bg-purple-500/10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <FileText className={`w-4 h-4 shrink-0 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
                            <span className={`text-xs font-semibold ${isLight ? "text-purple-800" : "text-purple-300"}`}>
                              Submit Project Brief
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsBriefSheetOpen(true)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer transition-all shadow-xs"
                          >
                            Open Form ➔
                          </button>
                        </div>
                      )}

                      {/* Action Buttons (Behance / WhatsApp / Email / Send Brief) */}
                      {((msg.actions && msg.actions.length > 0) ||
                        (msg.role === "model" && msg.id !== "welcome" && !msg.showLeadForm && getImplicitActions(msg.content, actionButtons).length > 0)) && (
                        <div className="flex flex-col xs:flex-row flex-wrap gap-2 mt-3 pt-1 w-full">
                          {(msg.actions || getImplicitActions(msg.content, actionButtons)).map((act, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => {
                                if ((act.type === "behance" || act.type === "whatsapp" || act.type === "email" || act.type === "link") && act.url) {
                                  openExternal(act.url);
                                } else if (act.type === "brief") {
                                  setIsBriefSheetOpen(true);
                                }
                              }}
                              className={`inline-flex items-center justify-center gap-2 text-[13px] px-4 rounded-full border font-semibold transition-all active:scale-[0.97] cursor-pointer min-h-[44px] sm:min-h-[36px] w-full xs:w-auto ${
                                act.type === "whatsapp"
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600"
                                  : act.primary || act.type === "behance"
                                    ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-600"
                                    : isLight
                                      ? "bg-white hover:bg-purple-50 text-zinc-800 border-zinc-200 hover:border-purple-300"
                                      : "bg-white/5 hover:bg-white/10 text-zinc-200 border-white/10 hover:border-purple-500/30"
                              }`}
                            >
                              {act.type === "behance" && <Palette className="w-4 h-4 shrink-0" />}
                              {act.type === "whatsapp" && <Phone className="w-4 h-4 shrink-0" />}
                              {act.type === "email" && <Mail className="w-4 h-4 shrink-0" />}
                              {act.type === "brief" && <FileText className="w-4 h-4 shrink-0" />}
                              <span>{act.label}</span>
                              {act.url && <ExternalLink className="w-3 h-3 opacity-80 ml-0.5 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Timestamp & Feedback under bubble */}
                    <div className="flex items-center justify-between w-full max-w-[85%] mt-1 px-1">
                      <span
                        className={`text-[10px] font-mono tracking-tight ${
                          msg.role === "user"
                            ? "text-purple-300 dark:text-purple-400 text-right ml-auto"
                            : "text-zinc-400 dark:text-zinc-500 text-left"
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </span>

                      {/* AI Feedback Thumb Loop */}
                      {msg.role === "model" && msg.id !== "welcome" && (
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, "helpful")}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              msg.feedback === "helpful"
                                ? "text-emerald-500 bg-emerald-500/10 font-bold"
                                : "hover:text-zinc-200 hover:bg-white/5"
                            }`}
                            title="Helpful response"
                            aria-label="Thumbs up"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, "unhelpful")}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              msg.feedback === "unhelpful"
                                ? "text-rose-500 bg-rose-500/10 font-bold"
                                : "hover:text-zinc-200 hover:bg-white/5"
                            }`}
                            title="Unhelpful response"
                            aria-label="Thumbs down"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>

                          {/* Quick Unhelpful Reason Popover */}
                          {msg.feedback === "unhelpful" && !msg.feedbackReason && (
                            <div className="flex items-center gap-1 animate-fade-in">
                              {[
                                { label: "Not relevant", reason: "not_relevant" },
                                { label: "Wrong info", reason: "wrong_info" },
                                { label: "Talk to Rashed", reason: "talk_to_human" }
                              ].map((tag) => (
                                <button
                                  key={tag.reason}
                                  type="button"
                                  onClick={() => {
                                    handleFeedback(msg.id, "unhelpful", tag.reason);
                                    if (tag.reason === "talk_to_human") {
                                      setMessages((prev) =>
                                        prev.map((m) =>
                                          m.id === msg.id ? { ...m, showLeadForm: true } : m
                                        )
                                      );
                                    }
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                >
                                  {tag.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Primary Intent Chips on Welcome message (Rendered after typing completes) */}
                    {(msg.id === "welcome" || msg.id.startsWith("welcome")) && messages.length === 1 && !isLoading && isWelcomeTypingDone && enableStarterChips && starterQuestions.length > 0 && (
                      <div className="mt-3.5 space-y-2.5 max-w-full">
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          variants={{
                            hidden: { opacity: 0 },
                            visible: {
                              opacity: 1,
                              transition: {
                                staggerChildren: 0.08,
                                delayChildren: 0.06,
                              },
                            },
                          }}
                          className="grid grid-cols-2 gap-2"
                        >
                          {starterQuestions.map((intent) => (
                            <motion.button
                              key={intent.id}
                              variants={{
                                hidden: { opacity: 0, y: 12, scale: 0.93 },
                                visible: {
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                  transition: {
                                    type: "spring",
                                    damping: 18,
                                    stiffness: 260,
                                  },
                                },
                              }}
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              onClick={() => {
                                if (intent.isBrief) {
                                  setIsBriefSheetOpen(true);
                                } else if (intent.isFaqToggle) {
                                  setShowFaqSuggestions((prev) => !prev);
                                } else if (intent.query) {
                                  handleSend(intent.query, true);
                                }
                              }}
                              className={`flex items-center gap-2 p-2.5 rounded-2xl border text-left font-medium text-xs transition-shadow cursor-pointer shadow-2xs ${
                                isLight
                                  ? "bg-white hover:bg-purple-50/90 text-zinc-800 border-zinc-200/90 hover:border-purple-300 hover:shadow-md"
                                  : "bg-white/[0.04] hover:bg-purple-500/15 text-zinc-200 hover:text-white border-white/10 hover:border-purple-500/30 hover:shadow-md"
                              }`}
                            >
                              <span className="text-base shrink-0">{intent.icon}</span>
                              <span className="leading-snug line-clamp-2">{intent.label}</span>
                            </motion.button>
                          ))}
                        </motion.div>

                        {/* Expandable Dynamic 5 FAQs from DB */}
                        {showFaqSuggestions && (
                          <div className="pt-2 space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                                Suggested FAQs ({dynamicFaqSuggestions.length} available):
                              </p>
                              {answeredFaqIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setAnsweredFaqIds([])}
                                  className="text-[10px] text-purple-500 hover:underline cursor-pointer"
                                >
                                  Reset FAQs
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {dynamicFaqSuggestions.length > 0 ? (
                                dynamicFaqSuggestions.map((faq) => (
                                    <button
                                      key={faq.id || faq.question}
                                      type="button"
                                      onClick={() => handleSelectFaq(faq)}
                                      title={faq.question}
                                      className={`text-xs px-3 py-1.5 rounded-full border transition-all text-left font-medium active:scale-95 cursor-pointer max-w-full whitespace-normal break-words leading-relaxed ${
                                        isLight
                                          ? "bg-white hover:bg-purple-50 text-zinc-800 hover:text-purple-700 border-zinc-200"
                                          : "bg-white/5 hover:bg-purple-500/15 text-zinc-300 hover:text-white border-white/10"
                                      }`}
                                    >
                                      ✨ {getFaqDisplayTitle(faq)}
                                    </button>
                                ))
                              ) : (
                                <div className="flex items-center gap-2 py-1">
                                  <span className="text-xs text-zinc-400">All FAQs explored!</span>
                                  <button
                                    type="button"
                                    onClick={() => setAnsweredFaqIds([])}
                                    className="text-xs px-2.5 py-1 rounded-full bg-purple-600/15 text-purple-400 border border-purple-500/20 hover:bg-purple-600/25 cursor-pointer font-medium"
                                  >
                                    Browse all FAQs again
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div
                      className={`rounded-2xl rounded-bl-xs px-4 py-2.5 flex items-center gap-2.5 shadow-2xs ${
                        isLight ? "bg-white/95 border border-zinc-200/80 text-zinc-700" : "bg-[#13141f]/95 border border-white/10 text-zinc-200"
                      }`}
                    >
                      <span className="flex items-center gap-1.5" aria-hidden="true">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" />
                      </span>
                      <span className={`text-xs font-mono font-medium ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
                        Thinking...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Floating Go-To-Bottom Button */}
              <AnimatePresence>
                {showScrollBottom && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.18 }}
                    onClick={scrollToBottom}
                    aria-label="Scroll to latest messages"
                    className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-8 h-8 rounded-full border shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform ${
                      isLight
                        ? "bg-white text-zinc-700 border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        : "bg-zinc-800 text-zinc-200 border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                    }`}
                  >
                    <ChevronDown className="w-4.5 h-4.5" />
                  </motion.button>
                )}
              </AnimatePresence>
              </div>

              {/* Input Bar */}
              <div
                className={`relative p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-3 border-t shrink-0 ${
                  isLight ? "border-zinc-200/70 bg-white/80 backdrop-blur-md" : "border-white/10 bg-zinc-950/85 backdrop-blur-md"
                }`}
              >
                {/* Floating Suggestions Drawer */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      ref={suggestionsRef}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute bottom-full left-3 right-3 mb-2 p-3 rounded-2xl border shadow-2xl backdrop-blur-2xl z-30 space-y-2.5 ${
                        isLight
                          ? "bg-white/95 border-purple-200/90 shadow-[0_16px_36px_-6px_rgba(147,51,234,0.18)]"
                          : "bg-[#101016]/95 border-purple-500/25 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8)]"
                      }`}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                          Suggested Questions ({dynamicFaqSuggestions.length})
                        </span>
                        <div className="flex items-center gap-2">
                          {answeredFaqIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setAnsweredFaqIds([])}
                              className="text-[10px] text-purple-500 hover:underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowSuggestions(false)}
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto scrollbar-thin pr-1">
                        {dynamicFaqSuggestions.length > 0 ? (
                          dynamicFaqSuggestions.map((faq) => (
                            <button
                              key={faq.id || faq.question}
                              type="button"
                              onClick={() => handleSelectFaq(faq)}
                              className={`w-full text-left text-xs p-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                                isLight
                                  ? "hover:bg-purple-50 text-zinc-700 hover:text-purple-900"
                                  : "hover:bg-white/5 text-zinc-300 hover:text-white"
                              }`}
                            >
                              <span className="whitespace-normal break-words leading-snug pr-2 font-medium" title={faq.question}>✨ {getFaqDisplayTitle(faq)}</span>
                              <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 text-purple-500 transition-opacity shrink-0" />
                            </button>
                          ))
                        ) : (
                          <div className="py-3 text-center space-y-1">
                            <p className="text-xs text-zinc-400">All top suggestions explored!</p>
                            <button
                              type="button"
                              onClick={() => setAnsweredFaqIds([])}
                              className="text-xs text-purple-500 hover:underline cursor-pointer font-medium"
                            >
                              Browse all FAQs again
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Progressive Reveal Quick Action Pills (Hidden initially until user interacts) */}
                <AnimatePresence>
                  {enableQuickPills && messages.some((m) => m.role === "user") && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 4, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none no-scrollbar pt-0.5 px-0.5 ${inputFocused ? "hidden sm:flex" : "flex"}`}
                    >
                      {actionButtons
                        .filter((btn) => btn.isActive !== false && btn.showAsQuickPill)
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .slice(0, maxQuickPills)
                        .map((pill) => (
                          <button
                            key={pill.id}
                            type="button"
                            onClick={() => {
                              if (pill.type === "brief") {
                                setIsBriefSheetOpen(true);
                              } else if (pill.type === "behance") {
                                openExternal(pill.url || "https://be.net/rashedpervej");
                              } else if (pill.type === "whatsapp") {
                                const targetUrl = pill.url || ("https://wa.me/8801932623969?text=" + encodeURIComponent("Hi Rashed, I saw your portfolio and would like to discuss a project."));
                                openExternal(targetUrl);
                              } else if (pill.type === "email") {
                                const targetUrl = pill.url || ("mailto:rashedpervej2011@gmail.com?subject=" + encodeURIComponent("Project / Career Inquiry via Portfolio"));
                                openExternal(targetUrl);
                              } else if (pill.url) {
                                openExternal(pill.url);
                              }
                            }}
                            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs ${
                              pill.primary
                                ? isLight
                                  ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                  : "bg-purple-950/40 text-purple-300 border-purple-500/30 hover:bg-purple-900/50"
                                : isLight
                                  ? "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                                  : "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10"
                            }`}
                          >
                            {pill.pillIcon && <span className="text-xs">{pill.pillIcon}</span>}
                            <span>{pill.label}</span>
                          </button>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setShowSuggestions(false);
                    handleSend(input);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1 flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        progressiveGateState === "stage2" && !getStoredUserLead()?.name
                          ? "Please complete your contact details above..."
                          : "Ask about design, pricing, or start a project..."
                      }
                      disabled={progressiveGateState === "stage2" && !getStoredUserLead()?.name}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      autoComplete="off"
                      className={`w-full text-[16px] sm:text-[13px] pl-3.5 pr-9 py-2.5 sm:py-2.5 rounded-xl border outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 ${
                        isLight
                          ? "bg-zinc-100/80 focus:bg-white border-zinc-200 focus:border-purple-500 text-zinc-900"
                          : "bg-white/5 focus:bg-white/10 border-white/10 focus:border-purple-400 text-white"
                      }`}
                    />

                    {/* Sparkle drawer trigger button */}
                    <button
                      ref={sparkButtonRef}
                      type="button"
                      onClick={() => setShowSuggestions(!showSuggestions)}
                      className={`absolute right-2 p-1 rounded-md transition-colors cursor-pointer ${
                        showSuggestions
                          ? "text-purple-600 dark:text-purple-400 bg-purple-500/10"
                          : "text-zinc-400 hover:text-purple-500"
                      }`}
                      title="Quick questions"
                      aria-label="Toggle suggestion questions"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading || (progressiveGateState === "stage2" && !getStoredUserLead()?.name)}
                    aria-label="Send message"
                    className={`p-2.5 min-w-[42px] min-h-[42px] sm:min-w-[38px] sm:min-h-[38px] rounded-xl font-medium transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                      input.trim() && !isLoading
                        ? "bg-purple-600 hover:bg-purple-500 text-white shadow-xs active:scale-95"
                        : "bg-zinc-200 dark:bg-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Launcher Button with Ambient Pulse Glow */}
        <motion.button
          onClick={() => {
            if (isOpen) {
              handleCloseChat();
            } else {
              setIsOpen(true);
            }
          }}
          aria-label={isOpen ? "Close Creative Advisor chat" : "Open Creative Advisor chat"}
          aria-expanded={isOpen}
          className={`pointer-events-auto w-14 h-14 rounded-full items-center justify-center transition-all duration-300 relative group cursor-pointer ${
            isOpen ? "hidden sm:flex" : "flex"
          } ${
            isLight
              ? "bg-white/95 hover:bg-white border border-purple-200/90 text-purple-600 shadow-[0_8px_25px_-4px_rgba(147,51,234,0.28)] hover:shadow-[0_12px_30px_-4px_rgba(147,51,234,0.4)] backdrop-blur-xl"
              : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border border-purple-400/30 shadow-[0_8px_25px_-4px_rgba(147,51,234,0.5)] hover:shadow-[0_12px_30px_-4px_rgba(147,51,234,0.65)]"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.15 }}
                className="relative flex items-center justify-center"
              >
                <MessageSquare className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-purple-600 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
