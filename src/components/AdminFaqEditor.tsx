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
  Shield,
  Bot,
  Brain,
  MessageSquare,
  Layers,
  RefreshCw,
  Tag,
  Palette,
  ExternalLink,
  Link,
  Mail,
  Phone,
  Smile,
  User,
  ToggleLeft,
  ToggleRight,
  ArrowUpRight,
  Play,
  Globe,
  CheckSquare,
  Settings,
  Zap,
  MessageCircle,
  Send,
  GripVertical,
} from "lucide-react";
import { usePortfolio } from "../context/PortfolioContext";
import {
  FALLBACK_FAQS,
  FALLBACK_CHAT_TRAINING_RULES,
  FALLBACK_AI_SUGGESTED_FAQS,
  DEFAULT_CHATBOT_SETTINGS,
  DEFAULT_CHAT_ACTION_BUTTONS,
  DEFAULT_PROJECT_BRIEF_SETTINGS,
  ChatTrainingRule,
  SuggestedFaqItem,
  ChatActionButton,
  StarterQuestionItem,
  ChatbotSettings,
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

type ActiveTab = "faqs" | "suggested" | "chat_control" | "bot_persona";

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

  // ==========================================
  // TAB 4: BOT PERSONA & ACTION CTAS STATE
  // ==========================================
  const { siteSettings, setSiteSettings } = usePortfolio();
  const [chatbotSettings, setChatbotSettingsState] = useState<ChatbotSettings>(() => {
    try {
      const saved = localStorage.getItem("portfolio_chatbot_settings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return siteSettings?.chatbotSettings || DEFAULT_CHATBOT_SETTINGS;
  });
  const [isSavingBotSettings, setIsSavingBotSettings] = useState(false);

  // Action CTA Modal state
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionLabel, setActionLabel] = useState("");
  const [actionType, setActionType] = useState<"behance" | "whatsapp" | "email" | "brief" | "link">("behance");
  const [actionUrl, setActionUrl] = useState("");
  const [actionKeywordsStr, setActionKeywordsStr] = useState("");
  const [actionShowQuickPill, setActionShowQuickPill] = useState(true);
  const [actionPillIcon, setActionPillIcon] = useState("🎨");
  const [actionPrimary, setActionPrimary] = useState(false);
  const [actionIsActive, setActionIsActive] = useState(true);

  // Starter Question Modal state
  const [isStarterModalOpen, setIsStarterModalOpen] = useState(false);
  const [editingStarterId, setEditingStarterId] = useState<string | null>(null);
  const [starterLabel, setStarterLabel] = useState("");
  const [starterIcon, setStarterIcon] = useState("💬");
  const [starterQuery, setStarterQuery] = useState("");
  const [starterIsBrief, setStarterIsBrief] = useState(false);
  const [starterIsFaqToggle, setStarterIsFaqToggle] = useState(false);
  const [starterIsActive, setStarterIsActive] = useState(true);
  const [starterOrder, setStarterOrder] = useState(1);

  // Drag and drop reordering states
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [dragOverActionId, setDragOverActionId] = useState<string | null>(null);
  const [draggedStarterId, setDraggedStarterId] = useState<string | null>(null);
  const [dragOverStarterId, setDragOverStarterId] = useState<string | null>(null);

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

  const fetchChatbotSettings = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "chatbotSettings")
          .maybeSingle();

        if (data && !error && data.value) {
          const loaded = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (loaded && typeof loaded === "object") {
            setChatbotSettingsState((prev) => ({
              ...DEFAULT_CHATBOT_SETTINGS,
              ...prev,
              ...loaded,
            }));
            try {
              localStorage.setItem("portfolio_chatbot_settings", JSON.stringify(loaded));
            } catch {}
          }
        }
      } catch (e) {
        console.warn("Could not load chatbotSettings from DB:", e);
      }
    }
  };

  useEffect(() => {
    fetchFaqs();
    fetchTrainingRules();
    fetchChatbotSettings();
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

  // ----------------------------------------------------
  // TAB 4: BOT PERSONA & ACTION CTAS HANDLERS
  // ----------------------------------------------------
  const handleSaveChatbotSettings = async (override?: ChatbotSettings) => {
    const toSave = override || chatbotSettings;
    setIsSavingBotSettings(true);
    try {
      setChatbotSettingsState(toSave);
      setSiteSettings((prev) => ({
        ...prev,
        chatbotSettings: toSave,
      }));

      try {
        localStorage.setItem("portfolio_chatbot_settings", JSON.stringify(toSave));
      } catch {}

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("site_settings").upsert(
          {
            key: "chatbotSettings",
            value: toSave,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
        if (error) throw error;
      }
      showAlert("success", "Bot Persona & Action CTAs saved successfully! Live chatbot is updated immediately.");
    } catch (err: any) {
      console.error("Error saving chatbot settings:", err);
      showAlert("error", `Save error: ${err.message || "Failed to save to Supabase"}`);
    } finally {
      setIsSavingBotSettings(false);
    }
  };

  const handleResetBotPersonaToDefaults = () => {
    if (window.confirm("Reset Bot Persona & Action CTAs back to recommended studio defaults?")) {
      handleSaveChatbotSettings(DEFAULT_CHATBOT_SETTINGS);
    }
  };

  const handleOpenActionModal = (action: ChatActionButton | null = null, initialShowQuickPill = false) => {
    if (action) {
      setEditingActionId(action.id);
      setActionLabel(action.label);
      setActionType(action.type);
      setActionUrl(action.url || "");
      setActionKeywordsStr(Array.isArray(action.triggerKeywords) ? action.triggerKeywords.join(", ") : "");
      setActionShowQuickPill(action.showAsQuickPill);
      setActionPillIcon(action.pillIcon || "🎨");
      setActionPrimary(!!action.primary);
      setActionIsActive(action.isActive !== false);
    } else {
      setEditingActionId(null);
      setActionLabel("");
      setActionType("behance");
      setActionUrl("https://be.net/rashedpervej");
      setActionKeywordsStr("portfolio, behance, work, kaj, প্রজেক্ট, কাজ, লিংক");
      setActionShowQuickPill(initialShowQuickPill);
      setActionPillIcon("🎨");
      setActionPrimary(false);
      setActionIsActive(true);
    }
    setIsActionModalOpen(true);
  };

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionLabel.trim()) {
      showAlert("error", "Button label is required.");
      return;
    }

    const keywords = actionKeywordsStr
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const currentButtons = chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS;

    let updatedButtons: ChatActionButton[];
    if (editingActionId) {
      updatedButtons = currentButtons.map((btn) =>
        btn.id === editingActionId
          ? {
              ...btn,
              label: actionLabel.trim(),
              type: actionType,
              url: actionUrl.trim() || undefined,
              triggerKeywords: keywords,
              showAsQuickPill: actionShowQuickPill,
              pillIcon: actionPillIcon.trim() || "🎨",
              primary: actionPrimary,
              isActive: actionIsActive,
            }
          : btn
      );
    } else {
      const newBtn: ChatActionButton = {
        id: `cta_${Date.now()}`,
        label: actionLabel.trim(),
        type: actionType,
        url: actionUrl.trim() || undefined,
        triggerKeywords: keywords,
        showAsQuickPill: actionShowQuickPill,
        pillIcon: actionPillIcon.trim() || "🎨",
        primary: actionPrimary,
        isActive: actionIsActive,
        order: currentButtons.length + 1,
      };
      updatedButtons = [...currentButtons, newBtn];
    }

    const updatedSettings = {
      ...chatbotSettings,
      actionButtons: updatedButtons,
    };
    handleSaveChatbotSettings(updatedSettings);
    setIsActionModalOpen(false);
  };

  const handleDeleteAction = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this Action Button?")) return;
    const currentButtons = chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS;
    const updatedButtons = currentButtons.filter((b) => b.id !== id);
    handleSaveChatbotSettings({
      ...chatbotSettings,
      actionButtons: updatedButtons,
    });
  };

  const handleToggleActionActive = (id: string) => {
    const currentButtons = chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS;
    const updatedButtons = currentButtons.map((b) =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    handleSaveChatbotSettings({
      ...chatbotSettings,
      actionButtons: updatedButtons,
    });
  };

  const handleToggleActionQuickPill = (id: string) => {
    const currentButtons = chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS;
    const updatedButtons = currentButtons.map((b) =>
      b.id === id ? { ...b, showAsQuickPill: !b.showAsQuickPill } : b
    );
    handleSaveChatbotSettings({
      ...chatbotSettings,
      actionButtons: updatedButtons,
    });
  };

  // Drag and drop reordering for Action CTAs / Quick Pills
  const handleDropActionReorder = (targetId: string) => {
    if (!draggedActionId || draggedActionId === targetId) {
      setDraggedActionId(null);
      setDragOverActionId(null);
      return;
    }
    const currentButtons = [...(chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS)];
    const sourceIndex = currentButtons.findIndex((b) => b.id === draggedActionId);
    const targetIndex = currentButtons.findIndex((b) => b.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = currentButtons.splice(sourceIndex, 1);
    currentButtons.splice(targetIndex, 0, moved);

    // Re-index orders cleanly
    const reordered = currentButtons.map((btn, idx) => ({
      ...btn,
      order: idx + 1,
    }));

    handleSaveChatbotSettings({
      ...chatbotSettings,
      actionButtons: reordered,
    });
    setDraggedActionId(null);
    setDragOverActionId(null);
    showAlert("success", "Action CTAs / Quick Pills reordered.");
  };

  // Drag and drop reordering for Starter Chips
  const handleDropStarterReorder = (targetId: string) => {
    if (!draggedStarterId || draggedStarterId === targetId) {
      setDraggedStarterId(null);
      setDragOverStarterId(null);
      return;
    }
    const currentStarters = [...(chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || [])];
    const sourceIndex = currentStarters.findIndex((s) => s.id === draggedStarterId);
    const targetIndex = currentStarters.findIndex((s) => s.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = currentStarters.splice(sourceIndex, 1);
    currentStarters.splice(targetIndex, 0, moved);

    // Re-index orders cleanly
    const reordered = currentStarters.map((starter, idx) => ({
      ...starter,
      order: idx + 1,
    }));

    handleSaveChatbotSettings({
      ...chatbotSettings,
      starterQuestions: reordered,
    });
    setDraggedStarterId(null);
    setDragOverStarterId(null);
    showAlert("success", "Starter Chips reordered.");
  };

  const handleOpenStarterModal = (starter: StarterQuestionItem | null = null) => {
    if (starter) {
      setEditingStarterId(starter.id);
      setStarterLabel(starter.label);
      setStarterIcon(starter.icon);
      setStarterQuery(starter.query || "");
      setStarterIsBrief(!!starter.isBrief);
      setStarterIsFaqToggle(!!starter.isFaqToggle);
      setStarterIsActive(starter.isActive !== false);
      setStarterOrder(starter.order || 1);
    } else {
      const currentStarters = chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || [];
      setEditingStarterId(null);
      setStarterLabel("");
      setStarterIcon("💬");
      setStarterQuery("");
      setStarterIsBrief(false);
      setStarterIsFaqToggle(false);
      setStarterIsActive(true);
      setStarterOrder(currentStarters.length + 1);
    }
    setIsStarterModalOpen(true);
  };

  const handleToggleStarterActive = (id: string) => {
    const currentStarters = chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || [];
    const updatedStarters = currentStarters.map((s) =>
      s.id === id ? { ...s, isActive: s.isActive === false } : s
    );
    handleSaveChatbotSettings({
      ...chatbotSettings,
      starterQuestions: updatedStarters,
    });
  };

  const handleDeleteStarter = (id: string) => {
    const currentStarters = chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || [];
    if (!window.confirm("Are you sure you want to remove this starter chip?")) {
      return;
    }
    const updatedStarters = currentStarters.filter((s) => s.id !== id);
    handleSaveChatbotSettings({
      ...chatbotSettings,
      starterQuestions: updatedStarters,
    });
    showAlert("success", "Starter chip removed.");
  };

  const handleSaveStarter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!starterLabel.trim()) {
      showAlert("error", "Chip label is required.");
      return;
    }
    const currentStarters = chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || [];
    let updatedStarters: StarterQuestionItem[];
    if (editingStarterId) {
      updatedStarters = currentStarters.map((s) =>
        s.id === editingStarterId
          ? {
              ...s,
              label: starterLabel.trim(),
              icon: starterIcon.trim() || "💬",
              query: starterQuery.trim() || undefined,
              isBrief: starterIsBrief,
              isFaqToggle: starterIsFaqToggle,
              isActive: starterIsActive,
              order: Number(starterOrder) || 1,
            }
          : s
      );
    } else {
      updatedStarters = [
        ...currentStarters,
        {
          id: `starter_${Date.now()}`,
          label: starterLabel.trim(),
          icon: starterIcon.trim() || "💬",
          query: starterQuery.trim() || undefined,
          isBrief: starterIsBrief,
          isFaqToggle: starterIsFaqToggle,
          isActive: starterIsActive,
          order: Number(starterOrder) || currentStarters.length + 1,
        },
      ];
    }
    // Sort by order
    updatedStarters.sort((a, b) => (a.order || 0) - (b.order || 0));

    handleSaveChatbotSettings({
      ...chatbotSettings,
      starterQuestions: updatedStarters,
    });
    setIsStarterModalOpen(false);
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
            AI Chatbot Knowledge & Control
          </h2>
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
            {isGeneratingSuggestions ? "Analyzing..." : "Analyze & Generate"}
          </button>
        )}

        {activeTab === "chat_control" && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-xs rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              Bulk Import
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

        {activeTab === "bot_persona" && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleResetBotPersonaToDefaults()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-medium text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Reset to defaults"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              onClick={() => handleSaveChatbotSettings()}
              disabled={isSavingBotSettings}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/10 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingBotSettings ? "Saving..." : "Save Changes"}
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
          <span>Q&A Knowledge</span>
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
          <span>AI Suggestions</span>
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
          <span>Training Rules</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === "chat_control" ? "bg-white/20 text-white" : "bg-emerald-950/60 text-emerald-300"
            }`}
          >
            {trainingRules.filter((r) => r.isActive).length}/{trainingRules.length} Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab("bot_persona")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "bot_persona"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800"
          }`}
        >
          <Bot className="w-4 h-4 text-purple-300" />
          <span>Bot & Brief Setup</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === "bot_persona" ? "bg-white/20 text-white" : "bg-purple-950/60 text-purple-300"
            }`}
          >
            {chatbotSettings.actionButtons?.filter((b) => b.isActive).length || 0} CTAs
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
                <Sparkles className="w-4 h-4 text-purple-400" />
                Suggested FAQs
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 shrink-0">
              {suggestedFaqs.length} Suggestions
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
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-mono uppercase tracking-wider rounded-full">
                      {sugg.category}
                    </span>
                    {sugg.shortTitle && (
                      <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-mono rounded-md">
                        {sugg.shortTitle}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-auto">
                      {sugg.confidenceScore}% match
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-white font-sans leading-snug">
                    {sugg.question}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                    {sugg.answer}
                  </p>
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
                      Edit
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
                Training Directives
              </h3>
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
          TAB 4: BOT PERSONA & ACTION CTA ENGINE (MERGED IDEAS 1, 2, 3)
          ========================================================================= */}
      {activeTab === "bot_persona" && (
        <div className="space-y-6 animate-fade-in" id="bot-persona-panel">
          {/* Top Status & Quick Save Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/30 via-zinc-900 to-indigo-950/20 border border-purple-500/20 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                  100% Remote Control
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  {chatbotSettings.showAiBadge === true ? "🤖 AI Mode" : "👤 Human Partner Mode"}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
                  {chatbotSettings.actionButtons?.filter((b) => b.isActive).length || 0} Action CTAs Active
                </span>
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Live Chatbot Persona & Interactive Action CTAs
              </h3>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto self-end md:self-auto">
              <button
                type="button"
                onClick={() => handleSaveChatbotSettings()}
                disabled={isSavingBotSettings}
                className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSavingBotSettings ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MAIN COLUMN: SETTINGS CONTROLS (8 COLS) */}
            <div className="lg:col-span-7 space-y-6">

              {/* CARD 1: PERSONA & BRAND IDENTITY */}
              <div className="bg-[#12131a] border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Bot Identity & Tone</h4>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Bot Display Name *</label>
                    <input
                      type="text"
                      value={chatbotSettings.botName || ""}
                      onChange={(e) =>
                        setChatbotSettingsState({ ...chatbotSettings, botName: e.target.value })
                      }
                      placeholder="e.g. Creative Advisor"
                      className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Online Status Subtitle *</label>
                    <input
                      type="text"
                      value={chatbotSettings.botSubtitle || ""}
                      onChange={(e) =>
                        setChatbotSettingsState({ ...chatbotSettings, botSubtitle: e.target.value })
                      }
                      placeholder="e.g. Online • Replies in real-time"
                      className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                    />
                  </div>
                </div>

                {/* AI Badge vs Human Badge Switch */}
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">Show Robotic &quot;AI&quot; Tag</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          showAiBadge: !chatbotSettings.showAiBadge,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        chatbotSettings.showAiBadge ? "bg-purple-600" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          chatbotSettings.showAiBadge ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {!chatbotSettings.showAiBadge && (
                    <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="text-[11px] font-medium text-zinc-400 shrink-0">
                        Custom Human Badge Text:
                      </label>
                      <input
                        type="text"
                        value={chatbotSettings.botBadgeText || ""}
                        onChange={(e) =>
                          setChatbotSettingsState({ ...chatbotSettings, botBadgeText: e.target.value })
                        }
                        placeholder="e.g. Studio Partner"
                        className="flex-1 px-3 py-1.5 bg-[#171822] border border-zinc-700/80 rounded-lg text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Welcome / Greeting Message */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">
                      Welcome Greeting Message *
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {(chatbotSettings.greetingMessage || "").length} chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={chatbotSettings.greetingMessage || ""}
                    onChange={(e) =>
                      setChatbotSettingsState({ ...chatbotSettings, greetingMessage: e.target.value })
                    }
                    placeholder="Hello! I am Rashed's Creative Advisor..."
                    className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs leading-relaxed"
                  />
                </div>

                {/* Starter Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Starter Chips Section Title
                  </label>
                  <input
                    type="text"
                    value={chatbotSettings.quickHelpTitle || ""}
                    onChange={(e) =>
                      setChatbotSettingsState({ ...chatbotSettings, quickHelpTitle: e.target.value })
                    }
                    placeholder="How can I help you today?"
                    className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                {/* Human Tone AI Directives */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span>System Persona Directives</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          humanPersonaPrompt:
                            "Speak like a warm, courteous, and seasoned senior design visualizer and creative consultant. Chat like a real human design peer sitting across the table. Never use robotic clichés, corporate jargon, or mention that you are an AI model. Be concise (1-3 sentences), engaging, and passionate about typography, packaging, and brand aesthetics.",
                        })
                      }
                      className="text-[10px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                    >
                      Use Recommended Prompt
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={chatbotSettings.humanPersonaPrompt || ""}
                    onChange={(e) =>
                      setChatbotSettingsState({ ...chatbotSettings, humanPersonaPrompt: e.target.value })
                    }
                    placeholder="e.g. Speak like a real human design consultant sitting across the table..."
                    className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs leading-relaxed"
                  />
                </div>
              </div>

              {/* CARD 2: DYNAMIC ACTION CTA BUTTONS */}
              <div className="bg-[#12131a] border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Action CTAs</h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenActionModal(null)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Action CTA
                  </button>
                </div>

                {/* List of CTA Buttons with Drag Reorder */}
                <div className="space-y-3">
                  {(chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS).map((btn, idx) => (
                    <div
                      key={btn.id || idx}
                      draggable
                      onDragStart={(e) => {
                        setDraggedActionId(btn.id);
                        e.dataTransfer.setData("text/plain", btn.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverActionId !== btn.id) {
                          setDragOverActionId(btn.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverActionId === btn.id) {
                          setDragOverActionId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropActionReorder(btn.id);
                      }}
                      className={`p-3.5 rounded-xl border transition-all ${
                        draggedActionId === btn.id
                          ? "opacity-40 scale-[0.99] border-purple-500 bg-purple-950/20"
                          : dragOverActionId === btn.id
                            ? "border-purple-400 bg-purple-500/10 shadow-lg scale-[1.01]"
                            : btn.isActive !== false
                              ? "bg-[#171822] border-zinc-800 hover:border-zinc-700"
                              : "bg-zinc-950/40 border-zinc-900 opacity-60"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {/* Drag Grip Handle */}
                          <div
                            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-purple-400 p-1 -ml-1 rounded-md transition-colors shrink-0"
                            title="Drag up or down to reorder"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base shrink-0">{btn.pillIcon || "🔗"}</span>
                              <span className="text-xs font-bold text-white truncate">{btn.label}</span>

                              {/* Type badge */}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium uppercase border ${
                                  btn.type === "behance"
                                    ? "bg-purple-950/50 text-purple-300 border-purple-500/30"
                                    : btn.type === "whatsapp"
                                      ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                                      : btn.type === "email"
                                        ? "bg-blue-950/50 text-blue-300 border-blue-500/30"
                                        : btn.type === "brief"
                                          ? "bg-amber-950/50 text-amber-300 border-amber-500/30"
                                          : "bg-zinc-800 text-zinc-300 border-zinc-700"
                                }`}
                              >
                                {btn.type}
                              </span>

                              {btn.primary && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                                  Primary Accent
                                </span>
                              )}

                              {btn.showAsQuickPill && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  Quick Pill
                                </span>
                              )}
                            </div>

                            {btn.url && (
                              <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono truncate">
                                <ExternalLink className="w-3 h-3 shrink-0 text-zinc-500" />
                                <span className="truncate">{btn.url}</span>
                              </div>
                            )}

                            {/* Trigger Keywords */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              <span className="text-[10px] text-zinc-500 font-mono">Triggers:</span>
                              {(btn.triggerKeywords || []).map((kw, kidx) => (
                                <span
                                  key={kidx}
                                  className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-300 font-mono"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {/* Toggle Quick Pill Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleActionQuickPill(btn.id)}
                            className={`p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                              btn.showAsQuickPill
                                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                                : "bg-zinc-800/40 text-zinc-400 border-zinc-700 hover:text-white"
                            }`}
                            title={btn.showAsQuickPill ? "Shown as floating quick pill" : "Hidden from quick pills"}
                          >
                            <span className="text-[10px]">{btn.showAsQuickPill ? "Pill ON" : "Pill OFF"}</span>
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleActionActive(btn.id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              btn.isActive !== false
                                ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                                : "bg-zinc-800/40 text-zinc-500 border-zinc-700"
                            }`}
                            title={btn.isActive !== false ? "Active CTA" : "Inactive CTA"}
                          >
                            {btn.isActive !== false ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenActionModal(btn)}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Edit Button"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteAction(btn.id)}
                            className="p-1.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete Button"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 3: FLOATING QUICK ACTION PILLS */}
              <div className="bg-[#12131a] border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Quick Pills</h4>
                      <p className="text-[11px] text-zinc-400">Floating action buttons above the chat input.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          enableQuickPills: chatbotSettings.enableQuickPills === false,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        chatbotSettings.enableQuickPills !== false ? "bg-purple-600" : "bg-zinc-700"
                      }`}
                      title={chatbotSettings.enableQuickPills !== false ? "Quick pills enabled" : "Quick pills disabled"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          chatbotSettings.enableQuickPills !== false ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenActionModal(null, true)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Quick Pill
                    </button>
                  </div>
                </div>

                {/* Quick Pills Limit & Live Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-[#171822] border border-zinc-800 rounded-xl space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
                      <span>Max Visible Pills in Chat</span>
                      <span className="text-purple-400 font-mono font-bold">{chatbotSettings.maxQuickPills ?? 5}</span>
                    </label>
                    <select
                      value={chatbotSettings.maxQuickPills ?? 5}
                      onChange={(e) =>
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          maxQuickPills: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-[#12131a] border border-zinc-700/80 rounded-lg text-white text-xs outline-none focus:border-purple-500 cursor-pointer"
                    >
                      {[2, 3, 4, 5, 6, 8, 10].map((num) => (
                        <option key={num} value={num}>
                          Show up to {num} pills
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-[#171822] border border-zinc-800 rounded-xl space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400 block">Total Active Pills</label>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-lg font-bold text-white font-mono">
                        {(chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS).filter(
                          (b) => b.isActive !== false && b.showAsQuickPill
                        ).length}
                      </span>
                      <span className="text-[11px] text-zinc-400">active & pinned to input row</span>
                    </div>
                  </div>
                </div>

                {/* List of Quick Pills with Drag-and-Drop and Direct Remove */}
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-medium text-zinc-300">Active Quick Pills (drag to reorder, click Pill ON/OFF or trash to remove):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS)
                      .filter((b) => b.showAsQuickPill)
                      .map((pill) => (
                        <div
                          key={pill.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedActionId(pill.id);
                            e.dataTransfer.setData("text/plain", pill.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverActionId !== pill.id) {
                              setDragOverActionId(pill.id);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverActionId === pill.id) {
                              setDragOverActionId(null);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropActionReorder(pill.id);
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            draggedActionId === pill.id
                              ? "opacity-40 scale-[0.99] border-purple-500 bg-purple-950/20"
                              : dragOverActionId === pill.id
                                ? "border-purple-400 bg-purple-500/10 shadow-lg scale-[1.01]"
                                : pill.isActive !== false
                                  ? "bg-[#171822] border-zinc-800 hover:border-zinc-700"
                                  : "bg-zinc-950/40 border-zinc-900 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            {/* Drag handle */}
                            <div
                              className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-purple-400 p-0.5 rounded transition-colors shrink-0"
                              title="Drag to reorder pill position"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-base shrink-0">{pill.pillIcon || "🔗"}</span>
                            <div className="truncate min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{pill.label}</p>
                              <span className="text-[10px] text-zinc-400 font-mono uppercase">{pill.type}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Toggle quick pill visibility */}
                            <button
                              type="button"
                              onClick={() => handleToggleActionQuickPill(pill.id)}
                              className="px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
                              title="Remove from quick pills"
                            >
                              Remove Pill
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenActionModal(pill)}
                              className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Edit Quick Pill"
                            >
                              <Edit className="w-3 h-3" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteAction(pill.id)}
                              className="p-1 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors cursor-pointer"
                              title="Delete Button Completely"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-zinc-300">Live Quick Pills Preview:</p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {(chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS)
                      .filter((btn) => btn.isActive !== false && btn.showAsQuickPill)
                      .slice(0, chatbotSettings.maxQuickPills ?? 5)
                      .map((pill) => (
                        <span
                          key={pill.id}
                          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border shadow-2xs ${
                            pill.primary
                              ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                              : "bg-white/5 text-zinc-300 border-white/10"
                          }`}
                        >
                          <span>{pill.pillIcon || "🔗"}</span>
                          <span>{pill.label}</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* CARD 3B: PRE-CHAT GATE & LEAD CONTROLS */}
              <div className="bg-[#12131a] border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Pre-Chat Gate</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Toggle 1: Pre-Chat Smart Gate */}
                  <div className="p-4 bg-[#171822] border border-zinc-800 rounded-xl flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-white block">Pre-Chat Smart Gate</span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Offers visitors an optional 2-second intro (Name & WhatsApp) before chatting, with instant 1-click skip.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          enablePreChatGate: chatbotSettings.enablePreChatGate === false,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        chatbotSettings.enablePreChatGate !== false ? "bg-emerald-600" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          chatbotSettings.enablePreChatGate !== false ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 2: Progressive Lead Gate */}
                  <div className="p-4 bg-[#171822] border border-zinc-800 rounded-xl flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-white block">Progressive Lead Gate</span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Captures visitor name & contact in 2 stages: skippable prompt after 4 messages, followed by a mandatory gate after 8 messages.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = (chatbotSettings.enableProgressiveLeadGate !== false && chatbotSettings.enablePromptBrief !== false) ? false : true;
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          enableProgressiveLeadGate: nextVal,
                          enablePromptBrief: nextVal,
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                        (chatbotSettings.enableProgressiveLeadGate !== false && chatbotSettings.enablePromptBrief !== false)
                          ? "bg-purple-600"
                          : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          (chatbotSettings.enableProgressiveLeadGate !== false && chatbotSettings.enablePromptBrief !== false)
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Welcome Page Title & Copy Sync */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Welcome Page Content & Logo Sync</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Clean CSS Glass Layout</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Main Title *</label>
                      <input
                        type="text"
                        value={chatbotSettings.welcomeTitle || ""}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            welcomeTitle: e.target.value,
                          })
                        }
                        placeholder="Welcome"
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Subtitle / Tagline *</label>
                      <input
                        type="text"
                        value={chatbotSettings.welcomeSubtitle || ""}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            welcomeSubtitle: e.target.value,
                          })
                        }
                        placeholder="Let’s chat together"
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Button CTA Label *</label>
                      <input
                        type="text"
                        value={chatbotSettings.welcomeButtonText || ""}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            welcomeButtonText: e.target.value,
                          })
                        }
                        placeholder="Chat Now"
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Custom Top-Left Logo URL (Optional)</label>
                      <input
                        type="text"
                        value={chatbotSettings.welcomeLogoUrl || ""}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            welcomeLogoUrl: e.target.value,
                          })
                        }
                        placeholder="Leave empty to use main site logo"
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3D: PROJECT BRIEF CONTROLS */}
              <div className="bg-[#12131a] border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Project Brief Form</h4>
                    </div>
                  </div>
                </div>

                {/* Step 1 Settings */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-purple-300 font-mono">Step 1: Scope & Budget</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Step 1 Heading</label>
                      <input
                        type="text"
                        value={chatbotSettings.projectBriefSettings?.step1Title ?? DEFAULT_PROJECT_BRIEF_SETTINGS.step1Title}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            projectBriefSettings: {
                              ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                              ...chatbotSettings.projectBriefSettings,
                              step1Title: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Step 1 Subtitle</label>
                      <input
                        type="text"
                        value={chatbotSettings.projectBriefSettings?.step1Subtitle ?? DEFAULT_PROJECT_BRIEF_SETTINGS.step1Subtitle}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            projectBriefSettings: {
                              ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                              ...chatbotSettings.projectBriefSettings,
                              step1Subtitle: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Categories list */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-medium text-zinc-400">Project Categories (Comma-separated)</label>
                    <input
                      type="text"
                      value={(
                        chatbotSettings.projectBriefSettings?.categories ??
                        DEFAULT_PROJECT_BRIEF_SETTINGS.categories
                      ).join(", ")}
                      onChange={(e) => {
                        const items = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          projectBriefSettings: {
                            ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                            ...chatbotSettings.projectBriefSettings,
                            categories: items,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      placeholder="Brand Identity, Packaging Design, Motion Graphics"
                    />
                  </div>

                  {/* Budget stops */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-medium text-zinc-400">Budget Range Stops (Comma-separated)</label>
                    <input
                      type="text"
                      value={(
                        chatbotSettings.projectBriefSettings?.budgetOptions ??
                        DEFAULT_PROJECT_BRIEF_SETTINGS.budgetOptions
                      ).join(", ")}
                      onChange={(e) => {
                        const items = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          projectBriefSettings: {
                            ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                            ...chatbotSettings.projectBriefSettings,
                            budgetOptions: items,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      placeholder="< $500, $500 - $1.5k, $1.5k - $3k, $3k+"
                    />
                  </div>

                  {/* Flexible toggle */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Enable Flexible Budget Button</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = chatbotSettings.projectBriefSettings?.enableFlexibleBudget !== false;
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          projectBriefSettings: {
                            ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                            ...chatbotSettings.projectBriefSettings,
                            enableFlexibleBudget: !current,
                          },
                        });
                      }}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                        chatbotSettings.projectBriefSettings?.enableFlexibleBudget !== false
                          ? "bg-purple-600"
                          : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          chatbotSettings.projectBriefSettings?.enableFlexibleBudget !== false
                            ? "translate-x-5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Step 2 Settings */}
                <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                  <span className="text-xs font-semibold text-purple-300 font-mono">Step 2: Contact & Submit</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Step 2 Heading</label>
                      <input
                        type="text"
                        value={chatbotSettings.projectBriefSettings?.step2Title ?? DEFAULT_PROJECT_BRIEF_SETTINGS.step2Title}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            projectBriefSettings: {
                              ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                              ...chatbotSettings.projectBriefSettings,
                              step2Title: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Step 2 Subtitle</label>
                      <input
                        type="text"
                        value={chatbotSettings.projectBriefSettings?.step2Subtitle ?? DEFAULT_PROJECT_BRIEF_SETTINGS.step2Subtitle}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            projectBriefSettings: {
                              ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                              ...chatbotSettings.projectBriefSettings,
                              step2Subtitle: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Submit Button Text</label>
                      <input
                        type="text"
                        value={chatbotSettings.projectBriefSettings?.submitButtonText ?? DEFAULT_PROJECT_BRIEF_SETTINGS.submitButtonText}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            projectBriefSettings: {
                              ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                              ...chatbotSettings.projectBriefSettings,
                              submitButtonText: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400">Confidentiality Notice</label>
                      <input
                        type="text"
                        value={chatbotSettings.projectBriefSettings?.confidentialityNotice ?? DEFAULT_PROJECT_BRIEF_SETTINGS.confidentialityNotice}
                        onChange={(e) =>
                          setChatbotSettingsState({
                            ...chatbotSettings,
                            projectBriefSettings: {
                              ...DEFAULT_PROJECT_BRIEF_SETTINGS,
                              ...chatbotSettings.projectBriefSettings,
                              confidentialityNotice: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 4: STARTER QUESTION CHIPS */}
              <div className="bg-[#12131a] border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Starter Chips</h4>
                      <p className="text-[11px] text-zinc-400">
                        Interactive recommendation bubbles shown after the welcome greeting.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          enableStarterChips: chatbotSettings.enableStarterChips === false,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        chatbotSettings.enableStarterChips !== false ? "bg-purple-600" : "bg-zinc-700"
                      }`}
                      title={chatbotSettings.enableStarterChips !== false ? "Starter chips enabled" : "Starter chips disabled"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          chatbotSettings.enableStarterChips !== false ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenStarterModal(null)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Chip
                    </button>
                  </div>
                </div>

                {/* Starter Chips Count Selector & Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-[#171822] border border-zinc-800 rounded-xl space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
                      <span>Max Visible Chips in Chat</span>
                      <span className="text-purple-400 font-mono font-bold">{chatbotSettings.maxStarterChips ?? 4}</span>
                    </label>
                    <select
                      value={chatbotSettings.maxStarterChips ?? 4}
                      onChange={(e) =>
                        setChatbotSettingsState({
                          ...chatbotSettings,
                          maxStarterChips: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-[#12131a] border border-zinc-700/80 rounded-lg text-white text-xs outline-none focus:border-purple-500 cursor-pointer"
                    >
                      {[2, 3, 4, 5, 6, 8].map((num) => (
                        <option key={num} value={num}>
                          Show up to {num} chips
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-[#171822] border border-zinc-800 rounded-xl space-y-1">
                    <label className="text-[11px] font-medium text-zinc-400 block">Total Active Chips</label>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-lg font-bold text-white font-mono">
                        {(chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || []).filter(
                          (s) => s.isActive !== false
                        ).length}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        of {(chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || []).length} total
                      </span>
                    </div>
                  </div>
                </div>

                {/* List of Chips with Drag Reorder */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {(chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || []).map((starter, sIdx) => {
                    const isChipActive = starter.isActive !== false;
                    return (
                      <div
                        key={starter.id || sIdx}
                        draggable
                        onDragStart={(e) => {
                          setDraggedStarterId(starter.id);
                          e.dataTransfer.setData("text/plain", starter.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverStarterId !== starter.id) {
                            setDragOverStarterId(starter.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverStarterId === starter.id) {
                            setDragOverStarterId(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropStarterReorder(starter.id);
                        }}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                          draggedStarterId === starter.id
                            ? "opacity-40 scale-[0.99] border-purple-500 bg-purple-950/20"
                            : dragOverStarterId === starter.id
                              ? "border-purple-400 bg-purple-500/10 shadow-lg scale-[1.01]"
                              : isChipActive
                                ? "bg-[#171822] border-zinc-800 hover:border-zinc-700"
                                : "bg-zinc-950/40 border-zinc-900 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          {/* Drag grip handle */}
                          <div
                            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-purple-400 p-0.5 -ml-1 rounded transition-colors shrink-0"
                            title="Drag to reorder starter chip position"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <span className="text-base shrink-0">{starter.icon}</span>
                          <div className="truncate min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-white truncate">{starter.label}</p>
                              {!isChipActive && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {starter.isBrief ? "Opens Project Brief" : starter.isFaqToggle ? "Opens FAQ Drawer" : starter.query || "No query"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Toggle Active status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStarterActive(starter.id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isChipActive
                                ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                                : "bg-zinc-800/40 text-zinc-500 border-zinc-700 hover:text-white"
                            }`}
                            title={isChipActive ? "Active chip (click to disable)" : "Disabled chip (click to enable)"}
                          >
                            {isChipActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit chip */}
                          <button
                            type="button"
                            onClick={() => handleOpenStarterModal(starter)}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Edit Starter Chip"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete chip */}
                          <button
                            type="button"
                            onClick={() => handleDeleteStarter(starter.id)}
                            className="p-1.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Remove Starter Chip"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE CHATBOT SIMULATION PREVIEW (5 COLS) */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <div className="bg-[#0f1017] border border-purple-500/20 rounded-2xl shadow-xl overflow-hidden">
                {/* Simulated Chat Header */}
                <div className="p-3.5 bg-gradient-to-r from-purple-950/40 via-[#13141f] to-indigo-950/30 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0a12] animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-xs text-white">
                          {chatbotSettings.botName || "Creative Advisor"}
                        </h4>
                        {chatbotSettings.showAiBadge === true ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-purple-500/15 text-purple-400 border border-purple-500/20">
                            AI
                          </span>
                        ) : chatbotSettings.botBadgeText ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-sans bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            {chatbotSettings.botBadgeText}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-emerald-400 font-medium">
                        {chatbotSettings.botSubtitle || "Online • Replies in real-time"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-zinc-400">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <X className="w-4 h-4 ml-1" />
                  </div>
                </div>

                {/* Simulated Chat Message Body */}
                <div className="p-4 space-y-3.5 bg-[#0a0b12] text-xs max-h-[460px] overflow-y-auto scrollbar-thin">
                  {/* Bot Welcome Bubble */}
                  <div className="flex flex-col items-start space-y-2">
                    <div className="max-w-[92%] p-3 rounded-2xl rounded-bl-xs bg-[#13141f] border border-white/10 text-zinc-200 leading-relaxed text-xs">
                      {chatbotSettings.greetingMessage || DEFAULT_CHATBOT_SETTINGS.greetingMessage}
                    </div>

                    {/* Starter Chips Preview */}
                    {chatbotSettings.enableStarterChips !== false && (
                      <div className="w-full space-y-1.5 pt-1">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                          Starter Chips ({Math.min(
                            chatbotSettings.maxStarterChips ?? 4,
                            (chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || []).filter((s) => s.isActive !== false).length
                          )} shown):
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(chatbotSettings.starterQuestions || DEFAULT_CHATBOT_SETTINGS.starterQuestions || [])
                            .filter((s) => s.isActive !== false)
                            .slice(0, chatbotSettings.maxStarterChips ?? 4)
                            .map((s, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 text-[11px] font-medium text-zinc-300"
                              >
                                <span>{s.icon}</span>
                                <span className="truncate">{s.label}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Simulated User Question */}
                  <div className="flex justify-end pt-2">
                    <div className="max-w-[85%] p-2.5 rounded-2xl rounded-br-xs bg-purple-950/70 border border-purple-500/30 text-purple-100 text-xs leading-relaxed shadow-xs">
                      Can I see your portfolio and project rates?
                    </div>
                  </div>

                  {/* Simulated Assistant Answer with Dynamic CTA Buttons */}
                  <div className="flex flex-col items-start space-y-2 pt-1">
                    <div className="max-w-[92%] p-3 rounded-2xl rounded-bl-xs bg-[#13141f] border border-white/10 text-zinc-200 leading-relaxed text-xs">
                      You can explore Rashed&apos;s updated brand identity and packaging projects on Behance. To get an accurate quote, feel free to submit a quick project brief:
                    </div>

                    {/* Dynamic Action Buttons Under Bubble */}
                    <div className="flex flex-wrap gap-1.5 w-full pt-1">
                      {(chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS)
                        .filter((btn) => btn.isActive !== false)
                        .slice(0, 3)
                        .map((btn) => (
                          <button
                            key={btn.id}
                            type="button"
                            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full border font-semibold shadow-xs ${
                              btn.type === "behance"
                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/40"
                                : btn.type === "whatsapp"
                                  ? "bg-emerald-600 text-white border-emerald-500"
                                  : "bg-purple-950/50 text-purple-200 border-purple-500/40"
                            }`}
                          >
                            <span>{btn.pillIcon || "🔗"}</span>
                            <span>{btn.label}</span>
                            {btn.url && <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-80" />}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Simulated Floating Quick Action Pills Row */}
                <div className="p-3 bg-[#13141f] border-t border-white/10 space-y-2">
                  {chatbotSettings.enableQuickPills !== false && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {(chatbotSettings.actionButtons || DEFAULT_CHAT_ACTION_BUTTONS)
                        .filter((b) => b.isActive !== false && b.showAsQuickPill)
                        .slice(0, chatbotSettings.maxQuickPills ?? 5)
                        .map((pill) => (
                          <span
                            key={pill.id}
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                              pill.primary
                                ? "bg-purple-950/50 text-purple-300 border-purple-500/30"
                                : "bg-white/5 text-zinc-300 border-white/10"
                            }`}
                          >
                            <span>{pill.pillIcon || "🔗"}</span>
                            <span>{pill.label}</span>
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Simulated Input Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-zinc-500 text-xs flex items-center justify-between">
                      <span>Ask about design, pricing, or start a project...</span>
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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

      {/* =========================================================================
          MODAL 4: ADD / EDIT ACTION CTA BUTTON
          ========================================================================= */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#12131a] border border-zinc-800 w-full max-w-lg rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                {editingActionId ? "Edit Action CTA Button" : "Add New Action CTA Button"}
              </h3>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-zinc-300 font-medium">Button Label *</label>
                  <input
                    type="text"
                    required
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="e.g. View on Behance"
                    className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Icon / Emoji</label>
                  <input
                    type="text"
                    value={actionPillIcon}
                    onChange={(e) => setActionPillIcon(e.target.value)}
                    placeholder="🎨"
                    className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs text-center text-base"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Action Type *</label>
                <select
                  value={actionType}
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    setActionType(newType);
                    if (newType === "behance" && !actionUrl) {
                      setActionUrl("https://be.net/rashedpervej");
                    } else if (newType === "whatsapp" && !actionUrl) {
                      setActionUrl("https://wa.me/8801932623969");
                    } else if (newType === "email" && !actionUrl) {
                      setActionUrl("mailto:rashedpervej2011@gmail.com");
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 cursor-pointer text-xs"
                >
                  <option value="behance">Behance Portfolio (Opens Link)</option>
                  <option value="whatsapp">WhatsApp Direct Chat (Opens WhatsApp)</option>
                  <option value="email">Email Inquiry (mailto:)</option>
                  <option value="brief">Interactive Project Brief (In-Chat Form)</option>
                  <option value="link">Custom URL / External Link</option>
                </select>
              </div>

              {actionType !== "brief" && (
                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Target Link / URL *</label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder={
                      actionType === "whatsapp"
                        ? "https://wa.me/8801932623969"
                        : actionType === "email"
                          ? "mailto:rashedpervej2011@gmail.com"
                          : "https://be.net/rashedpervej"
                    }
                    className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 font-mono text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium flex items-center justify-between">
                  <span>Trigger Keywords (comma-separated) *</span>
                  <span className="text-[10px] text-zinc-500">Case-insensitive</span>
                </label>
                <textarea
                  rows={2}
                  value={actionKeywordsStr}
                  onChange={(e) => setActionKeywordsStr(e.target.value)}
                  placeholder="portfolio, behance, work, kaj, প্রজেক্ট, কাজ, লিংক"
                  className="w-full px-3.5 py-2 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 font-mono text-xs"
                />
                <p className="text-[10px] text-zinc-500">
                  When the assistant or visitor mentions any of these words, this button automatically renders under the message.
                </p>
              </div>

              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Floating Quick Action Pill</p>
                    <p className="text-[10px] text-zinc-400">Pin as persistent micro-pill above the chat input.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={actionShowQuickPill}
                    onChange={(e) => setActionShowQuickPill(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div>
                    <p className="text-xs font-semibold text-white">Primary Highlight Accent</p>
                    <p className="text-[10px] text-zinc-400">Gives this button a vibrant gradient highlight.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={actionPrimary}
                    onChange={(e) => setActionPrimary(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div>
                    <p className="text-xs font-semibold text-white">Active Status</p>
                    <p className="text-[10px] text-zinc-400">Enable or temporarily disable this action.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={actionIsActive}
                    onChange={(e) => setActionIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Action CTA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: EDIT STARTER QUESTION CHIP
          ========================================================================= */}
      {isStarterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#12131a] border border-zinc-800 w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Edit Starter Question Chip
              </h3>
              <button
                type="button"
                onClick={() => setIsStarterModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStarter} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-2.5">
                <div className="col-span-3 space-y-1">
                  <label className="text-zinc-300 font-medium">Chip Label *</label>
                  <input
                    type="text"
                    required
                    value={starterLabel}
                    onChange={(e) => setStarterLabel(e.target.value)}
                    placeholder="e.g. View Portfolio"
                    className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium text-center block">Icon</label>
                  <input
                    type="text"
                    value={starterIcon}
                    onChange={(e) => setStarterIcon(e.target.value)}
                    placeholder="🎨"
                    className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs text-center text-base"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Opens Project Brief Directly</p>
                    <p className="text-[10px] text-zinc-400">Triggers the inline 30-sec project brief questionnaire.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={starterIsBrief}
                    onChange={(e) => {
                      setStarterIsBrief(e.target.checked);
                      if (e.target.checked) setStarterIsFaqToggle(false);
                    }}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div>
                    <p className="text-xs font-semibold text-white">Opens FAQ Suggestions Drawer</p>
                    <p className="text-[10px] text-zinc-400">Toggles the suggestion accordion list.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={starterIsFaqToggle}
                    onChange={(e) => {
                      setStarterIsFaqToggle(e.target.checked);
                      if (e.target.checked) setStarterIsBrief(false);
                    }}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {!starterIsBrief && !starterIsFaqToggle && (
                <div className="space-y-1">
                  <label className="text-zinc-300 font-medium">Automatic Chat Query</label>
                  <input
                    type="text"
                    value={starterQuery}
                    onChange={(e) => setStarterQuery(e.target.value)}
                    placeholder="e.g. view portfolio or How much does a project typically cost?"
                    className="w-full px-3.5 py-2.5 bg-[#171822] border border-zinc-700/80 rounded-xl text-white outline-none focus:border-purple-500 text-xs"
                  />
                  <p className="text-[10px] text-zinc-500">
                    The prompt automatically sent to the assistant when this chip is clicked.
                  </p>
                </div>
              )}

              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white">Active Status</p>
                    <p className="text-[10px] text-zinc-400">Show or temporarily hide this chip in the chat.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={starterIsActive}
                    onChange={(e) => setStarterIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div>
                    <p className="text-xs font-semibold text-white">Display Order Index</p>
                    <p className="text-[10px] text-zinc-400">Lower numbers appear first (e.g. 1, 2, 3).</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={starterOrder}
                    onChange={(e) => setStarterOrder(Number(e.target.value))}
                    className="w-16 px-2.5 py-1 bg-[#171822] border border-zinc-700/80 rounded-lg text-white font-mono text-xs text-center outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsStarterModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Chip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
