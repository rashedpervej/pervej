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
  Palette
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePortfolio } from "../context/PortfolioContext";
import { getInitialFaqs } from "../utils/persistentSnapshot";
import { FaqFallbackItem } from "../data/fallbackContent";

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

  // 3. Remove markdown link wrapper if it wrapped a URL, keeping just readable text
  cleaned = cleaned.replace(/\[([^\]]+)\]\((?:https?:\/\/[^\)]+|mailto:[^\)]+)\)/g, "$1");

  // 4. Clean up any awkward dangling link labels or dangling colons/punctuations left behind
  cleaned = cleaned.replace(/(?:এখানে\s+)?(?:Rashed[-‑]এর\s+)?(?:সম্পূর্ণ\s+)?পোর্টফোলিও(?:\s*(?:লিঙ্ক|লিংক|link|url))?\s*:\s*[।\.]?/gi, "নিচের লিংকে ঢুকে আপনি আপডেটেড প্রজেক্টস দেখতে পাবেন। ");
  cleaned = cleaned.replace(/:\s*[।\.]/g, "।");
  cleaned = cleaned.replace(/[।\.]\s*([।\.])/g, "$1");

  // 5. Clean up duplicate empty lines or dangling list dashes
  cleaned = cleaned.replace(/^\s*-\s*$/gm, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}

/**
 * Context-aware Action Buttons:
 * Only renders actionable buttons when the assistant explicitly guides the user to take action:
 * - When portfolio / Behance / updated works are referenced: renders [View on Behance]
 * - When project brief / quotation submission is explicitly suggested: renders [Submit Project Brief]
 * - When direct contact / WhatsApp / Email / Job offer handoff is explicitly suggested: renders [WhatsApp Rashed] & [Email Rashed]
 * - Excludes general conversation or simple informational answers.
 */
function getImplicitActions(text: string): MessageAction[] {
  const actions: MessageAction[] = [];
  const lower = text.toLowerCase();

  // Exclude greetings so we never dump buttons on "hi" or casual greeting
  const isGreeting =
    lower.startsWith("hi there!") ||
    lower.startsWith("hello!") ||
    lower.startsWith("হ্যালো! কেমন আছেন") ||
    lower.startsWith("ওয়ালাইকুমুস সালাম! কেমন আছেন");
  if (isGreeting) {
    return [];
  }

  // 1. Portfolio / Behance / Work Link Intent
  const hasPortfolioIntent =
    lower.includes("behance") ||
    lower.includes("be.net") ||
    lower.includes("আপডেটেড প্রজেক্ট") ||
    lower.includes("আপডেটেড প্ৰজেক্ট") ||
    lower.includes("নিচের লিংকে") ||
    lower.includes("লিংকে ঢুকে") ||
    lower.includes("portfolio link") ||
    (lower.includes("portfolio") && (lower.includes("check") || lower.includes("view") || lower.includes("explore") || lower.includes("দেখতে")));

  if (hasPortfolioIntent) {
    actions.push({
      label: "View on Behance",
      type: "behance",
      url: "https://be.net/rashedpervej",
      primary: true
    });
  }

  // 2. Explicit Call to Action for Project Brief or Quotation
  const hasExplicitBriefIntent =
    lower.includes("ব্রিফ জমা") ||
    lower.includes("ব্রিফ পাঠান") ||
    lower.includes("ব্রিফ দিন") ||
    lower.includes("submit a brief") ||
    lower.includes("submit your brief") ||
    lower.includes("fill out the brief") ||
    lower.includes("fill in a quick") ||
    lower.includes("নিচের ব্রিফ বাটন") ||
    lower.includes("কোটেশনের জন্য ব্রিফ") ||
    lower.includes("প্রজেক্ট ব্রিফ সাবমিট");

  if (hasExplicitBriefIntent) {
    actions.push({
      label: "Submit Project Brief",
      type: "brief",
      primary: !hasPortfolioIntent
    });
  }

  // 3. Contact / Direct Handoff / Job Offer Intent
  const hasContactIntent =
    text.includes("+8801932623969") ||
    text.includes("01932623969") ||
    lower.includes("rashedpervej2011@gmail.com") ||
    lower.includes("whatsapp বা email") ||
    lower.includes("whatsapp বাটন") ||
    lower.includes("email বাটন") ||
    lower.includes("সরাসরি rashed") ||
    lower.includes("সরাসরি যোগাযোগ") ||
    lower.includes("connect directly with rashed") ||
    lower.includes("message him instantly on whatsapp") ||
    lower.includes("whatsapp-এ সরাসরি") ||
    lower.includes("ফুল-টাইম বা সিনিয়র লিড") ||
    lower.includes("art director বা design lead") ||
    lower.includes("design lead roles");

  if (hasContactIntent) {
    if (!actions.some((a) => a.type === "whatsapp")) {
      actions.push({
        label: "WhatsApp Rashed",
        type: "whatsapp",
        url: "https://wa.me/8801932623969?text=" + encodeURIComponent("Hi Rashed, I saw your portfolio and would like to discuss a project."),
        primary: true
      });
    }
    if (!actions.some((a) => a.type === "email")) {
      actions.push({
        label: "Email Rashed",
        type: "email",
        url: "mailto:rashedpervej2011@gmail.com?subject=" + encodeURIComponent("Project / Career Inquiry via Portfolio")
      });
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
  const clean = faq.question
    .replace(/^(how much does|how do you|how do|what is|what are|what will|can you|can i|do you|is there)\s+/i, "")
    .replace(/\?+$/, "");
  return clean.length > 32 ? clean.slice(0, 30) + "..." : clean;
}

/**
 * Lightweight, frictionless inline Lead Qualification micro-card.
 * Collects project brief and pushes structured lead data directly to Supabase & Admin CRM.
 */
function InlineLeadCard({
  isLight,
  onSubmitBrief,
}: {
  isLight: boolean;
  onSubmitBrief: (data: {
    name: string;
    emailOrPhone: string;
    projectType: string;
    budget: string;
    timeline: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [projectType, setProjectType] = useState("Brand Identity");
  const [budget, setBudget] = useState("$500 - $1.5k");
  const [timeline, setTimeline] = useState("Standard (2-4 wks)");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const projectTypes = [
    "Brand Identity",
    "Packaging Design",
    "Motion Graphics",
    "Full Brand & Pack"
  ];

  const budgetOptions = [
    "< $500",
    "$500 - $1.5k",
    "$1.5k+",
    "Flexible"
  ];

  const timelineOptions = [
    "Urgent (< 2 wks)",
    "Standard (2-4 wks)",
    "Flexible"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    if (!emailOrPhone.trim()) {
      setErrorMsg("Please provide your WhatsApp number or Email");
      return;
    }
    setErrorMsg("");
    setIsSubmitting(true);
    try {
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

  if (isDone) {
    return (
      <div className={`mt-2.5 p-4 rounded-2xl border text-left space-y-3 ${
        isLight
          ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
          : "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
      }`}>
        <div className="flex items-center gap-2 font-semibold text-sm">
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>Project Brief Sent Directly to Rashed!</span>
        </div>
        <p className="text-xs leading-relaxed opacity-90">
          Thank you, <strong>{name}</strong>! Rashed has been notified with your project specifications and typically replies on WhatsApp or Email within 1 hour during business hours.
        </p>
        <a
          href="https://wa.me/8801932623969?text=Hi%20Rashed%2C%20I%20just%20submitted%20a%20project%20brief%20through%20your%20portfolio!"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
          Chat Now on WhatsApp
          <ExternalLink className="w-3 h-3 opacity-80" />
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-2.5 p-3.5 sm:p-4 rounded-2xl border text-left space-y-3 transition-all ${
        isLight
          ? "bg-purple-50/70 border-purple-200/90 shadow-xs"
          : "bg-[#14141e]/95 border-purple-500/25 shadow-lg"
      }`}
    >
      <div className="flex items-center justify-between border-b pb-2 border-purple-500/15">
        <span className="text-xs font-semibold tracking-tight flex items-center gap-1.5 text-purple-600 dark:text-purple-300">
          <FileText className="w-3.5 h-3.5" />
          Start a Project Brief
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 font-medium">
          Quick 30-sec form
        </span>
      </div>

      {errorMsg && (
        <p className="text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
          {errorMsg}
        </p>
      )}

      {/* Name & Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Your Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. John Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full text-xs px-3 py-2 rounded-xl border outline-none transition-colors ${
              isLight
                ? "bg-white border-zinc-200 text-zinc-900 focus:border-purple-500"
                : "bg-white/5 border-white/10 text-white focus:border-purple-400"
            }`}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            WhatsApp / Email *
          </label>
          <input
            type="text"
            required
            placeholder="+1 555... or email@co.com"
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            className={`w-full text-xs px-3 py-2 rounded-xl border outline-none transition-colors ${
              isLight
                ? "bg-white border-zinc-200 text-zinc-900 focus:border-purple-500"
                : "bg-white/5 border-white/10 text-white focus:border-purple-400"
            }`}
          />
        </div>
      </div>

      {/* Project Type */}
      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
          Project Type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {projectTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setProjectType(type)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                projectType === type
                  ? "bg-purple-600 text-white border-purple-500 shadow-xs font-semibold"
                  : isLight
                    ? "bg-white border-zinc-200 text-zinc-700 hover:border-purple-300"
                    : "bg-white/5 border-white/10 text-zinc-300 hover:border-purple-500/30"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Budget & Timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <div>
          <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Approx Budget
          </label>
          <div className="flex flex-wrap gap-1">
            {budgetOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setBudget(opt)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  budget === opt
                    ? "bg-purple-600 text-white border-purple-500 font-semibold"
                    : isLight
                      ? "bg-white border-zinc-200 text-zinc-700"
                      : "bg-white/5 border-white/10 text-zinc-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Timeline
          </label>
          <div className="flex flex-wrap gap-1">
            {timelineOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setTimeline(opt)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  timeline === opt
                    ? "bg-purple-600 text-white border-purple-500 font-semibold"
                    : isLight
                      ? "bg-white border-zinc-200 text-zinc-700"
                      : "bg-white/5 border-white/10 text-zinc-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Brief Notes */}
      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          Project Notes / Summary (Optional)
        </label>
        <textarea
          rows={2}
          placeholder="Briefly describe your requirements or ideas..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`w-full text-xs px-3 py-2 rounded-xl border outline-none resize-none transition-colors ${
            isLight
              ? "bg-white border-zinc-200 text-zinc-900 focus:border-purple-500"
              : "bg-white/5 border-white/10 text-white focus:border-purple-400"
          }`}
        />
      </div>

      {/* Privacy Notice + Submit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-purple-500/10">
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <Shield className="w-3 h-3 text-purple-500 shrink-0" />
          <span>🔒 Confidential. Only used by Rashed to review your project.</span>
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Send to Rashed
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function AIChatBot() {
  const { siteSettings, theme } = usePortfolio();
  const isLight = theme === "light";

  const isChatbotEnabled = siteSettings?.enableChatbot !== false && (siteSettings?.enableChatbot as any) !== "false";

  if (!isChatbotEnabled) {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem("portfolio_chat_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to parse saved chat messages:", e);
    }
    return [
      {
        id: "welcome",
        role: "model",
        content: "Hello! I am Rashed's Creative Advisor. I can answer questions about his 6+ years of design experience, motion graphics skills, brand identity work, or how to hire him for a project. What would you like to know?",
        timestamp: new Date()
      }
    ];
  });
  const [isLoading, setIsLoading] = useState(false);
  const isSendingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sessionId, setSessionId] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [conversationId, setConversationId] = useState("");
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
            const existingQuestions = new Set(data.map((d: any) => d.question?.trim().toLowerCase()));
            const complementary = initial.filter(f => !existingQuestions.has(f.question?.trim().toLowerCase()));
            setDbFaqs([...(data as FaqFallbackItem[]), ...complementary]);
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

    // Generate conversation_id (unique to this mount/chat reset)
    const convId = "conv_" + Math.random().toString(36).substring(2, 15);
    setConversationId(convId);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

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
    } catch (e) {
      console.warn("Failed to save chat messages:", e);
    }
  }, [messages]);

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
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedback: type, feedbackReason: reason || m.feedbackReason } : m
      )
    );

    logInteraction({
      question: `[FEEDBACK ${type.toUpperCase()}]${reason ? ` (${reason})` : ""}`,
      answer: `Target message: ${messageId}`,
      source: "Feedback"
    });
  };

  const handleSend = async (text: string, isPresetClick = false) => {
    const cleanText = text.trim();
    if (!cleanText || isSendingRef.current || isLoading) return;

    // Immediate synchronous lock to prevent double clicks / rapid triggers
    isSendingRef.current = true;
    setIsLoading(true);

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
        throw new Error("Failed to send message to server");
      }

      const data = await res.json();
      const responseText = data.text || "I'm sorry, I encountered an issue processing that request. Please try again.";
      const responseTime = Date.now() - startTime;

      const botMessage: Message = {
        id: "bot_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        role: "model",
        content: responseText,
        timestamp: new Date(),
        actions: getImplicitActions(responseText)
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

      // Log successful interaction with accurate source provider
      const rawProv = data.provider || data.source || "Gemini";
      const resolvedSource =
        rawProv.toUpperCase() === "GROQ" ? "Groq" :
        rawProv.toUpperCase() === "GEMINI" ? "Gemini" :
        rawProv.toUpperCase() === "OPENAI" ? "OpenAI" :
        rawProv.toUpperCase() === "OPENROUTER" ? "OpenRouter" :
        rawProv.toUpperCase() === "FAQ" ? "FAQ" : rawProv;

      logInteraction({
        question: cleanText,
        answer: responseText,
        source: resolvedSource,
        responseTimeMs: responseTime,
        tokenUsage: data.tokenUsage || null
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: "err_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        role: "model",
        content: "Oops! My communication link had a temporary hiccup. Please reach out to Rashed directly at **rashedpervej2011@gmail.com** or via WhatsApp.",
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

      const responseTime = Date.now() - startTime;
      logInteraction({
        question: cleanText,
        answer: `[ERROR] ${error?.message || "Failed to reach backend services"}`,
        source: "Gemini",
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

  const handleReset = () => {
    const defaultMessages: Message[] = [
      {
        id: "welcome",
        role: "model",
        content: "Hello! I am Rashed's Creative Advisor. I can answer questions about his 6+ years of design experience, motion graphics skills, brand identity work, or how to hire him for a project. What would you like to know?",
        timestamp: new Date()
      }
    ];
    setMessages(defaultMessages);
    try {
      localStorage.setItem("portfolio_chat_messages", JSON.stringify(defaultMessages));
    } catch (e) {
      console.warn("Failed to reset saved messages:", e);
    }
    setActiveSuggestions(initialSuggestions);
    setShowFaqSuggestions(false);
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

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit project brief");
    }

    logInteraction({
      question: `[PROJECT BRIEF SUBMITTED] ${briefData.name} - ${briefData.projectType}`,
      answer: `Score: ${leadScore.toUpperCase()} | Contact: ${briefData.emailOrPhone}`,
      source: "Feedback"
    });
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-none flex flex-col items-end">
        <AnimatePresence>
          {isOpen && (
            <motion.div
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
              className={`pointer-events-auto fixed sm:relative inset-x-0 bottom-0 top-0 sm:top-auto sm:inset-auto w-full sm:w-[420px] h-[100dvh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden sm:mb-4 z-50 backdrop-blur-2xl ${
                isLight
                  ? "bg-[#fafafa]/98 border-purple-200/80 shadow-[0_20px_60px_-15px_rgba(147,51,234,0.22)]"
                  : "bg-[#090a10]/98 border-purple-500/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]"
              }`}
            >
              {/* Header with Touch Gesture Listener for Swipe-Down-to-Dismiss */}
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
                          Creative Advisor
                        </h3>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          AI
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center font-medium">
                        Online • Replies instantly
                      </p>
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleReset}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        isLight ? "text-zinc-500 hover:text-zinc-900 hover:bg-black/5" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                      }`}
                      title="Reset conversation"
                      aria-label="Reset conversation"
                    >
                      <RefreshCw className="w-4 h-4" />
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

              {/* Message Scroll Area */}
              <div
                ref={messageContainerRef}
                onScroll={handleScroll}
                onClick={() => setShowSuggestions(false)}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 scrollbar-thin cursor-default relative"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-4 py-3 sm:py-2.5 text-[15px] sm:text-[14px] leading-relaxed tracking-normal ${
                        msg.role === "user"
                          ? "chat-user-bubble bg-purple-600 text-white rounded-br-xs font-sans shadow-xs"
                          : isLight
                            ? "chat-bot-bubble bg-white/95 border border-zinc-200/80 text-zinc-900 rounded-bl-xs font-sans shadow-xs"
                            : "chat-bot-bubble bg-[#13141f]/95 border border-white/10 text-zinc-100 rounded-bl-xs font-sans"
                      }`}
                    >
                      {/* Render formatted text */}
                      <div className="whitespace-pre-wrap">
                        {cleanDisplayContent(msg.content).split("\n").map((paragraph, idx) => {
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
                        })}
                      </div>

                      {/* Inline Lead Qualification Micro-Card */}
                      {msg.showLeadForm && (
                        <InlineLeadCard
                          isLight={isLight}
                          onSubmitBrief={handleSubmitLeadBrief}
                        />
                      )}

                      {/* Action Buttons (Behance / WhatsApp / Email / Send Brief) */}
                      {((msg.actions && msg.actions.length > 0) ||
                        (msg.role === "model" && msg.id !== "welcome" && !msg.showLeadForm && getImplicitActions(msg.content).length > 0)) && (
                        <div className="flex flex-col xs:flex-row flex-wrap gap-2 mt-3 pt-1 w-full">
                          {(msg.actions || getImplicitActions(msg.content)).map((act, aIdx) => (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => {
                                if ((act.type === "behance" || act.type === "whatsapp" || act.type === "email" || act.type === "link") && act.url) {
                                  window.open(act.url, "_blank", "noopener,noreferrer");
                                } else if (act.type === "brief") {
                                  setMessages((prev) =>
                                    prev.map((m) =>
                                      m.id === msg.id ? { ...m, showLeadForm: true } : m
                                    )
                                  );
                                }
                              }}
                              className={`inline-flex items-center justify-center gap-2 text-xs sm:text-[13px] px-3.5 sm:px-3 py-2.5 sm:py-1.5 rounded-xl sm:rounded-full border font-semibold transition-all active:scale-95 cursor-pointer shadow-xs min-h-[40px] sm:min-h-[32px] w-full xs:w-auto ${
                                act.type === "behance"
                                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/40 shadow-[0_4px_14px_rgba(147,51,234,0.3)]"
                                  : act.type === "whatsapp"
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                                    : act.type === "brief"
                                      ? isLight
                                        ? "bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300 font-semibold"
                                        : "bg-purple-950/50 hover:bg-purple-900/70 text-purple-200 border-purple-500/40 font-semibold"
                                      : act.primary
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-2xs font-semibold"
                                        : isLight
                                          ? "bg-white hover:bg-purple-50 text-zinc-800 border-zinc-200/90 hover:border-purple-300"
                                          : "bg-white/5 hover:bg-white/10 text-zinc-200 border-white/10 hover:border-purple-500/30"
                              }`}
                            >
                              {act.type === "behance" && <Palette className="w-3.5 h-3.5 text-purple-100 shrink-0" />}
                              {act.type === "whatsapp" && <Phone className="w-3.5 h-3.5 text-emerald-100 shrink-0" />}
                              {act.type === "email" && <Mail className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                              {act.type === "brief" && <FileText className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
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

                    {/* Primary Intent Chips on Welcome message */}
                    {msg.id === "welcome" && messages.length === 1 && !isLoading && (
                      <div className="mt-3.5 space-y-2.5 max-w-full">
                        <p className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${isLight ? "text-zinc-400" : "text-zinc-500"}`}>
                          How can I help you today?
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "portfolio", label: "View Portfolio", icon: "🎨", query: "view portfolio" },
                            { id: "project", label: "Discuss a Project", icon: "💼", isBrief: true },
                            { id: "quote", label: "Get an Estimate", icon: "💰", query: "How much does a project typically cost?" },
                            { id: "questions", label: "Ask a Question", icon: "💬", isFaqToggle: true },
                          ].map((intent) => (
                            <button
                              key={intent.id}
                              type="button"
                              onClick={() => {
                                if (intent.isBrief) {
                                  const userMsg: Message = {
                                    id: "user_" + Date.now(),
                                    role: "user",
                                    content: "I'd like to discuss a project with Rashed.",
                                    timestamp: new Date()
                                  };
                                  const botMsg: Message = {
                                    id: "bot_" + Date.now(),
                                    role: "model",
                                    content: "I'd be thrilled to help you connect with Rashed! Fill in a quick 30-second brief below so he can review your needs before reaching out:",
                                    timestamp: new Date(),
                                    showLeadForm: true
                                  };
                                  setMessages((prev) => [...prev, userMsg, botMsg]);
                                } else if (intent.isFaqToggle) {
                                  setShowFaqSuggestions((prev) => !prev);
                                } else if (intent.query) {
                                  handleSend(intent.query, true);
                                }
                              }}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left font-medium text-xs transition-all active:scale-95 cursor-pointer ${
                                isLight
                                  ? "bg-white hover:bg-purple-50 text-zinc-800 border-zinc-200/90 hover:border-purple-300 shadow-2xs"
                                  : "bg-white/5 hover:bg-purple-500/15 text-zinc-200 hover:text-white border-white/10 hover:border-purple-500/30"
                              }`}
                            >
                              <span className="text-base shrink-0">{intent.icon}</span>
                              <span className="truncate">{intent.label}</span>
                            </button>
                          ))}
                        </div>

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
                                      className={`text-xs px-3 py-1.5 rounded-full border transition-all text-left font-medium active:scale-95 cursor-pointer max-w-[280px] truncate ${
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
                  <div className="flex justify-start">
                    <div
                      className={`rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-2.5 ${
                        isLight ? "bg-white/80 border border-zinc-200/70" : "bg-white/5 border border-white/10"
                      }`}
                    >
                      <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                      <span className={`text-xs ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                        Consulting Rashed's portfolio data...
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
                    className={`absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 w-8 h-8 rounded-full border shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform ${
                      isLight
                        ? "bg-white text-zinc-700 border-zinc-200 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                        : "bg-zinc-800 text-zinc-200 border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                    }`}
                  >
                    <ChevronDown className="w-4.5 h-4.5" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Input Bar */}
              <div
                className={`relative p-2.5 sm:p-3 border-t shrink-0 ${
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
                              <span className="truncate pr-2 font-medium" title={faq.question}>✨ {getFaqDisplayTitle(faq)}</span>
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
                      placeholder="Ask about design, pricing, or start a project..."
                      readOnly={isLoading}
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
                    disabled={!input.trim() || isLoading}
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
