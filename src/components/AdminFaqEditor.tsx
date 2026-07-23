import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { Plus, Edit, Trash, HelpCircle, Save, X, Search, CheckCircle, Eye, AlertCircle, Sparkles } from "lucide-react";

export interface FaqItem {
  id?: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
  status: "draft" | "published";
  created_at?: string;
}

interface AdminFaqEditorProps {
  isDemo?: boolean;
}

export default function AdminFaqEditor({ isDemo = false }: AdminFaqEditorProps) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Edit / Create Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywordsStr, setKeywordsStr] = useState("");
  const [category, setCategory] = useState("general");
  const [status, setStatus] = useState<"draft" | "published">("published");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteConfirmFaqId, setDeleteConfirmFaqId] = useState<string | null>(null);

  const fetchFaqs = async () => {
    setIsLoading(true);
    if (isDemo || !isSupabaseConfigured || !supabase) {
      // Demo Data
      setFaqs([
        {
          id: "demo-faq-1",
          question: "What is your main creative specialty?",
          answer: "I specialize as a Senior Visualizer in Brand Identity, Premium Packaging/Label Design, and Video Motion Graphics.",
          keywords: ["branding", "packaging", "visualizer", "skills"],
          category: "experience",
          status: "published"
        },
        {
          id: "demo-faq-2",
          question: "Do you offer remote collaboration for US or EU companies?",
          answer: "Yes, I have 3+ years of experience working with clients in Belgium, USA, Czech Republic, etc., delivering complete packaging sets remotely.",
          keywords: ["remote", "international", "usa", "belgium"],
          category: "general",
          status: "draft"
        },
        {
          id: "demo-faq-3",
          question: "Which software design tools are you fluent in?",
          answer: "I am highly fluent in Adobe Illustrator, Photoshop, After Effects, CapCut, Canva, and AI-powered workflows.",
          keywords: ["tools", "software", "illustrator", "photoshop"],
          category: "skills",
          status: "published"
        }
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("faq_knowledge_base")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && !error) {
        setFaqs(data as FaqItem[]);
      }
    } catch (err) {
      console.error("Error fetching FAQ items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [isDemo]);

  const handleOpenForm = (faq: FaqItem | null = null) => {
    setEditingFaq(faq);
    if (faq) {
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setKeywordsStr(faq.keywords.join(", "));
      setCategory(faq.category);
      setStatus(faq.status);
    } else {
      setQuestion("");
      setAnswer("");
      setKeywordsStr("");
      setCategory("general");
      setStatus("published");
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingFaq(null);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlertMsg(null);

    const cleanKeywords = keywordsStr
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k !== "");

    const faqPayload: any = {
      question,
      answer,
      keywords: cleanKeywords,
      category,
      status,
    };

    if (isDemo || !isSupabaseConfigured || !supabase) {
      // Demo operations
      setTimeout(() => {
        if (editingFaq) {
          setFaqs((prev) =>
            prev.map((f) => (f.id === editingFaq.id ? { ...f, ...faqPayload } : f))
          );
          setAlertMsg({ type: "success", text: "FAQ updated in temporary sandbox state." });
        } else {
          const newFaq = { ...faqPayload, id: `demo-faq-${Date.now()}` };
          setFaqs((prev) => [newFaq, ...prev]);
          setAlertMsg({ type: "success", text: "FAQ added to temporary sandbox state." });
        }
        setIsSubmitting(false);
        setIsFormOpen(false);
        setTimeout(() => setAlertMsg(null), 3000);
      }, 500);
      return;
    }

    try {
      if (editingFaq) {
        const { error } = await supabase
          .from("faq_knowledge_base")
          .update(faqPayload)
          .eq("id", editingFaq.id);
        if (error) throw error;
        setAlertMsg({ type: "success", text: "FAQ updated successfully!" });
      } else {
        const { error } = await supabase
          .from("faq_knowledge_base")
          .insert(faqPayload);
        if (error) throw error;
        setAlertMsg({ type: "success", text: "New FAQ added to Knowledge Base!" });
      }
      await fetchFaqs();
      setIsFormOpen(false);
      setTimeout(() => setAlertMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setAlertMsg({ type: "error", text: err.message || "Failed to save FAQ record." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    setIsSubmitting(true);
    setAlertMsg(null);

    if (isDemo || !isSupabaseConfigured || !supabase) {
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      setAlertMsg({ type: "success", text: "FAQ deleted from temporary sandbox." });
      setIsSubmitting(false);
      setTimeout(() => setAlertMsg(null), 3000);
      return;
    }

    try {
      const { error } = await supabase
        .from("faq_knowledge_base")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setAlertMsg({ type: "success", text: "FAQ removed successfully." });
      await fetchFaqs();
      setTimeout(() => setAlertMsg(null), 3000);
    } catch (err: any) {
      setAlertMsg({ type: "error", text: `Delete failed: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter & search logic
  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="faq-knowledge-panel">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            FAQ & AI Knowledge Base
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Build pre-defined Q&A prompts that bypass expensive AI models and intercept chatbot workflows instantly.
          </p>
        </div>
        <button
          onClick={() => handleOpenForm(null)}
          className="self-start px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-purple-500/10"
          id="add-faq-btn"
        >
          <Plus className="w-4 h-4" />
          Add Q&A Entry
        </button>
      </div>

      {alertMsg && (
        <div
          className={`p-4 border rounded-xl flex items-start gap-3 text-xs leading-relaxed ${
            alertMsg.type === "success"
              ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-300"
              : "bg-red-950/30 border-red-500/20 text-red-300"
          }`}
        >
          {alertMsg.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-300 text-xs outline-none transition-all"
            placeholder="Search questions, keywords, or answers..."
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 text-zinc-300 text-xs rounded-xl outline-none"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="experience">Experience</option>
            <option value="services">Services</option>
            <option value="skills">Skills</option>
            <option value="projects">Projects</option>
            <option value="pricing">Rates & Pricing</option>
          </select>
        </div>
      </div>

      {/* Grid of items */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-12 text-center">
          <HelpCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium text-sm">No Knowledge entries found</p>
          <p className="text-xs text-zinc-500 mt-1">Try widening your search tags or create a new prompt entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4" id="faq-list">
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-[#121214] border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-6 transition-all duration-200 group relative"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-purple-950/50 border border-purple-500/20 text-purple-400 text-[10px] font-mono uppercase tracking-wider rounded-full">
                      {faq.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-full border ${
                        faq.status === "published"
                          ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400"
                          : "bg-zinc-800/60 border-zinc-700 text-zinc-400"
                      }`}
                    >
                      {faq.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white font-sans leading-snug">
                    {faq.question}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl whitespace-pre-line">
                    {faq.answer}
                  </p>

                  {faq.keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-3">
                      <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                      {faq.keywords.map((kw, i) => (
                        <span key={i} className="text-[10px] text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                  <button
                    onClick={() => handleOpenForm(faq)}
                    className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                    title="Edit entry"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => faq.id && setDeleteConfirmFaqId(faq.id)}
                    className="p-1.5 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                    title="Delete entry"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal / Slide-over */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-purple-400" />
                {editingFaq ? "Edit Knowledge Entry" : "Create Q&A Entry"}
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Visitor Question (Trigger Prompt)
                </label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-sm outline-none transition-all"
                  placeholder="e.g. Do you design logos?"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Answer (Predefined Response)
                </label>
                <textarea
                  required
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-sm outline-none resize-none transition-all"
                  placeholder="Yes, I design logos and create complete brand books..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                    Category Grouping
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 text-zinc-300 text-xs rounded-xl outline-none"
                  >
                    <option value="general">General</option>
                    <option value="experience">Experience</option>
                    <option value="services">Services</option>
                    <option value="skills">Skills</option>
                    <option value="projects">Projects</option>
                    <option value="pricing">Rates & Pricing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                    Publishing Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 text-zinc-300 text-xs rounded-xl outline-none"
                  >
                    <option value="published">Published (Live to Chatbot)</option>
                    <option value="draft">Draft (CMS Hidden)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Keywords / Intercept Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={keywordsStr}
                  onChange={(e) => setKeywordsStr(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-sm outline-none transition-all"
                  placeholder="logo, branding, visual identity, guides"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Matches client queries to skip API call models instantly.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700/80 text-xs font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-purple-500/10"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Entry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog for Q&A Deletions */}
      {deleteConfirmFaqId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl overflow-hidden animate-fade-in space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <Trash className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Confirm Delete</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete this FAQ entry from the AI Knowledge Base? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 border-t border-zinc-800/80 pt-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmFaqId(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmFaqId;
                  setDeleteConfirmFaqId(null);
                  await handleDeleteFaq(id);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
