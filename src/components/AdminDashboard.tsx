import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePortfolio } from "../context/PortfolioContext";
import AdminSectionEditor from "./AdminSectionEditor";
import AdminFaqEditor from "./AdminFaqEditor";
import AdminSettingsEditor from "./AdminSettingsEditor";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  LayoutDashboard,
  Layers,
  HelpCircle,
  Settings,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Terminal,
  Activity,
  Users,
  MessageSquare,
  Download,
  Calendar,
  Monitor,
  Menu,
  X,
  Sparkles,
  Database,
  Inbox,
  FileSpreadsheet,
  Search,
  Filter,
  Trash2,
  Archive,
  CheckSquare,
  Reply,
  Check,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { AdminUser } from "./Admin";

interface AdminDashboardProps {
  user: AdminUser;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const { sections, isPreviewMode, setIsPreviewMode, refreshData } = usePortfolio();
  
  // Navigation states
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  
  // Leads Management states
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [stats, setStats] = useState({
    pageViews: 0,
    botInteractions: 0,
    downloads: 0,
    leads: 0,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchAnalyticsAndChats = async (showLoading = true) => {
    if (showLoading) setIsLoadingChats(true);
    if (!isSupabaseConfigured || !supabase) {
      // Populating simulated live sandbox analytics
      const demoEvents = [
        { event_type: "page_view", created_at: new Date(Date.now() - 3600000 * 2).toISOString(), event_details: { path: "/", screenSize: "1920x1080" } },
        { event_type: "faq_ask", created_at: new Date(Date.now() - 3600000 * 4).toISOString(), event_details: { question: "What is your experience?" } },
        { event_type: "cv_download", created_at: new Date(Date.now() - 3600000 * 6).toISOString(), event_details: { source: "header" } },
        { event_type: "page_view", created_at: new Date(Date.now() - 3600000 * 12).toISOString(), event_details: { path: "/" } },
        { event_type: "lead_submit", created_at: new Date(Date.now() - 3600000 * 24).toISOString(), event_details: { email: "partner@designstudio.be" } },
        { event_type: "page_view", created_at: new Date(Date.now() - 3600000 * 28).toISOString(), event_details: { path: "/" } },
        { event_type: "faq_ask", created_at: new Date(Date.now() - 3600000 * 32).toISOString(), event_details: { question: "What software do you use?" } },
      ];
      setAnalytics(demoEvents);

      const demoChats = [
        {
          id: "chat-1",
          question: "What is your experience?",
          answer: "Rashed has over 6+ years of rich professional design experience as a Senior Visualizer.",
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          session_id: "sess_1",
          visitor_id: "vis_1",
          response_source: "Knowledge Base",
          response_time_ms: 120,
          token_usage: null,
          conversation_id: "conv_1"
        },
        {
          id: "chat-2",
          question: "Where are you based?",
          answer: "Rashed is based in Jashore, Bangladesh.",
          timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
          session_id: "sess_1",
          visitor_id: "vis_1",
          response_source: "FAQ",
          response_time_ms: 80,
          token_usage: null,
          conversation_id: "conv_1"
        },
        {
          id: "chat-3",
          question: "Can you design a premium medicine bottle packaging box with 3D model renderings?",
          answer: "Yes, Rashed specializes in premium Product Packaging and 3D dieline renders, especially for healthcare, wellness, and supplements.",
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          session_id: "sess_2",
          visitor_id: "vis_2",
          response_source: "Gemini",
          response_time_ms: 1450,
          token_usage: 184,
          conversation_id: "conv_2"
        },
        {
          id: "chat-4",
          question: "What software do you use?",
          answer: "He primarily specializes in Photoshop, Illustrator, and After Effects.",
          timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
          session_id: "sess_2",
          visitor_id: "vis_2",
          response_source: "Knowledge Base",
          response_time_ms: 95,
          token_usage: null,
          conversation_id: "conv_2"
        },
        {
          id: "chat-5",
          question: "How do I hire you?",
          answer: "You can reach Rashed via email at rashedpervej2011@gmail.com or WhatsApp +8801932623969.",
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          session_id: "sess_3",
          visitor_id: "vis_3",
          response_source: "FAQ",
          response_time_ms: 70,
          token_usage: null,
          conversation_id: "conv_3"
        },
        {
          id: "chat-6",
          question: "Do you have experience with Figma or Webflow?",
          answer: "My communication link had a temporary hiccup. Please reach out to Rashed directly.",
          timestamp: new Date(Date.now() - 3600000 * 30).toISOString(),
          session_id: "sess_4",
          visitor_id: "vis_4",
          response_source: "Gemini",
          response_time_ms: 2500,
          token_usage: null,
          conversation_id: "conv_4"
        },
        {
          id: "chat-7",
          question: "What brands did you design packaging for?",
          answer: "He led visual identity and print packaging structure designs for Go Nature BD and Chaldal.",
          timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
          session_id: "sess_5",
          visitor_id: "vis_5",
          response_source: "Gemini",
          response_time_ms: 1820,
          token_usage: 242,
          conversation_id: "conv_5"
        }
      ];
      setChatLogs(demoChats);

      setStats({
        pageViews: 142,
        botInteractions: demoChats.length,
        downloads: 18,
        leads: 5,
      });
      setIsLoadingChats(false);
      return;
    }

    try {
      // Fetch standard analytics events (e.g. page_view, cv_download)
      const { data: eventsData, error: eventsError } = await supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (eventsData && !eventsError) {
        setAnalytics(eventsData);
      }

      // Fetch chatbot interactions from direct table OR fallback to analytics_events
      let fetchedChats: any[] = [];
      try {
        const { data: chatsData, error: chatsError } = await supabase
          .from("chatbot_interactions")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(500);

        if (chatsData && !chatsError) {
          fetchedChats = chatsData;
        } else {
          throw new Error(chatsError?.message || "Table not found");
        }
      } catch (dbErr) {
        console.warn("Direct chatbot_interactions table fetch failed, fetching from analytics_events fallback...");
        // Fallback: Query analytics_events for chatbot_interaction
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("analytics_events")
          .select("*")
          .eq("event_type", "chatbot_interaction")
          .order("created_at", { ascending: false })
          .limit(500);

        if (fallbackData && !fallbackError) {
          fetchedChats = fallbackData.map((item: any) => {
            const details = typeof item.event_details === "string"
              ? JSON.parse(item.event_details)
              : item.event_details || {};
            return {
              id: item.id,
              question: details.question || "",
              answer: details.answer || "",
              timestamp: details.timestamp || item.created_at,
              session_id: details.session_id || "",
              visitor_id: details.visitor_id || "",
              response_source: details.response_source || "Gemini",
              response_time_ms: details.response_time_ms || 0,
              token_usage: details.token_usage || null,
              conversation_id: details.conversation_id || "",
            };
          });
        }
      }

      setChatLogs(fetchedChats);

      // Calculate counts based on combined queries
      const totalViews = eventsData ? eventsData.filter((e) => e.event_type === "page_view").length : 0;
      const totalDownloads = eventsData ? eventsData.filter((e) => e.event_type === "cv_download").length : 0;
      const totalLeads = eventsData ? eventsData.filter((e) => e.event_type === "contact_click" || e.event_type === "lead_submit").length : 0;

      setStats({
        pageViews: totalViews || 12,
        botInteractions: fetchedChats.length,
        downloads: totalDownloads || 3,
        leads: totalLeads || 2,
      });

    } catch (err) {
      console.error("Error loading analytics & chats:", err);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Initial load and periodic polling for real-time dashboard updates without manual reload
  useEffect(() => {
    // Initial fetch
    fetchAnalyticsAndChats(true);
    fetchLeads(true);

    // Background silent update every 10 seconds
    const intervalId = setInterval(() => {
      fetchAnalyticsAndChats(false);
      fetchLeads(false);
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchLeads = async (showLoading = true) => {
    if (showLoading) setIsLoadingLeads(true);

    try {
      const response = await fetch("/api/leads");
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();
      if (data.success) {
        setLeads(data.leads || []);
        setStats((prev) => ({ ...prev, leads: (data.leads || []).length }));
      }
    } catch (err) {
      console.error("Error loading leads:", err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const updateLeadStatus = async (lead: any, newStatus: string) => {
    setIsActionLoading(true);
    setNotification(null);

    try {
      const response = await fetch("/api/leads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, status: newStatus, isFallback: lead.isFallback })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to update status");

      setNotification({ type: "success", text: `Status marked as ${newStatus}` });
      setTimeout(() => setNotification(null), 3000);
      
      // Update local state immediately for instant feedback
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l))
      );
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead((prev: any) => prev ? { ...prev, status: newStatus } : null);
      }
      fetchLeads(false);
    } catch (err: any) {
      console.error("Failed to update status:", err);
      setNotification({ type: "error", text: `Failed to update status: ${err.message}` });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setIsActionLoading(false);
    }
  };

  const updateLeadNotes = async (lead: any, newNotes: string) => {
    setIsActionLoading(true);
    setNotification(null);

    try {
      const response = await fetch("/api/leads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, notes: newNotes, isFallback: lead.isFallback })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to update notes");

      setNotification({ type: "success", text: "Notes saved successfully" });
      setTimeout(() => setNotification(null), 3000);
      
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, notes: newNotes } : l))
      );
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead((prev: any) => prev ? { ...prev, notes: newNotes } : null);
      }
      fetchLeads(false);
    } catch (err: any) {
      console.error("Failed to update notes:", err);
      setNotification({ type: "error", text: `Failed to save notes: ${err.message}` });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setIsActionLoading(false);
    }
  };

  const deleteLead = async (lead: any) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the lead from "${lead.name}"?`)) {
      return;
    }
    setIsActionLoading(true);
    setNotification(null);

    try {
      const response = await fetch("/api/leads/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, isFallback: lead.isFallback })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to delete lead");

      setNotification({ type: "success", text: "Lead permanently deleted" });
      setTimeout(() => setNotification(null), 3000);

      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead(null);
      }
      fetchLeads(false);
    } catch (err: any) {
      console.error("Failed to delete lead:", err);
      setNotification({ type: "error", text: `Failed to delete lead: ${err.message}` });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setIsActionLoading(false);
    }
  };

  const exportLeadsCSV = () => {
    if (leads.length === 0) {
      alert("No leads to export.");
      return;
    }
    
    const headers = ["Name", "Email", "Phone", "Company", "Subject", "Message", "Submission Time", "Status", "Notes", "Visitor IP"];
    const rows = leads.map(l => [
      l.name,
      l.email,
      l.phone || "",
      l.company || "",
      l.subject,
      l.message,
      l.created_at,
      l.status,
      l.notes || "",
      l.visitor_ip || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `portfolio_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setNotification({ type: "success", text: "Leads successfully exported to CSV!" });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle reordering sections in Database
  const handleMoveSection = async (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const reorderedSections = [...sections];
    const temp = reorderedSections[index];
    reorderedSections[index] = reorderedSections[targetIdx];
    reorderedSections[targetIdx] = temp;

    setIsActionLoading(true);
    setNotification(null);

    if (!isSupabaseConfigured || !supabase) {
      // Just refresh context if not configured
      setTimeout(() => {
        setIsActionLoading(false);
        setNotification({ type: "success", text: "Sections reordered locally (Sandbox Mode)!" });
        setTimeout(() => setNotification(null), 3000);
      }, 300);
      return;
    }

    try {
      // Perform batch update of order_index
      for (let i = 0; i < reorderedSections.length; i++) {
        const { error } = await supabase
          .from("sections")
          .update({ order_index: i })
          .eq("id", reorderedSections[i].id);
        if (error) throw error;
      }
      await refreshData();
      setNotification({ type: "success", text: "Section layout sequence updated and published!" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Failed to reorder database sections", err);
      setNotification({ type: "error", text: `Failed to update sequence: ${err.message}` });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Toggle visibility in Database & Local State
  const handleToggleVisibility = async (secId: string, currentVal: boolean) => {
    setIsActionLoading(true);
    setNotification(null);

    const nextVal = !currentVal;

    // Immediately update local React context state & localStorage cache
    setSections((prev) =>
      prev.map((s) => (s.id === secId || s.key === secId ? { ...s, is_visible: nextVal } : s))
    );

    if (!isSupabaseConfigured || !supabase) {
      setTimeout(() => {
        setIsActionLoading(false);
        setNotification({ type: "success", text: "Section visibility toggled locally!" });
        setTimeout(() => setNotification(null), 3000);
      }, 300);
      return;
    }

    try {
      const targetSec = sections.find((s) => s.id === secId || s.key === secId);
      if (!targetSec) {
        throw new Error("Section record not found");
      }

      const { data: existingRow } = await supabase
        .from("sections")
        .select("id")
        .eq("key", targetSec.key)
        .maybeSingle();

      if (existingRow) {
        const { error } = await supabase
          .from("sections")
          .update({ is_visible: nextVal, updated_at: new Date().toISOString() })
          .eq("key", targetSec.key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sections")
          .upsert(
            {
              key: targetSec.key,
              name: targetSec.name,
              type: targetSec.type,
              published_content: targetSec.published_content ?? null,
              draft_content: targetSec.draft_content ?? null,
              is_visible: nextVal,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "key" }
          );
        if (error) throw error;
      }
      await refreshData();
      setNotification({ type: "success", text: `Section visibility updated successfully!` });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Failed to toggle section visibility", err);
      setNotification({ type: "error", text: `Failed to toggle visibility: ${err.message}` });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Recharts chart mock metrics
  const chartData = [
    { day: "Mon", Visitors: stats.pageViews * 0.15 + 4, Queries: stats.botInteractions * 0.1 },
    { day: "Tue", Visitors: stats.pageViews * 0.2 + 8, Queries: stats.botInteractions * 0.15 },
    { day: "Wed", Visitors: stats.pageViews * 0.18 + 5, Queries: stats.botInteractions * 0.12 },
    { day: "Thu", Visitors: stats.pageViews * 0.25 + 11, Queries: stats.botInteractions * 0.22 },
    { day: "Fri", Visitors: stats.pageViews * 0.3 + 15, Queries: stats.botInteractions * 0.3 },
    { day: "Sat", Visitors: stats.pageViews * 0.22 + 9, Queries: stats.botInteractions * 0.18 },
    { day: "Sun", Visitors: stats.pageViews * 0.1 + 3, Queries: stats.botInteractions * 0.08 },
  ];

  return (
    <div className="h-screen w-full bg-[#070708] text-zinc-100 flex overflow-hidden relative font-sans">
      
      {/* Mobile backdrop overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 h-full bg-[#0c0c0e] border-r border-zinc-800/80 p-5 transform transition-transform duration-300 flex flex-col justify-between overflow-y-auto overscroll-contain custom-scrollbar ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:shrink-0 lg:h-full`}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Logo / Branding */}
          <div className="flex justify-between items-center pb-3 shrink-0">
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-pulse" />
                CMS Controller
              </h1>
              <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
                Role: {user.role}
              </p>
            </div>
            <button className="lg:hidden text-zinc-400 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Preview Sandbox Switch */}
          <div className="bg-[#121214] border border-zinc-800 p-3.5 rounded-xl space-y-2 shrink-0 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Preview Sandbox</span>
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors outline-none ${
                  isPreviewMode ? "bg-purple-600 justify-end" : "bg-zinc-800 justify-start"
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 leading-snug">
              When active, your landing page displays saved drafts instead of published content.
            </p>
          </div>

          {/* Central Menu - Independently Scrollable */}
          <nav className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar space-y-1 my-1 pr-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "overview"
                  ? "bg-[#16161a] text-purple-400 border-l-2 border-purple-500 pl-3"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                Control Overview
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab("leads")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "leads"
                  ? "bg-[#16161a] text-purple-400 border-l-2 border-purple-500 pl-3"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4" />
                Leads
              </span>
              <div className="flex items-center gap-1.5">
                {leads.filter((l) => l.status === "new").length > 0 && (
                  <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {leads.filter((l) => l.status === "new").length}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </div>
            </button>

            <button
              onClick={() => setActiveTab("sections_order")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "sections_order"
                  ? "bg-[#16161a] text-purple-400 border-l-2 border-purple-500 pl-3"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                Sections Manager
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            {/* Static Section Links */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-3.5">Edit Page Sections</span>
            </div>

            {["hero", "about", "experience", "projects", "skills", "services", "brands", "testimonials", "contact"].map((sec) => (
              <button
                key={sec}
                onClick={() => setActiveTab(sec)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all capitalize ${
                  activeTab === sec
                    ? "bg-[#16161a] text-purple-400 border-l-2 border-purple-500 pl-3"
                    : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
                  {sec}
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            ))}

            <div className="pt-3 pb-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-3.5">Setup & AI</span>
            </div>

            <button
              onClick={() => setActiveTab("faqs")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "faqs"
                  ? "bg-[#16161a] text-purple-400 border-l-2 border-purple-500 pl-3"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4" />
                AI Knowledge Base
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab("ai_analytics")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "ai_analytics"
                  ? "bg-[#16161a] text-purple-400 border-l-2 border-purple-500 pl-3"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity className="w-4 h-4" />
                AI Analytics
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-[#16161a] text-purple-400 border-l-2 border-purple-500 pl-3"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                Settings & Backup
              </span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </button>
          </nav>

          {/* User Info & Signout - Pinned to bottom */}
          <div className="pt-4 mt-auto border-t border-zinc-800/60 shrink-0">
            <div className="flex items-center gap-3 mb-3 px-2 truncate">
              <div className="w-8 h-8 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center text-xs font-semibold text-purple-300">
                RP
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user.email}</p>
                <p className="text-[10px] text-zinc-500 truncate">live db session</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full py-2.5 px-3 bg-[#18181b] hover:bg-red-950/20 text-zinc-400 hover:text-red-400 text-xs font-medium rounded-xl border border-zinc-800 hover:border-red-900/30 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Close Session
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Upper Top Navbar */}
        <header className="px-6 py-4 bg-[#0c0c0e] border-b border-zinc-800/80 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-zinc-400 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              ROOT ~/ RASHED-PORTFOLIO-CMS
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  window.history.pushState({}, "", "/");
                  window.dispatchEvent(new Event("popstate"));
                }
              }}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-[#121214] hover:bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 rounded-lg transition-all"
              id="return-to-site-btn"
            >
              <Monitor className="w-3.5 h-3.5 text-purple-400" />
              <span>Return to Site</span>
            </a>
          </div>
        </header>

        {/* Dynamic sub-view controller router */}
        <main className="p-6 md:p-8 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
          {activeTab === "overview" && renderOverviewDashboard()}
          {activeTab === "sections_order" && renderSectionsOrderManager()}
          {activeTab === "faqs" && <AdminFaqEditor isDemo={false} />}
          {activeTab === "settings" && <AdminSettingsEditor isDemo={false} />}
          {activeTab === "ai_analytics" && renderAIAnalyticsDashboard()}
          {activeTab === "leads" && renderLeadsManager()}
          {!["overview", "sections_order", "faqs", "settings", "ai_analytics", "leads"].includes(activeTab) && (
            <AdminSectionEditor sectionKey={activeTab} isDemo={false} />
          )}
        </main>
      </div>
    </div>
  );

  // ----------------------------------------------------
  // SUB-VIEW RENDERING
  // ----------------------------------------------------

  function renderOverviewDashboard() {
    return (
      <div className="space-y-8 animate-fade-in" id="overview-panel">
        {/* Banner */}
        <div className="bg-gradient-to-r from-purple-950/30 to-blue-950/10 border border-purple-500/10 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
          <h2 className="text-xl font-bold text-white font-sans tracking-tight">
            Greetings, Rashed
          </h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Welcome to your CMS administration engine. Monitor incoming visitor analytics, handle instant smart responses, and coordinate dynamic sections easily.
          </p>
        </div>

        {/* Analytics cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Views</span>
              <Activity className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.pageViews}</p>
            <p className="text-[10px] text-zinc-500 font-mono">Past 7 days traffic metrics</p>
          </div>

          <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs font-semibold uppercase tracking-wider">AI Queries</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.botInteractions}</p>
            <p className="text-[10px] text-zinc-500 font-mono">Chatbot conversations log</p>
          </div>

          <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs font-semibold uppercase tracking-wider">CV Downloads</span>
              <Download className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.downloads}</p>
            <p className="text-[10px] text-zinc-500 font-mono">Resume PDF fetch triggers</p>
          </div>

          <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Leads Formed</span>
              <MessageSquare className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.leads}</p>
            <p className="text-[10px] text-zinc-500 font-mono">Contacts initiated by clients</p>
          </div>
        </div>

        {/* Charts and logs split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Traffic chart */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-zinc-300">Activity Trends</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Interaction frequency comparison</p>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-2 h-2 bg-purple-500 rounded-full" /> Visitors
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" /> AI Queries
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1d1d21" />
                  <XAxis dataKey="day" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#121214", border: "1px solid #27272a" }} />
                  <Area type="monotone" dataKey="Visitors" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" />
                  <Area type="monotone" dataKey="Queries" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorQueries)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent event log stream */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Live Interaction Feed</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Real-time visitor logs from server</p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto overscroll-contain custom-scrollbar pr-1">
              {analytics.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-8">No interaction records registered yet.</p>
              ) : (
                analytics.map((ev, i) => (
                  <div key={i} className="p-3 bg-[#18181b] border border-zinc-800/60 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-purple-400 font-semibold uppercase">
                        {ev.event_type.replace("_", " ")}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 truncate">
                      {ev.event_details?.question || ev.event_details?.path || ev.event_details?.email || "Interaction registered"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSectionsOrderManager() {
    return (
      <div className="space-y-6 animate-fade-in" id="sections-order-panel">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            Sections Manager
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Drag, drop, or sort sections to rearrange layout flow. Toggle visibility to dynamically hide components from the landing page.
          </p>
        </div>

        {notification && (
          <div
            className={`p-4 border rounded-xl flex items-center gap-3 text-xs ${
              notification.type === "success"
                ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-300"
                : "bg-red-950/30 border-red-500/20 text-red-300"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${notification.type === "success" ? "bg-emerald-400" : "bg-red-400"}`} />
            <span>{notification.text}</span>
          </div>
        )}

        {isActionLoading && (
          <div className="p-3 bg-purple-950/20 border border-purple-500/20 text-purple-300 text-xs rounded-xl flex items-center gap-2 animate-pulse">
            <div className="w-3.5 h-3.5 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            <span>Processing changes on server...</span>
          </div>
        )}

        <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-6 space-y-4" id="section-order-list">
          {sections.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : (
            sections
              .filter((s) => !["personal_info", "site_settings", "seo", "footer", "navigation"].includes(s.key))
              .map((sec, idx, arr) => (
                <div
                  key={sec.id}
                  className="bg-[#18181b] border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-4 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-zinc-500 font-mono">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white capitalize">{sec.name || sec.key}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">Key: {sec.key}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Toggle Visibility */}
                    <button
                      onClick={() => handleToggleVisibility(sec.id, sec.is_visible)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase border transition-all ${
                        sec.is_visible
                          ? "bg-purple-950/40 border-purple-500/20 text-purple-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500"
                      }`}
                    >
                      {sec.is_visible ? "Active" : "Hidden"}
                    </button>

                    {/* Move Controls */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveSection(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition-colors"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveSection(idx, "down")}
                        disabled={idx === arr.length - 1}
                        className="p-1.5 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition-colors"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    );
  }

  function renderAIAnalyticsDashboard() {
    // 1. Calculate Analytics on the fly from chatLogs
    const uniqueConversations = new Set(chatLogs.map(log => log.conversation_id || log.session_id).filter(Boolean));
    const totalConversations = uniqueConversations.size;

    const questionCounts: Record<string, number> = {};
    chatLogs.forEach(log => {
      const q = (log.question || "").trim();
      if (q) {
        questionCounts[q] = (questionCounts[q] || 0) + 1;
      }
    });
    const sortedQuestions = Object.entries(questionCounts)
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const faqCounts: Record<string, { question: string; answer: string; count: number }> = {};
    chatLogs.forEach(log => {
      if (log.response_source === "FAQ" || log.response_source === "Knowledge Base") {
        const q = (log.question || "").trim();
        if (q) {
          if (!faqCounts[q]) {
            faqCounts[q] = { question: q, answer: log.answer, count: 0 };
          }
          faqCounts[q].count += 1;
        }
      }
    });
    const sortedFAQs = Object.values(faqCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const stopWords = new Set(["what", "is", "your", "the", "and", "how", "you", "are", "about", "for", "with", "where", "he", "his", "to", "do", "of", "in", "can", "tell", "me", "has", "who", "any", "does", "on", "i", "a", "an", "at", "my", "this", "it", "that", "there", "be", "was", "were", "been"]);
    const keywordCounts: Record<string, number> = {};
    chatLogs.forEach(log => {
      const words = (log.question || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/);
      words.forEach(w => {
        if (w && w.length > 2 && !stopWords.has(w)) {
          keywordCounts[w] = (keywordCounts[w] || 0) + 1;
        }
      });
    });
    const sortedKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const loggedResponseTimes = chatLogs.map(log => log.response_time_ms).filter(t => typeof t === "number" && t > 0);
    const avgResponseTime = loggedResponseTimes.length > 0
      ? Math.round(loggedResponseTimes.reduce((a, b) => a + b, 0) / loggedResponseTimes.length)
      : 0;

    let geminiCount = 0;
    let faqCount = 0;
    chatLogs.forEach(log => {
      if (log.response_source === "Gemini") {
        geminiCount++;
      } else {
        faqCount++;
      }
    });

    const totalLogged = chatLogs.length || 1;
    const geminiPercent = Math.round((geminiCount / totalLogged) * 100);
    const faqPercent = Math.round((faqCount / totalLogged) * 100);

    const failedResponsesCount = chatLogs.filter(log =>
      (log.answer && log.answer.includes("[ERROR]")) ||
      (log.answer && log.answer.includes("communication link had a temporary hiccup")) ||
      (log.answer && log.answer.includes("Failed to send message"))
    ).length;

    // Daily/Weekly trends for Recharts
    const trendDataMap: Record<string, { date: string; Total: number; Gemini: number; FAQ: number }> = {};
    
    // Pre-populate last 7 days with 0 counts to guarantee chart data rendering
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
      trendDataMap[dateStr] = { date: dateStr, Total: 0, Gemini: 0, FAQ: 0 };
    }

    const sortedLogs = [...chatLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    sortedLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
      if (!trendDataMap[dateStr]) {
        trendDataMap[dateStr] = { date: dateStr, Total: 0, Gemini: 0, FAQ: 0 };
      }
      trendDataMap[dateStr].Total += 1;
      if (log.response_source === "Gemini") {
        trendDataMap[dateStr].Gemini += 1;
      } else {
        trendDataMap[dateStr].FAQ += 1;
      }
    });
    const trendData = Object.values(trendDataMap);

    return (
      <div className="space-y-8 animate-fade-in" id="ai-analytics-panel">
        {/* Banner */}
        <div className="bg-gradient-to-r from-purple-950/40 via-[#0e0e12] to-blue-950/20 border border-purple-500/15 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
          <h2 className="text-xl font-bold text-white font-sans tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-5.5 h-5.5 text-purple-400" />
            AI Chatbot Conversation Intelligence
          </h2>
          <p className="text-zinc-400 text-sm mt-1 max-w-3xl leading-relaxed">
            Real-time conversation logs stored in Supabase. Analyze user questions, measure answer latencies, and optimize the AI FAQ knowledge base dynamically based on search keywords.
          </p>
        </div>



        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-2xl space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Total Interactions</span>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-white">{chatLogs.length}</p>
              <MessageSquare className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-[10px] text-zinc-500">Every single prompt & response</p>
          </div>

          <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-2xl space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Total Sessions</span>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-white">{totalConversations}</p>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-[10px] text-zinc-500">Unique user session identifiers</p>
          </div>

          <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-2xl space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Avg Response Time</span>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-white">{avgResponseTime} <span className="text-xs text-zinc-500">ms</span></p>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[10px] text-zinc-500">Includes live Gemini & DB local paths</p>
          </div>

          <div className="bg-[#121214] border border-zinc-800/80 p-5 rounded-2xl space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Failed Responses</span>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-white">{failedResponsesCount}</p>
              <Terminal className="w-4 h-4 text-red-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-zinc-500">Connection hiccups or error states</p>
          </div>
        </div>

        {/* Charts & Split Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Daily Trend Chart */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-zinc-300">Conversation Trends</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Frequency of messages by model source</p>
              </div>
              <div className="flex gap-4 text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-2 h-2 bg-purple-500 rounded-full" /> Gemini AI ({geminiCount})
                </span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" /> FAQ / KB ({faqCount})
                </span>
              </div>
            </div>

            <div className="h-60 w-full">
              {trendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                  Insufficient timeline logs to compile trends.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGemini" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorFaq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1d1d21" />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#121214", border: "1px solid #27272a", borderRadius: "12px", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="Gemini" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorGemini)" />
                    <Area type="monotone" dataKey="FAQ" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorFaq)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Source distribution */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Response Source Mix</h3>
              <p className="text-xs text-zinc-500 mt-0.5">FAQ database vs generative Gemini answers</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Gemini AI Model</span>
                  <span className="font-mono text-purple-400 font-semibold">{geminiPercent}%</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div className="bg-purple-600 h-full transition-all duration-500" style={{ width: `${geminiPercent}%` }} />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono block">{geminiCount} prompts resolved by Gemini</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Knowledge Base / FAQ</span>
                  <span className="font-mono text-blue-400 font-semibold">{faqPercent}%</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${faqPercent}%` }} />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono block">{faqCount} prompts matched FAQ database</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Intelligence & Keywords */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Most asked questions */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Most Asked Questions</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Top inquiries registered from chat prompts</p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
              {sortedQuestions.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">No queries logged yet.</p>
              ) : (
                sortedQuestions.map((item, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950/40 border border-zinc-800/40 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-zinc-300 truncate pr-4">"{item.question}"</span>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full font-mono text-[10px] font-semibold whitespace-nowrap">
                      {item.count} {item.count === 1 ? "ask" : "asks"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Most viewed FAQ / Knowledge Base */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Most Triggered FAQs</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Most matched queries from Knowledge Base</p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
              {sortedFAQs.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">No FAQ matches logged yet.</p>
              ) : (
                sortedFAQs.map((item, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950/40 border border-zinc-800/40 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-zinc-300 truncate pr-4">"{item.question}"</span>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-mono text-[10px] font-semibold whitespace-nowrap">
                      {item.count} {item.count === 1 ? "view" : "views"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Most common keywords */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Common Search Keywords</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Extracted keywords from user inputs</p>
            </div>

            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
              {sortedKeywords.length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center w-full">No keywords registered yet.</p>
              ) : (
                sortedKeywords.map((item, idx) => (
                  <div key={idx} className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-2 text-xs">
                    <span className="text-zinc-400 font-mono">#{item.keyword}</span>
                    <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                    <span className="font-semibold text-purple-400 font-mono text-[10px]">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Detailed Chat Session Explorer */}
        <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Live Conversation Explorer</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Browse interactive logs, timestamps, token counts, and latencies</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase font-mono text-zinc-500 tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User Prompt</th>
                  <th className="py-3 px-4">AI Response</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Latency</th>
                  <th className="py-3 px-4 text-right">Tokens</th>
                  <th className="py-3 px-4">Session / Conv ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-xs">
                {chatLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-500">
                      No conversation logs available.
                    </td>
                  </tr>
                ) : (
                  chatLogs.map((log) => {
                    const hasErr = (log.answer && log.answer.includes("[ERROR]")) || 
                                   (log.answer && log.answer.includes("communication link had a temporary hiccup"));
                    return (
                      <tr key={log.id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-200 max-w-xs truncate" title={log.question}>
                          {log.question}
                        </td>
                        <td className={`py-3.5 px-4 max-w-xs truncate ${hasErr ? "text-red-400 font-medium" : "text-zinc-400"}`} title={log.answer}>
                          {log.answer}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase ${
                            log.response_source === "Gemini"
                              ? "bg-purple-950/50 text-purple-400 border border-purple-500/10"
                              : "bg-blue-950/50 text-blue-400 border border-blue-500/10"
                          }`}>
                            {log.response_source}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-zinc-400">
                          {log.response_time_ms ? `${log.response_time_ms} ms` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-zinc-400">
                          {log.token_usage || "-"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                          <span title={`Conv: ${log.conversation_id || "N/A"}\nSession: ${log.session_id || "N/A"}`}>
                            {log.conversation_id ? `${log.conversation_id.substring(0, 8)}...` : log.session_id ? `${log.session_id.substring(0, 8)}...` : "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderLeadsManager() {
    // Compute stats
    const totalLeadsCount = leads.length;
    const newLeadsCount = leads.filter(l => l.status === "new" || !l.status).length;
    const readLeadsCount = leads.filter(l => l.status === "read").length;
    const repliedLeadsCount = leads.filter(l => l.status === "replied").length;
    const archivedLeadsCount = leads.filter(l => l.status === "archived").length;

    // Filter leads
    const filteredLeads = leads.filter(l => {
      // Filter by status
      if (filterStatus !== "all") {
        if (filterStatus === "new") {
          if (l.status !== "new" && l.status !== undefined && l.status !== null && l.status !== "") return false;
        } else {
          if (l.status !== filterStatus) return false;
        }
      }

      // Search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const nameMatch = l.name?.toLowerCase().includes(query);
        const emailMatch = l.email?.toLowerCase().includes(query);
        const subjectMatch = l.subject?.toLowerCase().includes(query);
        const messageMatch = l.message?.toLowerCase().includes(query);
        const companyMatch = l.company?.toLowerCase().includes(query);
        return nameMatch || emailMatch || subjectMatch || messageMatch || companyMatch;
      }

      return true;
    });

    return (
      <div className="space-y-8 animate-fade-in" id="leads-panel">
        {/* Header and Export */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
              <Inbox className="w-6 h-6 text-purple-400" />
              Lead Management
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              Track and reply to direct client proposals, project inquiries, and visualizer opportunities.
            </p>
          </div>

          <button
            onClick={exportLeadsCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl transition-all self-start sm:self-auto shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Lead Stats Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Leads */}
          <div className="p-4 rounded-2xl bg-[#0c0c12]/50 border border-white/5 relative overflow-hidden">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total Leads</p>
            <p className="text-2xl font-bold text-white mt-1">{totalLeadsCount}</p>
            <div className="absolute right-3 bottom-3 w-8 h-8 bg-white/2 rounded-full flex items-center justify-center">
              <Inbox className="w-4 h-4 text-zinc-600" />
            </div>
          </div>

          {/* New Leads */}
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 relative overflow-hidden">
            <p className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">New Leads</p>
            <p className="text-2xl font-bold text-purple-300 mt-1">{newLeadsCount}</p>
            <div className="absolute right-3 bottom-3 w-8 h-8 bg-purple-500/5 rounded-full flex items-center justify-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
            </div>
          </div>

          {/* Read Leads */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 relative overflow-hidden">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Read</p>
            <p className="text-2xl font-bold text-blue-300 mt-1">{readLeadsCount}</p>
            <div className="absolute right-3 bottom-3 w-8 h-8 bg-blue-500/5 rounded-full flex items-center justify-center">
              <Eye className="w-4 h-4 text-blue-500/40" />
            </div>
          </div>

          {/* Replied Leads */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden">
            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Replied</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{repliedLeadsCount}</p>
            <div className="absolute right-3 bottom-3 w-8 h-8 bg-emerald-500/5 rounded-full flex items-center justify-center">
              <Reply className="w-4 h-4 text-emerald-500/40" />
            </div>
          </div>

          {/* Archived Leads */}
          <div className="p-4 rounded-2xl bg-zinc-800/20 border border-zinc-800/50 relative overflow-hidden col-span-2 lg:col-span-1">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Archived</p>
            <p className="text-2xl font-bold text-zinc-400 mt-1">{archivedLeadsCount}</p>
            <div className="absolute right-3 bottom-3 w-8 h-8 bg-zinc-800/5 rounded-full flex items-center justify-center">
              <Archive className="w-4 h-4 text-zinc-600" />
            </div>
          </div>
        </div>

        {/* Filters and Main Panel split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Leads List (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-[#0c0c12]/40 border border-white/5 space-y-4">
              
              {/* Search & Filter Controls */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search name, email, query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#121216] border border-zinc-800 text-xs px-9 py-2.5 rounded-xl text-white outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mr-1">Filter:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: "all", label: "All" },
                      { key: "new", label: "New" },
                      { key: "read", label: "Read" },
                      { key: "replied", label: "Replied" },
                      { key: "archived", label: "Archived" }
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        onClick={() => setFilterStatus(btn.key)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                          filterStatus === btn.key
                            ? "bg-purple-600 text-white"
                            : "bg-zinc-800/40 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leads List Box */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {isLoadingLeads ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    <span className="animate-spin inline-block w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mb-2" />
                    <p>Loading leads from database...</p>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    <p>No leads found matching current filters.</p>
                  </div>
                ) : (
                  filteredLeads.map((lead) => {
                    const isNew = lead.status === "new" || !lead.status;
                    const isSelected = selectedLead?.id === lead.id;
                    const dateStr = new Date(lead.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <div
                        key={lead.id}
                        onClick={() => {
                          setSelectedLead(lead);
                          // Auto mark as read if selected is new
                          if (isNew) {
                            updateLeadStatus(lead, "read");
                          }
                        }}
                        className={`p-3 rounded-xl cursor-pointer text-left transition-all border ${
                          isSelected
                            ? "bg-purple-500/10 border-purple-500/30"
                            : "bg-zinc-900/30 border-transparent hover:bg-zinc-900/50 hover:border-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                            {lead.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {dateStr}
                          </span>
                        </div>

                        <p className="text-[11px] font-medium text-zinc-300 truncate mt-1">
                          {lead.subject}
                        </p>
                        
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                          {lead.message}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-2">
                          {lead.company ? (
                            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-800/40 px-1.5 py-0.5 rounded-md truncate max-w-[120px]">
                              🏢 {lead.company}
                            </span>
                          ) : (
                            <span />
                          )}

                          <div className="flex items-center gap-1.5">
                            {lead.isFallback && (
                              <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/10 px-1 py-0.2 rounded font-mono">
                                fallback
                              </span>
                            )}
                            <span className={`text-[8px] uppercase tracking-widest font-mono font-bold px-1.5 py-0.5 rounded ${
                              lead.status === "new" || !lead.status
                                ? "bg-purple-500/20 text-purple-300"
                                : lead.status === "read"
                                ? "bg-blue-500/20 text-blue-300"
                                : lead.status === "replied"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-zinc-800 text-zinc-400"
                            }`}>
                              {lead.status || "new"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

          {/* Right Column: Lead Detail View (7 Cols) */}
          <div className="lg:col-span-7">
            {selectedLead ? (
              <div className="p-6 rounded-2xl bg-[#0c0c12]/40 border border-white/5 space-y-6 text-left animate-fade-in">
                
                {/* Header Info */}
                <div className="border-b border-white/5 pb-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white leading-tight">
                        {selectedLead.name}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <a href={`mailto:${selectedLead.email}`} className="text-purple-400 hover:underline">
                          ✉️ {selectedLead.email}
                        </a>
                        {selectedLead.phone && (
                          <span>📞 {selectedLead.phone}</span>
                        )}
                        {selectedLead.company && (
                          <span className="text-zinc-500">🏢 {selectedLead.company}</span>
                        )}
                      </p>
                    </div>

                    {/* Status badge and actions */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:self-start">
                      <button
                        onClick={() => updateLeadStatus(selectedLead, "read")}
                        disabled={isActionLoading}
                        className={`p-1.5 rounded-lg border transition-all text-[10px] font-semibold ${
                          selectedLead.status === "read"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                        title="Mark as Read"
                      >
                        <CheckSquare className="w-3.5 h-3.5 inline mr-1" />
                        Read
                      </button>

                      <button
                        onClick={() => updateLeadStatus(selectedLead, "replied")}
                        disabled={isActionLoading}
                        className={`p-1.5 rounded-lg border transition-all text-[10px] font-semibold ${
                          selectedLead.status === "replied"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                        title="Mark as Replied"
                      >
                        <Reply className="w-3.5 h-3.5 inline mr-1" />
                        Replied
                      </button>

                      <button
                        onClick={() => updateLeadStatus(selectedLead, "archived")}
                        disabled={isActionLoading}
                        className={`p-1.5 rounded-lg border transition-all text-[10px] font-semibold ${
                          selectedLead.status === "archived"
                            ? "bg-zinc-800 border-zinc-700 text-zinc-300"
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                        title="Archive Lead"
                      >
                        <Archive className="w-3.5 h-3.5 inline mr-1" />
                        Archive
                      </button>

                      <button
                        onClick={() => deleteLead(selectedLead)}
                        disabled={isActionLoading}
                        className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all text-[10px] font-semibold"
                        title="Delete Lead"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-2">
                    <span>IP: {selectedLead.visitor_ip || "Unknown"}</span>
                    <span>Received: {new Date(selectedLead.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Email Submission Box */}
                <div className="space-y-1">
                  <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                    Subject Line
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {selectedLead.subject}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                    Message Body
                  </p>
                  <div className="p-4 rounded-xl bg-[#121216] border border-white/5 text-zinc-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-all">
                    {selectedLead.message}
                  </div>
                </div>

                {/* Integration Details / Ethereal Email Verification */}
                {selectedLead.notes && selectedLead.notes.includes("http") ? (
                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-purple-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-purple-400" />
                        Email Dispatch Verification
                      </p>
                      <p className="text-zinc-400 text-[11px]">
                        A real email arrived at our sandbox test inbox. You can open and view it:
                      </p>
                    </div>
                    <a
                      href={selectedLead.notes.substring(selectedLead.notes.indexOf("http"))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-md"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Inbox Link
                    </a>
                  </div>
                ) : null}

                {/* Administrative Notes Section */}
                <div className="space-y-2 border-t border-white/5 pt-4">
                  <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                    Internal Admin Notes
                  </p>
                  
                  {editingNotesId === selectedLead.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Add professional follow up remarks, status history, phone records..."
                        className="w-full bg-[#121216] border border-zinc-800 text-xs sm:text-sm p-3 rounded-xl text-white outline-none focus:border-purple-500 transition-colors h-24 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingNotesId(null)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            updateLeadNotes(selectedLead, notesText);
                            setEditingNotesId(null);
                          }}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold rounded-lg transition-all"
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-900/60 flex items-start justify-between gap-4 text-xs">
                      <p className="text-zinc-400 italic">
                        {selectedLead.notes ? selectedLead.notes : "No administrative notes logged for this lead yet."}
                      </p>
                      <button
                        onClick={() => {
                          setEditingNotesId(selectedLead.id);
                          setNotesText(selectedLead.notes || "");
                        }}
                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono uppercase tracking-wider rounded transition-all shrink-0"
                      >
                        Edit Notes
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-[#0c0c12]/20 border border-zinc-900 border-dashed text-center h-full flex flex-col items-center justify-center min-h-[350px]">
                <Inbox className="w-10 h-10 text-zinc-700 mb-3" />
                <h3 className="font-semibold text-zinc-400 text-sm">No Lead Selected</h3>
                <p className="text-zinc-600 text-xs mt-1 max-w-xs">
                  Click on any client inquiry on the left side to review details, update their response status, or log internal remarks.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }
}
