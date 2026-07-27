import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePortfolio } from "../context/PortfolioContext";
import {
  Save,
  Download,
  Upload,
  Shield,
  Sliders,
  Globe,
  Eye,
  FileText,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Palette,
  Bot,
  Code2,
  Check,
  RefreshCw,
} from "lucide-react";

interface AdminSettingsEditorProps {
  isDemo?: boolean;
}

export default function AdminSettingsEditor({ isDemo = false }: AdminSettingsEditorProps) {
  const { siteSettings, setSiteSettings, refreshData } = usePortfolio();

  // Tab State
  const [activeTab, setActiveTab] = useState<"general" | "cv" | "features" | "backup">("general");

  // General & SEO State
  const [seoTitle, setSeoTitle] = useState(siteSettings.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(siteSettings.seoDescription || "");
  const [seoKeywords, setSeoKeywords] = useState(siteSettings.seoKeywords || "");

  // CV Download Settings State
  const [cvSource, setCvSource] = useState<"upload" | "url">(siteSettings.cvSource || "upload");
  const [cvUrl, setCvUrl] = useState(siteSettings.cvUrl || "");
  const [cvFileName, setCvFileName] = useState(siteSettings.cvFileName || "");
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [cvUploadSuccess, setCvUploadSuccess] = useState<string | null>(null);

  // Styling & Features
  const [primaryColor, setPrimaryColor] = useState(siteSettings.primaryColor || "#8b5cf6");
  const [customCss, setCustomCss] = useState(siteSettings.customCss || "");
  const [enableChatbot, setEnableChatbot] = useState(siteSettings.enableChatbot !== false);

  // Form & Backup Statuses
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Sync state when context loads/updates
  useEffect(() => {
    setSeoTitle(siteSettings.seoTitle || "");
    setSeoDescription(siteSettings.seoDescription || "");
    setSeoKeywords(siteSettings.seoKeywords || "");
    setCvSource(siteSettings.cvSource || "upload");
    setCvUrl(siteSettings.cvUrl || "");
    setCvFileName(siteSettings.cvFileName || "");
    setPrimaryColor(siteSettings.primaryColor || "#8b5cf6");
    setCustomCss(siteSettings.customCss || "");
    setEnableChatbot(siteSettings.enableChatbot !== false);
  }, [siteSettings]);

  // PDF File Upload Handler (Bucket: 'cv')
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setCvUploadError("Invalid file type. Please select a valid PDF file (.pdf).");
      setCvUploadSuccess(null);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setCvUploadError("File size exceeds 20MB limit. Please upload a smaller PDF.");
      setCvUploadSuccess(null);
      return;
    }

    setIsUploadingCv(true);
    setCvUploadError(null);
    setCvUploadSuccess(null);

    try {
      let publicUrl = "";
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `cv_${Date.now()}_${cleanName}`;

      if (!isDemo && isSupabaseConfigured && supabase) {
        const { error: uploadError } = await supabase.storage
          .from("cv")
          .upload(storagePath, file, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          if (uploadError.message?.includes("bucket not found") || (uploadError as any).statusCode === "404") {
            try {
              await supabase.storage.createBucket("cv", { public: true });
              const { error: retryError } = await supabase.storage
                .from("cv")
                .upload(storagePath, file, { contentType: "application/pdf", upsert: true });
              if (retryError) throw retryError;
            } catch (bErr) {
              console.error("Could not auto-create bucket:", bErr);
            }
          } else {
            throw uploadError;
          }
        }

        const { data: urlData } = supabase.storage.from("cv").getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      } else {
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setCvUrl(publicUrl);
      setCvFileName(file.name);
      setCvSource("upload");
      setCvUploadSuccess(`PDF "${file.name}" ready! Remember to save changes.`);
    } catch (err: any) {
      console.error("Upload error:", err);
      setCvUploadError(err.message || "Failed to upload PDF file.");
    } finally {
      setIsUploadingCv(false);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    const payload: { key: string; value: any }[] = [
      { key: "seoTitle", value: seoTitle },
      { key: "seoDescription", value: seoDescription },
      { key: "seoKeywords", value: seoKeywords },
      { key: "cvSource", value: cvSource },
      { key: "cvUrl", value: cvUrl },
      { key: "cvFileName", value: cvFileName },
      { key: "primaryColor", value: primaryColor },
      { key: "customCss", value: customCss },
      { key: "enableChatbot", value: enableChatbot },
    ];

    const updatedSettings = {
      seoTitle,
      seoDescription,
      seoKeywords,
      cvSource: cvSource as "upload" | "url",
      cvUrl,
      cvFileName,
      primaryColor,
      customCss,
      enableChatbot,
    };

    setSiteSettings((prev) => {
      const next = { ...prev, ...updatedSettings };
      try {
        localStorage.setItem("portfolio_site_settings", JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    if (isDemo || !isSupabaseConfigured || !supabase) {
      setTimeout(() => {
        setIsSaving(false);
        setSaveStatus({ type: "success", message: "Preferences updated in local storage!" });
        setTimeout(() => setSaveStatus(null), 3000);
      }, 400);
      return;
    }

    try {
      for (const row of payload) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key: row.key, value: row.value }, { onConflict: "key" });
        if (error) throw error;
      }

      await refreshData();
      setSaveStatus({ type: "success", message: "All site preferences saved successfully!" });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      console.error("Save settings error:", err);
      setSaveStatus({ type: "error", message: `Error saving: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      if (isDemo || !isSupabaseConfigured || !supabase) {
        const mockBackup = {
          exportedAt: new Date().toISOString(),
          siteSettings: {
            seoTitle,
            seoDescription,
            seoKeywords,
            cvUrl,
            cvFileName,
            primaryColor,
            customCss,
            enableChatbot,
          },
          sections: [],
          faqs: [{ question: "What is your stack?", answer: "React and Supabase." }],
        };
        triggerDownload(mockBackup, "portfolio-backup-demo.json");
        return;
      }

      const { data: sections } = await supabase.from("sections").select("*");
      const { data: faqs } = await supabase.from("faq_knowledge_base").select("*");
      const { data: settings } = await supabase.from("site_settings").select("*");

      const backupObj = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        siteSettings: settings || [],
        sections: sections || [],
        faqs: faqs || [],
      };

      triggerDownload(backupObj, `portfolio-backup-${new Date().toISOString().split("T")[0]}.json`);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const triggerDownload = (obj: any, filename: string) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    setImportStatus(null);
    setImportError(null);

    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.sections && !parsed.siteSettings && !parsed.faqs) {
          throw new Error("Invalid backup format. Missing required fields.");
        }

        if (isDemo || !isSupabaseConfigured || !supabase) {
          setImportStatus("Backup validated successfully (Sandbox mode).");
          return;
        }

        if (Array.isArray(parsed.siteSettings)) {
          for (const setting of parsed.siteSettings) {
            await supabase.from("site_settings").upsert(
              { key: setting.key, value: setting.value },
              { onConflict: "key" }
            );
          }
        }

        if (Array.isArray(parsed.sections)) {
          for (const sec of parsed.sections) {
            const { id, created_at, updated_at, ...cleanSec } = sec;
            await supabase.from("sections").upsert(
              {
                key: sec.key,
                name: sec.name,
                type: sec.type,
                fields_schema: sec.fields_schema,
                published_content: sec.published_content,
                draft_content: sec.draft_content,
                is_visible: sec.is_visible,
                order_index: sec.order_index,
              },
              { onConflict: "key" }
            );
          }
        }

        if (Array.isArray(parsed.faqs)) {
          for (const faq of parsed.faqs) {
            await supabase.from("faq_knowledge_base").upsert({
              question: faq.question,
              answer: faq.answer,
              keywords: faq.keywords,
              category: faq.category,
              status: faq.status,
            });
          }
        }

        await refreshData();
        setImportStatus("Database backup restored successfully!");
      } catch (err: any) {
        console.error(err);
        setImportError(err.message || "Failed to parse JSON backup file.");
      }
    };

    fileReader.readAsText(file);
  };

  const tabs = [
    { id: "general", label: "General & SEO", icon: Globe },
    { id: "cv", label: "CV / Resume", icon: FileText },
    { id: "features", label: "Features & Code", icon: Bot },
    { id: "backup", label: "Backups & Data", icon: Shield },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in" id="settings-editor-panel">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h2 className="text-lg font-bold font-sans text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            System Settings & Preferences
          </h2>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>

      {/* Save Status Alert Toast */}
      {saveStatus && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-fade-in ${
            saveStatus.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/40 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {saveStatus.type === "success" ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{saveStatus.message}</span>
          </div>
          <button
            onClick={() => setSaveStatus(null)}
            className="text-zinc-400 hover:text-white text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sleek Tabbed Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-[#121214] border border-zinc-800/80 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-zinc-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* TAB 1: GENERAL & SEO */}
        {activeTab === "general" && (
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-5 space-y-5 animate-fade-in">
            <div className="border-b border-zinc-800/80 pb-3">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                SEO Metadata & Brand Theme
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Page Title
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-xs outline-none transition-all"
                  placeholder="e.g. Rashed Pervej | Senior Visualizer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  Primary Brand Accent
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-9 bg-[#18181b] border border-zinc-800 rounded-lg cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Meta Keywords
              </label>
              <input
                type="text"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-xs outline-none transition-all"
                placeholder="visualizer, branding, packaging, motion graphics, bangladesh"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Meta Description
              </label>
              <textarea
                value={seoDescription}
                rows={3}
                onChange={(e) => setSeoDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-xs outline-none resize-none transition-all"
                placeholder="Concise bio for Google search results and link previews..."
              />
            </div>
          </div>
        )}

        {/* TAB 2: CV / RESUME */}
        {activeTab === "cv" && (
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-5 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  CV / Resume Download Options
                </h3>
              </div>
            </div>

            {/* Source Selection Radio Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCvSource("upload")}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  cvSource === "upload"
                    ? "bg-purple-950/20 border-purple-500/50 text-white"
                    : "bg-[#18181b] border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    cvSource === "upload" ? "border-purple-400 bg-purple-600" : "border-zinc-600"
                  }`}
                >
                  {cvSource === "upload" && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    Upload PDF Document
                  </p>
                  
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCvSource("url")}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  cvSource === "url"
                    ? "bg-purple-950/20 border-purple-500/50 text-white"
                    : "bg-[#18181b] border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    cvSource === "url" ? "border-purple-400 bg-purple-600" : "border-zinc-600"
                  }`}
                >
                  {cvSource === "url" && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-purple-400" />
                    External Document Link
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Provide a shareable URL.
                  </p>
                </div>
              </button>
            </div>

            {/* Panel A: Upload PDF */}
            {cvSource === "upload" && (
              <div className="space-y-4 pt-2">
                <div className="relative border-2 border-dashed border-zinc-800 hover:border-purple-500/50 rounded-xl p-5 text-center group cursor-pointer bg-[#18181b]/50 transition-all">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileUpload}
                    disabled={isUploadingCv}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                  />
                  {isUploadingCv ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-1">
                      <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                      <p className="text-xs text-purple-300 font-medium">Uploading PDF to Storage...</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-purple-400 mx-auto group-hover:scale-110 transition-transform" />
                      <p className="text-xs text-zinc-200 font-medium">
                        Click or drag & drop a PDF document to upload
                      </p>
                      <p className="text-[10px] text-zinc-500">Maximum file size: 20MB (.pdf only)</p>
                    </div>
                  )}
                </div>

                {cvUploadError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{cvUploadError}</span>
                  </div>
                )}

                {cvUploadSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{cvUploadSuccess}</span>
                  </div>
                )}

                {/* Active Uploaded PDF Info Card */}
                {cvUrl && (
                  <div className="p-4 bg-[#18181b] border border-zinc-800 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {cvFileName || "Uploaded_CV_Document.pdf"}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate font-mono">
                            {cvUrl.startsWith("data:") ? "Local File Data" : "Supabase Storage Active"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setCvUrl("");
                            setCvFileName("");
                            setCvUploadSuccess(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-300 text-xs transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80">
                      <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Download Filename (Assigned to users on download)
                      </label>
                      <input
                        type="text"
                        value={cvFileName}
                        onChange={(e) => setCvFileName(e.target.value)}
                        placeholder="e.g. Rashed Pervej_Resume_2026.pdf"
                        className="w-full px-3 py-2 bg-[#121214] border border-zinc-800 focus:border-purple-500/50 rounded-lg text-zinc-200 text-xs font-mono outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Panel B: External URL */}
            {cvSource === "url" && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    External Document URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={cvUrl}
                      onChange={(e) => setCvUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-xs font-mono outline-none"
                      placeholder="https://drive.google.com/file/d/.../view"
                    />
                    {cvUrl && (
                      <a
                        href={cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Test Link
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Target Filename
                  </label>
                  <input
                    type="text"
                    value={cvFileName}
                    onChange={(e) => setCvFileName(e.target.value)}
                    placeholder="e.g. Rashed_Pervej_Resume.pdf"
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-zinc-200 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FEATURES & CODE */}
        {activeTab === "features" && (
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-5 space-y-5 animate-fade-in">
            {/* Chatbot Toggle */}
            <div className="flex items-center justify-between p-4 bg-[#18181b] border border-zinc-800/80 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2 uppercase tracking-wider">
                  <Bot className="w-4 h-4 text-purple-400" />
                  Enable Smart AI Portfolio Assistant
                </h4>
                <p className="text-[11px] text-zinc-500 mt-1">
                  When enabled, visitors can interact with your AI chatbot widget in the bottom right corner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnableChatbot(!enableChatbot)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 outline-none shrink-0 ${
                  enableChatbot ? "bg-purple-600 justify-end" : "bg-zinc-800 justify-start"
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>

            {/* Custom CSS */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                Custom CSS Stylesheet Overrides
              </label>
              <textarea
                value={customCss}
                rows={5}
                onChange={(e) => setCustomCss(e.target.value)}
                className="w-full p-3.5 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 rounded-xl text-purple-300 text-xs font-mono outline-none resize-none"
                placeholder="/* Add CSS overrides here */&#10;.custom-accent { color: var(--primary-accent); }"
              />
            </div>
          </div>
        )}

        {/* TAB 4: BACKUPS & DATA */}
        {activeTab === "backup" && (
          <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-5 space-y-5 animate-fade-in">
            <div className="border-b border-zinc-800/80 pb-3">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Database Backup & Restoration
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Box */}
              <div className="p-4 bg-[#18181b] border border-zinc-800 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-purple-400" />
                    Export Full Backup
                  </h4>
                  
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full py-2.5 px-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Database (.JSON)
                </button>
              </div>

              {/* Import Box */}
              <div className="p-4 bg-[#18181b] border border-zinc-800 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-purple-400" />
                    Restore From Backup
                  </h4>
                 
                </div>

                <div className="relative border border-dashed border-zinc-700/80 hover:border-purple-500/50 rounded-xl p-3 text-center cursor-pointer transition-colors bg-[#121214]">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-300">
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Select .JSON Backup File</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Import Feedback */}
            {importStatus && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Save Action Footer Bar */}
        <div className="flex items-center justify-end pt-2 border-t border-zinc-800/80">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}

