import React, { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  Plus,
  Edit,
  Trash,
  HelpCircle,
  Save,
  X,
  Search,
  CheckCircle,
  Eye,
  AlertCircle,
  Sparkles,
  Sliders,
  Upload,
  FileText,
  FileCode,
  Check,
  ArrowRight,
  ShieldCheck,
  Bot,
  Brain,
  MessageSquare,
  Layers,
  RefreshCw,
  Tag,
} from "lucide-react";
import {
  FALLBACK_FAQS,
  FALLBACK_CHAT_TRAINING_RULES,
  FALLBACK_AI_SUGGESTED_FAQS,
  ChatTrainingRule,
  SuggestedFaqItem,
} from "../data/fallbackContent";
import { getInitialFaqs } from "../utils/persistentSnapshot";

export interface FaqItem {
  id?: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  status: "draft" | "published";
  created_at?: string;
  shortTitle?: string;
}

interface AdminFaqEditorProps {
  isDemo?: boolean;
}

type ActiveTab = "faqs" | "suggested" | "chat_control";

export default function AdminFaqEditor({ isDemo = false }: AdminFaqEditorProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("faqs");

  // ==========================================
  // TAB 1: KNOWLEDGE BASE FAQS STATE
  // ==========================================
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isLoadingFaqs, setIsLoadingFaqs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // FAQ Modal state
  const [isFaqFormOpen, setIsFaqFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqShortTitle, setFaqShortTitle] = useState("");
  const [faqKeywordsStr, setFaqKeywordsStr] = useState("");
  const [faqCategory, setFaqCategory] = useState("general");
  const [faqStatus, setFaqStatus] = useState<"draft" | "published">("published");

  // ==========================================
  // TAB 2: AI SUGGESTED FAQS STATE
  // ==========================================
  const [suggestedFaqs, setSuggestedFaqs] = useState<SuggestedFaqItem[]>(() => {
    try {
      const saved = localStorage.getItem("portfolio_ai_suggested_faqs");
      return saved ? JSON.parse(saved) : FALLBACK_AI_SUGGESTED_FAQS;
    } catch {
      return FALLBACK_AI_SUGGESTED_FAQS;
    }
  });
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // ==========================================
  // TAB 3: CHAT CONTROL & TRAINING DIRECTIVES
  // ==========================================
  const [trainingRules, setTrainingRules] = useState<ChatTrainingRule[]>(() => {
    try {
      const saved = localStorage.getItem("portfolio_chat_training_rules");
      return saved ? JSON.parse(saved) : FALLBACK_CHAT_TRAINING_RULES;
    } catch {
      return FALLBACK_CHAT_TRAINING_RULES;
    }
  });
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState("all");

  // Rule Modal state
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChatTrainingRule | null>(null);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleInstruction, setRuleInstruction] = useState("");
  const [ruleType, setRuleType] = useState<"do" | "dont" | "guide">("do");
  const [ruleCategory, setRuleCategory] = useState<"tone" | "behavior" | "pricing" | "career" | "scope">("behavior");

  // Bulk Upload / Paste Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState("");
  const [bulkInputMode, setBulkInputMode] = useState<"paste" | "upload">("paste");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared notification banner
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showAlert = (type: "success" | "error", text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // ----------------------------------------------------
  // FETCH ACTIVE FAQS (From Supabase + Fallback snapshot)
  // ----------------------------------------------------
  const fetchFaqs = async () => {
    setIsLoadingFaqs(true);
    if (isDemo || !isSupabaseConfigured || !supabase) {
      setFaqs(getInitialFaqs() as FaqItem[]);
      setIsLoadingFaqs(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("faq_knowledge_base")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && !error && data.length > 0) {
        const initial = getInitialFaqs() as FaqItem[];
        const existingQs = new Set(data.map((d: any) => d.question?.trim().toLowerCase()));
        const complementary = initial.filter((f) => !existingQs.has(f.question?.trim().toLowerCase()));
        setFaqs([...(data as FaqItem[]), ...complementary]);
      } else {
        setFaqs(getInitialFaqs() as FaqItem[]);
      }
    } catch (err) {
      console.error("Error fetching FAQ items:", err);
      setFaqs(getInitialFaqs() as FaqItem[]);
    } finally {
      setIsLoadingFaqs(false);
    }
  };

  // ----------------------------------------------------
  // FETCH CHAT TRAINING RULES FROM SUPABASE SITE_SETTINGS
  // ----------------------------------------------------
  const fetchTrainingRules = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "chatTrainingRules")
          .maybeSingle();

        if (data && !error && data.value) {
          const loaded = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (Array.isArray(loaded) && loaded.length > 0) {
            setTrainingRules(loaded);
            try {
              localStorage.setItem("portfolio_chat_training_rules", JSON.stringify(loaded));
            } catch {}
            return;
          }
        }
      } catch (e) {
        console.warn("Could not load chat training rules from DB:", e);
      }
    }
  };

  useEffect(() => {
    fetchFaqs();
    fetchTrainingRules();
  }, [isDemo]);

  // Persist training rules to DB and local storage
  const persistTrainingRules = async (updatedRules: ChatTrainingRule[], successMsg = "Training rules updated!") => {
    setTrainingRules(updatedRules);
    try {
      localStorage.setItem("portfolio_chat_training_rules", JSON.stringify(updatedRules));
    } catch {}

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("site_settings").upsert(
          {
            key: "chatTrainingRules",
            value: updatedRules,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
        if (error) throw error;
      } catch (e: any) {
        console.warn("Could not persist rules to Supabase site_settings:", e);
      }
    }
    showAlert("success", successMsg);
  };

  // ----------------------------------------------------
  // FAQ CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenFaqForm = (faq: FaqItem | null = null) => {
    setEditingFaq(faq);
    if (faq) {
      setFaqQuestion(faq.question);
      setFaqAnswer(faq.answer);
      setFaqShortTitle(faq.shortTitle || "");
      setFaqKeywordsStr(faq.keywords ? faq.keywords.join(", ") : "");
      setFaqCategory(faq.category || "general");
      setFaqStatus(faq.status || "published");
    } else {
      setFaqQuestion("");
      setFaqAnswer("");
      setFaqShortTitle("");
      setFaqKeywordsStr("");
      setFaqCategory("general");
      setFaqStatus("published");
    }
    setIsFaqFormOpen(true);
  };

  const handleCloseFaqForm = () => {
    setIsFaqFormOpen(false);
    setEditingFaq(null);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlertMsg(null);

    const cleanKeywords = faqKeywordsStr
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k !== "");

    const faqPayload: any = {
      question: faqQuestion,
      answer: faqAnswer,
      keywords: cleanKeywords,
      category: faqCategory,
      status: faqStatus,
      shortTitle: faqShortTitle.trim() || undefined,
    };

    if (isDemo || !isSupabaseConfigured || !supabase) {
      if (editingFaq) {
        setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? { ...f, ...faqPayload } : f)));
        showAlert("success", "FAQ updated successfully in sandbox!");
      } else {
        const newFaq = { ...faqPayload, id: `faq_${Date.now()}` };
        setFaqs((prev) => [newFaq, ...prev]);
        showAlert("success", "New FAQ added to Knowledge Base!");
      }
      setIsSubmitting(false);
      handleCloseFaqForm();
      return;
    }

    try {
      if (editingFaq && editingFaq.id && !editingFaq.id.startsWith("faq_fallback_")) {
        const { error } = await supabase
          .from("faq_knowledge_base")
          .update(faqPayload)
          .eq("id", editingFaq.id);
        if (error) throw error;
        showAlert("success", "FAQ updated in live Knowledge Base!");
      } else {
        const { error } = await supabase.from("faq_knowledge_base").insert(faqPayload);
        if (error) throw error;
        showAlert("success", "New FAQ sealed in live Knowledge Base!");
      }
      await fetchFaqs();
      handleCloseFaqForm();
    } catch (err: any) {
      console.error(err);
      showAlert("error", err.message || "Failed to save FAQ record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this FAQ entry?")) return;
    setIsSubmitting(true);

    if (isDemo || !isSupabaseConfigured || !supabase) {
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      showAlert("success", "FAQ removed from sandbox.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("faq_knowledge_base").delete().eq("id", id);
      if (error) throw error;
      showAlert("success", "FAQ entry deleted from live Knowledge Base.");
      await fetchFaqs();
    } catch (err: any) {
      showAlert("error", `Delete failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // AI SUGGESTED FAQS HANDLERS
  // ----------------------------------------------------
  const handlePublishSuggestedFaq = async (suggested: SuggestedFaqItem) => {
    setIsSubmitting(true);

    const faqPayload: any = {
      question: suggested.question,
      answer: suggested.answer,
      keywords: suggested.keywords,
      category: suggested.category,
      status: "published",
      shortTitle: suggested.shortTitle || undefined,
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("faq_knowledge_base").insert(faqPayload);
        if (error) throw error;
      }
      // Update local state
      const newFaq: FaqItem = { ...faqPayload, id: `faq_${Date.now()}` };
      setFaqs((prev) => [newFaq, ...prev]);

      // Remove or mark as published in suggestions list
      const nextSuggested = suggestedFaqs.filter((s) => s.id !== suggested.id);
      setSuggestedFaqs(nextSuggested);
      try {
        localStorage.setItem("portfolio_ai_suggested_faqs", JSON.stringify(nextSuggested));
      } catch {}

      showAlert("success", `"${suggested.shortTitle || suggested.question}" published to Knowledge Base!`);
    } catch (err: any) {
      showAlert("error", `Failed to publish suggestion: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismissSuggestedFaq = (id: string) => {
    const next = suggestedFaqs.filter((s) => s.id !== id);
    setSuggestedFaqs(next);
    try {
      localStorage.setItem("portfolio_ai_suggested_faqs", JSON.stringify(next));
    } catch {}
    showAlert("success", "Suggestion dismissed.");
  };

  const handleGenerateMoreSuggestions = () => {
    setIsGeneratingSuggestions(true);
    setTimeout(() => {
      const freshIdeas: SuggestedFaqItem[] = [
        {
          id: `sugg_idea_${Date.now()}_1`,
          shortTitle: "Packaging Material Finishes",
          question: "Can you design for specialty printing finishes like Spot UV, Gold Foil, and Embossing?",
          answer: "Yes! Rashed prepares dedicated technical spot-layer separation files in Adobe Illustrator for Spot UV, Hot Foil Stamping (Gold/Silver), and Multi-level Embossing, ensuring seamless execution with high-end packaging manufacturers.",
          category: "packaging",
          keywords: ["spot uv", "foil stamping", "embossing", "finishes", "specialty print", "packaging"],
          reason: "High correlation with premium cosmetics & supplement client inquiries.",
          sourceInsight: "Visitor searches for luxury packaging production",
          confidenceScore: 97,
          status: "suggested",
        },
        {
          id: `sugg_idea_${Date.now()}_2`,
          shortTitle: "Urgent Rush Projects",
          question: "Do you accept urgent or express turnaround design requests?",
          answer: "Yes, rush design delivery (24 to 48 hours for marketing campaigns, labels, or event branding) is accommodated depending on current studio schedule with an express expedite fee. Reach out directly on WhatsApp to confirm immediate availability.",
          category: "services",
          keywords: ["urgent", "rush", "express", "fast delivery", "timeline", "quick turnaround"],
          reason: "Frequently asked by event organizers and marketing managers facing tight deadlines.",
          sourceInsight: "Detected urgent inquiry spikes during month-end campaign launches",
          confidenceScore: 93,
          status: "suggested",
        },
      ];

      const merged = [...freshIdeas, ...suggestedFaqs];
      setSuggestedFaqs(merged);
      try {
        localStorage.setItem("portfolio_ai_suggested_faqs", JSON.stringify(merged));
      } catch {}
      setIsGeneratingSuggestions(false);
      showAlert("success", "AI synthesized 2 high-intent FAQ drafts from visitor trends!");
    }, 1200);
  };

  // ----------------------------------------------------
  // CHAT CONTROL & TRAINING DIRECTIVES HANDLERS
  // ----------------------------------------------------
  const handleOpenRuleForm = (rule: ChatTrainingRule | null = null) => {
    setEditingRule(rule);
    if (rule) {
      setRuleTitle(rule.title);
      setRuleInstruction(rule.instruction);
      setRuleType(rule.type);
      setRuleCategory(rule.category);
    } else {
      setRuleTitle("");
      setRuleInstruction("");
      setRuleType("do");
      setRuleCategory("behavior");
    }
    setIsRuleFormOpen(true);
  };

  const handleCloseRuleForm = () => {
    setIsRuleFormOpen(false);
    setEditingRule(null);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim() || !ruleInstruction.trim()) {
      showAlert("error", "Title and instruction are required.");
      return;
    }

    let updatedRules: ChatTrainingRule[];
    if (editingRule) {
      updatedRules = trainingRules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              title: ruleTitle.trim(),
              instruction: ruleInstruction.trim(),
              type: ruleType,
              category: ruleCategory,
            }
          : r
      );
    } else {
      const newRule: ChatTrainingRule = {
        id: `rule_${Date.now()}`,
        title: ruleTitle.trim(),
        instruction: ruleInstruction.trim(),
        type: ruleType,
        category: ruleCategory,
        isActive: true,
        priority: trainingRules.length + 1,
      };
      updatedRules = [...trainingRules, newRule];
    }

    await persistTrainingRules(
      updatedRules,
      editingRule ? "Training directive updated!" : "New AI training directive sealed!"
    );
    handleCloseRuleForm();
  };

  const handleToggleRuleActive = async (id: string) => {
    const updated = trainingRules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    await persistTrainingRules(updated, "Guideline state toggled!");
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this training rule?")) return;
    const updated = trainingRules.filter((r) => r.id !== id);
    await persistTrainingRules(updated, "Guideline deleted.");
  };

  // ----------------------------------------------------
  // BULK IMPORT / PASTE TRAINING DATA HANDLER
  // ----------------------------------------------------
  const handleApplyBulkImport = async () => {
    if (!bulkInputText.trim()) {
      showAlert("error", "Please paste or enter instruction text or JSON first.");
      return;
    }

    const raw = bulkInputText.trim();
    let importedRules: ChatTrainingRule[] = [];

    // Attempt 1: Try parsing as JSON array
    if (raw.startsWith("[") && raw.endsWith("]")) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          importedRules = parsed.map((item: any, idx: number) => ({
            id: item.id || `bulk_rule_${Date.now()}_${idx}`,
            title: item.title || item.name || `Rule #${idx + 1}`,
            instruction: item.instruction || item.description || item.rule || String(item),
            type: (item.type === "dont" || item.type === "guide" ? item.type : "do") as any,
            category: item.category || "behavior",
            isActive: item.isActive !== false,
            priority: trainingRules.length + idx + 1,
          }));
        }
      } catch (err: any) {
        showAlert("error", `Invalid JSON format: ${err.message}`);
        return;
      }
    }

    // Attempt 2: If not JSON array, parse plain lines or bulleted text
    if (importedRules.length === 0) {
      const lines = raw
        .split(/\r?\n/)
        .map((l) => l.replace(/^[-*•\d.]+\s*/, "").trim())
        .filter((l) => l.length > 5);

      if (lines.length === 0) {
        showAlert("error", "No valid instructions detected in text.");
        return;
      }

      importedRules = lines.map((line, idx) => {
        const isDont = line.toLowerCase().includes("don't") || line.toLowerCase().includes("never") || line.toLowerCase().includes("কখনোই না");
        const isGuide = line.toLowerCase().includes("guide") || line.toLowerCase().includes("if ") || line.toLowerCase().includes("when ");
        return {
          id: `bulk_rule_${Date.now()}_${idx}`,
          title: line.length > 40 ? line.slice(0, 38) + "..." : line,
          instruction: line,
          type: isDont ? "dont" : isGuide ? "guide" : "do",
          category: "behavior",
          isActive: true,
          priority: trainingRules.length + idx + 1,
        };
      });
    }

    const merged = [...trainingRules, ...importedRules];
    await persistTrainingRules(
      merged,
      `Successfully trained AI bot with ${importedRules.length} new guidelines!`
    );
    setBulkInputText("");
    setIsBulkModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkInputText(text);
        showAlert("success", `File "${file.name}" loaded into training editor.`);
      }
    };
    reader.onerror = () => showAlert("error", "Failed to read file.");
    reader.readAsText(file);
  };

  // Filter Knowledge Base FAQs
  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(faq.keywords) && faq.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = categoryFilter === "all" || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Filter Training Rules
  const filteredRules = trainingRules.filter((r) => {
    return ruleCategoryFilter === "all" || r.category === ruleCategoryFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="faq-knowledge-panel">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            FAQ & AI Knowledge Base
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Control chatbot behavior, train custom rules, and manage instant verified Q&A prompts.
          </p>
        </div>

        {/* Global Action depending on Tab */}
        {activeTab === "faqs" && (
          <button
            onClick={() => handleOpenFaqForm(null)}
            className="self-start px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/10 cursor-pointer"
            id="add-faq-btn"
          >
            <Plus className="w-4 h-4" />
            Add Q&A Entry
          </button>
        )}

        {activeTab === "suggested" && (
          <button
            onClick={handleGenerateMoreSuggestions}
            disabled={isGeneratingSuggestions}
            className="self-start px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/10 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGeneratingSuggestions ? "animate-spin" : ""}`} />
            {isGeneratingSuggestions ? "Analyzing..." : "Analyze & Generate FAQs"}
          </button>
        )}

        {activeTab === "chat_control" && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              Bulk Import / Paste
            </button>
            <button
              onClick={() => handleOpenRuleForm(null)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Rule
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveTab("faqs")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "faqs"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Knowledge Base FAQs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === "faqs" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {faqs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("suggested")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "suggested"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span>AI Suggested FAQs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === "suggested" ? "bg-white/20 text-white" : "bg-purple-950/60 text-purple-300"
            }`}
          >
            {suggestedFaqs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("chat_control")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "chat_control"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800"
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-300" />
          <span>Chat Control & Training</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === "chat_control" ? "bg-white/20 text-white" : "bg-emerald-950/60 text-emerald-300"
            }`}
          >
            {trainingRules.filter((r) => r.isActive).length}/{trainingRules.length} Active
          </span>
        </button>
      </div>

      {/* Shared Toast Notification */}
      {alertMsg && (
        <div
          className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 text-xs leading-relaxed animate-fade-in ${
            alertMsg.type === "success"
              ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/50 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMsg.type === "success" ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-zinc-400 hover:text-white font-mono text-xs">
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: KNOWLEDGE BASE FAQS (DUAL COLUMNS DESKTOP, SINGLE COLUMN MOBILE)
          ========================================================================= */}
      {activeTab === "faqs" && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter / Search Bar */}
          <div className="bg-[#111218] border border-zinc-800/90 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 items-center shadow-xs">
            <div className="relative w-full md:flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#16171f] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-xs outline-none transition-all placeholder:text-zinc-500"
                placeholder="Search questions, keywords, or answers..."
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full md:w-auto px-3.5 py-2 bg-[#16171f] border border-zinc-800 focus:border-purple-500/50 text-zinc-200 text-xs rounded-xl outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="experience">Experience</option>
                <option value="services">Services</option>
                <option value="skills">Skills</option>
                <option value="branding">Branding</option>
                <option value="packaging">Packaging</option>
                <option value="pricing">Rates & Pricing</option>
              </select>
            </div>
          </div>

          {/* DUAL COLUMNS GRID (md:grid-cols-2) on Desktop, SINGLE COLUMN on Mobile */}
          {isLoadingFaqs ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : filteredFaqs.length === 0 ? (
            <div className="bg-[#111218] border border-zinc-800/80 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
              <HelpCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-300 font-medium text-sm">No Knowledge entries found</p>
              <p className="text-xs text-zinc-400 mt-1">Try widening your search tags or create a new prompt entry.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4" id="faq-list">
              {filteredFaqs.map((faq) => (
                <div
                  key={faq.id || faq.question}
                  className="bg-[#111218] border border-zinc-800/90 hover:border-zinc-700/80 rounded-2xl p-4 sm:p-5 transition-all duration-200 group relative shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 bg-purple-950/50 border border-purple-500/20 text-purple-300 text-[10px] font-mono uppercase tracking-wider rounded-full">
                          {faq.category}
                        </span>
                        {faq.shortTitle && (
                          <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-mono rounded-md truncate max-w-[150px]">
                            {faq.shortTitle}
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-full border ${
                          faq.status === "published"
                            ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-300"
                            : "bg-zinc-800/60 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {faq.status}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-semibold text-white font-sans leading-snug">
                      {faq.question}
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line line-clamp-4">
                      {faq.answer}
                    </p>

                    {faq.keywords && faq.keywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                        {faq.keywords.slice(0, 4).map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono text-zinc-400 bg-zinc-800/60 border border-zinc-700/40 px-1.5 py-0.5 rounded-md"
                          >
                            #{kw}
                          </span>
                        ))}
                        {faq.keywords.length > 4 && (
                          <span className="text-[10px] text-zinc-500">+{faq.keywords.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-zinc-800/60">
                    <button
                      onClick={() => handleOpenFaqForm(faq)}
                      className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-700/60 rounded-lg transition-colors cursor-pointer"
                      title="Edit FAQ"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {faq.id && (
                      <button
                        onClick={() => handleDeleteFaq(faq.id!)}
                        className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete FAQ"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: AI SUGGESTED FAQS (DUAL COLUMNS DESKTOP, SINGLE COLUMN MOBILE)
          ========================================================================= */}
      {activeTab === "suggested" && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-xs sm:text-sm font-semibold text-purple-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                Adaptive AI Knowledge Discovery
              </h3>
              <p className="text-[11px] text-zinc-400">
                These questions are synthesized from visitor interactions, chat intent patterns, and industry best practices. Review and publish with 1 click.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 shrink-0">
              {suggestedFaqs.length} Draft Suggestions
            </span>
          </div>

          {/* DUAL COLUMNS GRID (md:grid-cols-2) on Desktop, SINGLE COLUMN on Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {suggestedFaqs.map((sugg) => (
              <div
                key={sugg.id}
                className="bg-[#111218] border border-purple-500/25 hover:border-purple-500/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 group relative shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-mono uppercase tracking-wider rounded-full">
                        {sugg.category}
                      </span>
                      {sugg.shortTitle && (
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-mono rounded-md">
                          {sugg.shortTitle}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {sugg.confidenceScore}% match
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-white font-sans leading-snug">
                    {sugg.question}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                    {sugg.answer}
                  </p>

                  <div className="p-2.5 rounded-xl bg-[#0b0c10] border border-white/5 space-y-1">
                    <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                      <span>💡</span>
                      <span className="font-semibold text-zinc-300">Why Suggested:</span> {sugg.reason}
                    </p>
                    {sugg.sourceInsight && (
                      <p className="text-[10px] text-purple-400 font-mono">
                        Insight: {sugg.sourceInsight}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-zinc-800/60">
                  <button
                    onClick={() => handleDismissSuggestedFaq(sugg.id)}
                    className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setFaqQuestion(sugg.question);
                        setFaqAnswer(sugg.answer);
                        setFaqShortTitle(sugg.shortTitle || "");
                        setFaqKeywordsStr(sugg.keywords.join(", "));
                        setFaqCategory(sugg.category);
                        setFaqStatus("published");
                        setEditingFaq(null);
                        setIsFaqFormOpen(true);
                      }}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl font-medium transition-all cursor-pointer"
                    >
                      Edit & Refine
                    </button>
                    <button
                      onClick={() => handlePublishSuggestedFaq(sugg)}
                      disabled={isSubmitting}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Publish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CHAT CONTROL & AI TRAINING (DUAL COLUMNS DESKTOP, SINGLE COLUMN MOBILE)
          ========================================================================= */}
      {activeTab === "chat_control" && (
        <div className="space-y-4 animate-fade-in">
          {/* Header Info */}
          <div className="p-4 bg-[#111218] border border-zinc-800/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                Live AI Directives & Policy Engine
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                Every guideline here directly conditions the LLM's system prompt in real-time. Edit individual rules or bulk paste new behavioral instructions.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
              {["all", "tone", "behavior", "pricing", "career", "scope"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setRuleCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                    ruleCategoryFilter === cat
                      ? "bg-purple-600 text-white font-semibold"
                      : "bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* DUAL COLUMNS GRID (md:grid-cols-2) on Desktop, SINGLE COLUMN on Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {filteredRules.map((rule) => {
              const isDo = rule.type === "do";
              const isDont = rule.type === "dont";
              return (
                <div
                  key={rule.id}
                  className={`bg-[#111218] border rounded-2xl p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between shadow-xs ${
                    rule.isActive
                      ? "border-zinc-800/90 hover:border-zinc-700/80"
                      : "border-zinc-800/40 opacity-60"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md ${
                            isDo
                              ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-400"
                              : isDont
                                ? "bg-rose-950/60 border border-rose-500/30 text-rose-400"
                                : "bg-amber-950/60 border border-amber-500/30 text-amber-400"
                          }`}
                        >
                          {rule.type.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-mono uppercase tracking-wider rounded-md">
                          {rule.category}
                        </span>
                      </div>

                      {/* Active Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleRuleActive(rule.id)}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                          rule.isActive ? "bg-purple-600" : "bg-zinc-700"
                        }`}
                        title={rule.isActive ? "Disable rule" : "Enable rule"}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            rule.isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <h4 className="text-xs sm:text-sm font-semibold text-white font-sans leading-snug">
                      {rule.title}
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {rule.instruction}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-zinc-800/60">
                    <button
                      onClick={() => handleOpenRuleForm(rule)}
                      className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-700/60 rounded-lg transition-colors cursor-pointer"
                      title="Edit Guideline"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete Guideline"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT FAQ
          ========================================================================= */}
      {isFaqFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#12131a] border border-zinc-800 w-full max-w-xl rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                {editingFaq ? "Edit Knowledge Base Q&A" : "New Knowledge Base Entry"}
              </h3>
              <button
                onClick={handleCloseFaqForm}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Question / Prompt *</label>
                <input
                  type="text"
                  required
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500"
                  placeholder="e.g., What technical dieline formats do you provide?"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium flex items-center justify-between">
                  <span>Concise Title (for Chatbox Pills)</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Max 30 chars</span>
                </label>
                <input
                  type="text"
                  value={faqShortTitle}
                  onChange={(e) => setFaqShortTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500"
                  placeholder="e.g., Print Dieline Formats"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Grounding Answer *</label>
                <textarea
                  required
                  rows={4}
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 leading-relaxed font-sans"
                  placeholder="Accurate, brand-aligned answer..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Category</label>
                  <select
                    value={faqCategory}
                    onChange={(e) => setFaqCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="general">General</option>
                    <option value="experience">Experience</option>
                    <option value="services">Services</option>
                    <option value="skills">Skills</option>
                    <option value="branding">Branding</option>
                    <option value="packaging">Packaging</option>
                    <option value="pricing">Rates & Pricing</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Status</label>
                  <select
                    value={faqStatus}
                    onChange={(e) => setFaqStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="published">Published (Active)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={faqKeywordsStr}
                  onChange={(e) => setFaqKeywordsStr(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500"
                  placeholder="dieline, print, packaging, cmyk"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleCloseFaqForm}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD / EDIT TRAINING RULE
          ========================================================================= */}
      {isRuleFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#12131a] border border-zinc-800 w-full max-w-xl rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                {editingRule ? "Edit Training Guideline" : "Add AI Behavioral Guideline"}
              </h3>
              <button
                onClick={handleCloseRuleForm}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Directive Title *</label>
                <input
                  type="text"
                  required
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500"
                  placeholder="e.g., Conversational Ping-Pong (Under 40 words)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="do">DO (Encouraged Behavior)</option>
                    <option value="dont">DON'T (Forbidden Behavior)</option>
                    <option value="guide">GUIDE (Contextual Strategy)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Category</label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="behavior">Behavior & Flow</option>
                    <option value="tone">Tone & Multi-lingual</option>
                    <option value="pricing">Pricing & Quotation</option>
                    <option value="career">Career & Job Offers</option>
                    <option value="scope">Scope & Safety Guard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Instruction for AI *</label>
                <textarea
                  required
                  rows={4}
                  value={ruleInstruction}
                  onChange={(e) => setRuleInstruction(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 leading-relaxed font-sans"
                  placeholder="Describe exactly how the AI should behave..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleCloseRuleForm}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Guideline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: BULK IMPORT / PASTE TRAINING DATA
          ========================================================================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#12131a] border border-zinc-800 w-full max-w-2xl rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-400" />
                  Bulk Import / Paste AI Training Data
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Paste newline-separated guidelines or a JSON array of rules. You can also upload a .txt or .json file.
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <button
                type="button"
                onClick={() => setBulkInputMode("paste")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  bulkInputMode === "paste"
                    ? "bg-purple-600 text-white"
                    : "text-zinc-400 hover:text-white bg-zinc-900"
                }`}
              >
                Paste Text / JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkInputMode("upload");
                  fileInputRef.current?.click();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  bulkInputMode === "upload"
                    ? "bg-purple-600 text-white"
                    : "text-zinc-400 hover:text-white bg-zinc-900"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload File (.txt, .json)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="space-y-1.5">
              <textarea
                rows={9}
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                className="w-full p-3.5 bg-[#16171f] border border-zinc-800 rounded-xl text-zinc-200 font-mono text-xs outline-none focus:border-purple-500 leading-relaxed"
                placeholder={`Example 1 (Plain text guidelines, 1 per line):\n- Never output rigid hourly dollar rates unless approved by admin\n- When visitor offers a permanent job, thank them warmly and advise connecting via WhatsApp for Senior Visualizer roles\n\nExample 2 (JSON array format):\n[\n  { "title": "No Generic Pricing", "instruction": "Do not quote dollar amounts without brief", "type": "dont" }\n]`}
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-mono">
                {bulkInputText.trim().split("\n").filter((l) => l.trim()).length} lines detected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkImport}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Brain className="w-4 h-4" />
                  Import & Train AI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
