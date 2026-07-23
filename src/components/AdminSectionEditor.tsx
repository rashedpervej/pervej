import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { usePortfolio, SectionRecord } from "../context/PortfolioContext";
import { Save, Plus, Trash, ArrowUp, ArrowDown, Upload, CheckCircle, AlertCircle, Edit, ListOrdered, Eye, Send, EyeOff, LayoutGrid, ZoomIn, ZoomOut, RotateCcw, X, Loader2, Check, Clock, Sparkles } from "lucide-react";
import RichTextControl from "./RichTextControl";

interface AdminSectionEditorProps {
  sectionKey: string;
  isDemo?: boolean;
}

interface ProjectGlobalTogglesProps {
  isDemo?: boolean;
}

function ProjectGlobalToggles({ isDemo = false }: ProjectGlobalTogglesProps) {
  const { siteSettings, setSiteSettings } = usePortfolio();
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const settings = {
    showCategoryFilters: true,
    showFilterAll: true,
    showFilterBranding: true,
    showFilterMotion: true,
    showFilterMarketing: true,
    showFilterInternational: true,
    showCategory: true,
    showYear: true,
    showAwardBadge: true,
    showClientName: true,
    showServices: true,
    showToolsUsed: true,
    showProjectDuration: true,
    showLiveUrl: true,
    showBehanceUrl: true,
    showCaseStudyButton: true,
    showProjectTags: true,
    ...siteSettings.projectSettings,
  };

  const handleToggle = async (field: keyof typeof settings) => {
    const updatedSettings = {
      ...settings,
      [field]: !settings[field],
    };

    setSiteSettings((prev) => ({
      ...prev,
      projectSettings: updatedSettings,
    }));

    if (isDemo || !isSupabaseConfigured || !supabase) {
      return;
    }

    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "projectSettings", value: updatedSettings }, { onConflict: "key" });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save project visibility settings:", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filterToggleFields = [
    { id: "showCategoryFilters" as const, label: "All Category Filters (Master Bar)" },
    { id: "showFilterAll" as const, label: "Filter: All" },
    { id: "showFilterBranding" as const, label: "Filter: Branding & Packaging" },
    { id: "showFilterMotion" as const, label: "Filter: Motion Graphics" },
    { id: "showFilterMarketing" as const, label: "Filter: Marketing & Print" },
    { id: "showFilterInternational" as const, label: "Filter: International" },
  ];

  const metadataToggleFields = [
    { id: "showCategory" as const, label: "Category Badge on Card" },
    { id: "showYear" as const, label: "Project Year" },
    { id: "showAwardBadge" as const, label: "Award / Featured Badge" },
    { id: "showClientName" as const, label: "Client Name" },
    { id: "showServices" as const, label: "Services" },
    { id: "showToolsUsed" as const, label: "Tools Used" },
    { id: "showProjectDuration" as const, label: "Project Duration" },
    { id: "showLiveUrl" as const, label: "Live URL" },
    { id: "showBehanceUrl" as const, label: "Behance URL" },
    { id: "showCaseStudyButton" as const, label: "Case Study Button" },
    { id: "showProjectTags" as const, label: "Project Tags" },
  ];

  return (
    <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-2xl mb-6 space-y-6 animate-fade-in" id="global-project-settings">
      <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-purple-400" />
            Global Project Controls & Visibility Settings
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">
            Hide or unhide category filter buttons and card metadata fields on the live website. Changes sync automatically.
          </p>
        </div>
        {isSavingSettings && (
          <span className="text-[10px] font-mono text-purple-400 animate-pulse">Saving...</span>
        )}
      </div>

      {/* Category Filters Toggle Section */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Category Filter Buttons Controls (Hide/Unhide)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filterToggleFields.map((field) => {
            const isChecked = !!settings[field.id];
            return (
              <label
                key={field.id}
                className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:border-purple-500/50 transition-all select-none ${
                  field.id === "showCategoryFilters"
                    ? "bg-purple-950/20 border-purple-500/30"
                    : "bg-[#18181b] border-zinc-800/80"
                }`}
              >
                <span className="text-xs font-medium text-zinc-200">{field.label}</span>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(field.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${
                      isChecked ? "bg-purple-600" : "bg-zinc-800"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform duration-200 ${
                        isChecked ? "translate-x-4.5" : "translate-x-1"
                      }`}
                    />
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Project Card Metadata Section */}
      <div className="space-y-3 pt-4 border-t border-zinc-800/60">
        <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
          Project Card Metadata Fields
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {metadataToggleFields.map((field) => {
            const isChecked = !!settings[field.id];
            return (
              <label
                key={field.id}
                className="flex items-center justify-between p-3 bg-[#18181b] border border-zinc-800/80 rounded-xl cursor-pointer hover:border-zinc-700 transition-all select-none"
              >
                <span className="text-xs font-medium text-zinc-300">{field.label}</span>
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(field.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${
                      isChecked ? "bg-purple-600" : "bg-zinc-800"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform duration-200 ${
                        isChecked ? "translate-x-4.5" : "translate-x-1"
                      }`}
                    />
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminSectionEditor({ sectionKey, isDemo = false }: AdminSectionEditorProps) {
  const { sections, setSections, portfolioData, refreshData } = usePortfolio();
  
  // Find current section record from global context
  const sectionRecord = sections.find((s) => s.key === sectionKey);
  
  // Working state content (binds to draft_content)
  const [draftContent, setDraftContent] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [draftSuccess, setDraftSuccess] = useState(false);
  const [lastPublishedAt, setLastPublishedAt] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; title: string; message: string } | null>(null);

  // Experience & Projects editing states (specific sub-forms)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [isSubFormOpen, setIsSubFormOpen] = useState(false);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  // Image and drag-and-drop state
  const [modalImage, setModalImage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Cropper states
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>("");
  const [cropOnComplete, setCropOnComplete] = useState<((url: string) => void) | null>(null);

  // Helper to initiate cropping flow
  const initiateCropping = (file: File, onComplete: (url: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropSource(reader.result as string);
      setCropFileName(file.name);
      setCropOnComplete(() => onComplete);
    };
    reader.readAsDataURL(file);
  };

  // Synchronize modalImage when sub-form opens
  useEffect(() => {
    if (isSubFormOpen && draftContent) {
      const isNew = selectedItemIndex === null;
      const currentItem = isNew ? {} : (draftContent[selectedItemIndex] || {});
      setModalImage(currentItem.image || "");
    } else {
      setModalImage("");
    }
  }, [isSubFormOpen, selectedItemIndex, draftContent]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, onComplete: (url: string) => void) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Url = reader.result as string;

      if (isSupabaseConfigured && supabase && !isDemo) {
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const filePath = `portfolio/${fileName}`;

          const { data, error } = await supabase.storage
            .from("portfolio-assets")
            .upload(filePath, file, { cacheControl: "3600", upsert: true });

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from("portfolio-assets")
            .getPublicUrl(filePath);

          onComplete(publicUrl);
          return;
        } catch (err) {
          console.warn("Supabase Storage error. Falling back to base64 encoding storage.", err);
        }
      }
      onComplete(base64Url);
    };
    reader.readAsDataURL(file);
  };

  // Load section content from DB
  useEffect(() => {
    if (sectionRecord) {
      // Prioritize draft_content, fallback to published_content or default structure
      const content = sectionRecord.draft_content || sectionRecord.published_content;
      if (content) {
        setDraftContent(content);
      } else if (sectionKey === "contact") {
        setDraftContent({
          email: portfolioData.personalInfo.email || "",
          phone: portfolioData.personalInfo.phone || "",
          location: portfolioData.personalInfo.location || "",
          linkedin: portfolioData.personalInfo.linkedin || "",
          behance: portfolioData.personalInfo.behance || "",
        });
      } else {
        setDraftContent(getDefaultStructureForSection(sectionKey));
      }
      setIsVisible(sectionRecord.is_visible);

      if (sectionRecord.published_content) {
        const ts = (sectionRecord as any).updated_at;
        setLastPublishedAt(ts ? new Date(ts) : new Date());
      } else {
        setLastPublishedAt(null);
      }
    } else {
      if (sectionKey === "contact") {
        setDraftContent({
          email: portfolioData.personalInfo.email || "",
          phone: portfolioData.personalInfo.phone || "",
          location: portfolioData.personalInfo.location || "",
          linkedin: portfolioData.personalInfo.linkedin || "",
          behance: portfolioData.personalInfo.behance || "",
        });
      } else {
        setDraftContent(getDefaultStructureForSection(sectionKey));
      }
      setLastPublishedAt(null);
    }
    setSelectedItemIndex(null);
    setIsSubFormOpen(false);
    setToast(null);
  }, [sectionKey, sectionRecord]);

  const formatLastPublished = (date: Date | null) => {
    if (!date) return "Not published yet";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 15) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " at " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const getDefaultStructureForSection = (key: string): any => {
    switch (key) {
      case "hero":
        return {
          name: "Rashed Pervej",
          role: "Senior Visualizer",
          headline: "Brand Identity | Motion Graphics | Packaging",
          availability: "Available for Remote & Hybrid",
          location: "Jashore, Bangladesh",
          heroBio: "Senior Visualizer with 6+ years of premium experience. Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging.",
          primaryCtaText: "Explore My Work",
          primaryCtaLink: "#projects",
          secondaryCtaText: "Get In Touch",
          secondaryCtaLink: "#contact",
          experienceYears: "6+",
          yearsLabel: "Years Experience",
          selectedBrandsCount: "11+",
          brandsLabel: "Selected Brands",
          creativeAssetsCount: "200+",
          assetsLabel: "Creative Assets",
          portraitImage: "https://i.ibb.co.com/Hf2cC3WR/Generated-Image-September-05-2025-12-33-AM-1.jpg"
        };
      case "about":
        return { aboutSummary: "", aboutDetail: "", location: "" };
      case "experience":
        return [];
      case "projects":
        return [];
      case "skills":
        return { coreCompetencies: [], creativeTools: [] };
      case "services":
        return [];
      case "brands":
        return [];
      case "testimonials":
        return [];
      case "contact":
        return {
          email: portfolioData?.personalInfo?.email || "",
          phone: portfolioData?.personalInfo?.phone || "",
          location: portfolioData?.personalInfo?.location || "",
          linkedin: portfolioData?.personalInfo?.linkedin || "",
          behance: portfolioData?.personalInfo?.behance || "",
        };
      default:
        return {};
    }
  };

  // Safe handler for nested object fields
  const handleFieldChange = (field: string, value: any) => {
    setDraftContent((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Base64 + Storage image upload helper
  const triggerImageUpload = (e: React.ChangeEvent<HTMLInputElement>, onComplete: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Url = reader.result as string;

      if (isSupabaseConfigured && supabase && !isDemo) {
        try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const filePath = `portfolio/${fileName}`;

          const { data, error } = await supabase.storage
            .from("portfolio-assets")
            .upload(filePath, file, { cacheControl: "3600", upsert: true });

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from("portfolio-assets")
            .getPublicUrl(filePath);

          onComplete(publicUrl);
          return;
        } catch (err) {
          console.warn("Supabase Storage error. Falling back to base64 encoding storage.", err);
        }
      }
      onComplete(base64Url);
    };
    reader.readAsDataURL(file);
  };

  // Central Database update for Draft
  const saveToDatabase = async (contentToSave: any, visibleState: boolean, customMsg?: string) => {
    if (isSavingDraft || isPublishing) return;
    setIsSavingDraft(true);
    setIsLoading(true);
    setToast(null);

    // Update local sections state so preview reflects immediately
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.key === sectionKey);
      const recordToSave: SectionRecord = {
        id: sectionRecord?.id || `local-${sectionKey}`,
        key: sectionKey,
        name: sectionRecord?.name || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
        type: Array.isArray(contentToSave) ? "collection" : "single",
        fields_schema: sectionRecord?.fields_schema || [],
        published_content: sectionRecord?.published_content || null,
        draft_content: contentToSave,
        is_visible: visibleState,
        order_index: sectionRecord?.order_index ?? 99,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = recordToSave;
        return next;
      }
      return [...prev, recordToSave];
    });

    if (isDemo || !isSupabaseConfigured || !supabase) {
      setTimeout(() => {
        setIsSavingDraft(false);
        setIsLoading(false);
        setDraftSuccess(true);
        setToast({
          type: "success",
          title: "Draft Saved",
          message: customMsg || "Workspace draft saved successfully.",
        });
        setTimeout(() => setDraftSuccess(false), 2500);
      }, 500);
      return;
    }

    try {
      const { error } = await supabase
        .from("sections")
        .upsert({
          key: sectionKey,
          name: sectionRecord?.name || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
          type: Array.isArray(contentToSave) ? "collection" : "single",
          draft_content: contentToSave,
          published_content: sectionRecord?.published_content ?? null,
          is_visible: visibleState,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });

      if (error) throw error;

      await refreshData();
      setDraftSuccess(true);
      setToast({
        type: "success",
        title: "Draft Saved",
        message: customMsg || "Workspace draft saved successfully to database.",
      });
      setTimeout(() => setDraftSuccess(false), 2500);
    } catch (err: any) {
      console.error(err);
      setToast({
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to save draft workspace.",
      });
    } finally {
      setIsSavingDraft(false);
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (isPublishing || isSavingDraft) return;
    setIsPublishing(true);
    setIsLoading(true);
    setToast(null);

    const now = new Date();

    // Update local sections state so published content reflects immediately
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.key === sectionKey);
      const recordToSave: SectionRecord = {
        id: sectionRecord?.id || `local-${sectionKey}`,
        key: sectionKey,
        name: sectionRecord?.name || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
        type: Array.isArray(draftContent) ? "collection" : "single",
        fields_schema: sectionRecord?.fields_schema || [],
        published_content: draftContent,
        draft_content: draftContent,
        is_visible: isVisible,
        order_index: sectionRecord?.order_index ?? 99,
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = recordToSave;
        return next;
      }
      return [...prev, recordToSave];
    });

    if (isDemo || !isSupabaseConfigured || !supabase) {
      setTimeout(() => {
        setIsPublishing(false);
        setIsLoading(false);
        setPublishSuccess(true);
        setLastPublishedAt(now);
        setToast({
          type: "success",
          title: "Published Live Successfully!",
          message: `${sectionRecord?.name || sectionKey.toUpperCase()} section changes are now live across your website.`,
        });
        setTimeout(() => setPublishSuccess(false), 2500);
      }, 600);
      return;
    }

    try {
      const { error } = await supabase
        .from("sections")
        .upsert({
          key: sectionKey,
          name: sectionRecord?.name || sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1),
          type: Array.isArray(draftContent) ? "collection" : "single",
          draft_content: draftContent,
          published_content: draftContent,
          is_visible: isVisible,
          updated_at: now.toISOString()
        }, { onConflict: "key" });

      if (error) throw error;

      await refreshData();
      setPublishSuccess(true);
      setLastPublishedAt(now);
      setToast({
        type: "success",
        title: "Published Live Successfully!",
        message: `${sectionRecord?.name || sectionKey.toUpperCase()} section changes are now live across your website.`,
      });
      setTimeout(() => setPublishSuccess(false), 2500);
    } catch (err: any) {
      console.error(err);
      setToast({
        type: "error",
        title: "Publish Failed",
        message: err.message || "Failed to publish live changes.",
      });
    } finally {
      setIsPublishing(false);
      setIsLoading(false);
    }
  };

  // Reordering in Collection-type sections
  const moveItem = async (index: number, direction: "up" | "down") => {
    if (!Array.isArray(draftContent)) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftContent.length) return;

    const updated = [...draftContent];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setDraftContent(updated);
    await saveToDatabase(updated, isVisible, "Item order updated and saved as draft!");
  };

  const deleteItem = async (index: number) => {
    if (!Array.isArray(draftContent)) return;
    const updated = draftContent.filter((_, i) => i !== index);
    setDraftContent(updated);
    await saveToDatabase(updated, isVisible, "Item deleted and workspace saved!");
  };

  // ----------------------------------------------------
  // SECTION SPECIFIC COMPONENT FORMS
  // ----------------------------------------------------

  const renderSingleObjectEditor = () => {
    if (!draftContent || typeof draftContent !== "object" || Array.isArray(draftContent)) return null;

    if (sectionKey === "hero") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="hero-editor-form">
          {/* Hero Portrait Image Upload & Configuration */}
          <div className="md:col-span-2 bg-[#121214] border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-400" />
                  Hero Portrait Image
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Upload a high-resolution portrait photograph to display in the main Hero landing view.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Preview Thumbnail */}
              <div className="sm:col-span-4 lg:col-span-3 flex flex-col items-center justify-center">
                <div className="relative w-28 h-36 rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow-xl group">
                  {draftContent.portraitImage || draftContent.heroImage || draftContent.avatar ? (
                    <img
                      src={draftContent.portraitImage || draftContent.heroImage || draftContent.avatar}
                      alt="Hero Portrait Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-zinc-500 text-[10px]">
                      <Upload className="w-5 h-5 mb-1 text-zinc-600" />
                      No Image Set
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls & URL Input */}
              <div className="sm:col-span-8 lg:col-span-9 space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    Upload Image File
                  </label>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-md active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Image File...</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        triggerImageUpload(e, (url) => {
                          handleFieldChange("portraitImage", url);
                          setToast({
                            type: "success",
                            title: "Portrait Image Uploaded",
                            message: "New Hero portrait image added to draft. Save or publish to make it live.",
                          });
                        })
                      }
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Or Direct Web Image URL
                  </label>
                  <input
                    type="text"
                    value={draftContent.portraitImage || draftContent.heroImage || draftContent.avatar || ""}
                    onChange={(e) => handleFieldChange("portraitImage", e.target.value)}
                    className="w-full px-4 py-2 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
                    placeholder="https://images.unsplash.com/photo-... or https://..."
                  />
                </div>

                {(draftContent.portraitImage || draftContent.heroImage || draftContent.avatar) && (
                  <button
                    type="button"
                    onClick={() => handleFieldChange("portraitImage", "")}
                    className="text-[11px] text-red-400 hover:text-red-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Remove Hero Image</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name & Role Inputs */}
          <div>
            <RichTextControl
              label="Display Name"
              value={draftContent.name ?? "Rashed Pervej"}
              onChange={(val) => handleFieldChange("name", val)}
              placeholder="e.g. Rashed Pervej"
            />
          </div>
          <div>
            <RichTextControl
              label="Creative Role Subtitle"
              value={draftContent.role ?? "Senior Visualizer"}
              onChange={(val) => handleFieldChange("role", val)}
              placeholder="e.g. Senior Visualizer"
            />
          </div>
          <div>
            <RichTextControl
              label="Availability / Status Badge"
              value={draftContent.availability ?? "Available for Remote & Hybrid"}
              onChange={(val) => handleFieldChange("availability", val)}
              placeholder="e.g. Available for Remote & Hybrid"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Location</label>
            <input
              type="text"
              value={draftContent.location ?? "Jashore, Bangladesh"}
              onChange={(e) => handleFieldChange("location", e.target.value)}
              className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="md:col-span-2">
            <RichTextControl
              label="Hero Short Bio / Intro Paragraph"
              value={draftContent.heroBio ?? "Senior Visualizer with 6+ years of premium experience. Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging."}
              onChange={(val) => handleFieldChange("heroBio", val)}
              multiline
              placeholder="Short bio paragraph displayed in the Hero section..."
            />
          </div>

          {/* CTA Buttons Group */}
          <div className="md:col-span-2 bg-[#121214] border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Call-To-Action (CTA) Buttons</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <RichTextControl
                  label="Primary CTA Button Label"
                  value={draftContent.primaryCtaText ?? "Explore My Work"}
                  onChange={(val) => handleFieldChange("primaryCtaText", val)}
                  placeholder="e.g. Explore My Work"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Primary CTA Link Target</label>
                <input
                  type="text"
                  value={draftContent.primaryCtaLink ?? "#projects"}
                  onChange={(e) => handleFieldChange("primaryCtaLink", e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
                  placeholder="e.g. #projects or https://..."
                />
              </div>
              <div>
                <RichTextControl
                  label="Secondary CTA Button Label"
                  value={draftContent.secondaryCtaText ?? "Get In Touch"}
                  onChange={(val) => handleFieldChange("secondaryCtaText", val)}
                  placeholder="e.g. Get In Touch"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Secondary CTA Link Target</label>
                <input
                  type="text"
                  value={draftContent.secondaryCtaLink ?? "#contact"}
                  onChange={(e) => handleFieldChange("secondaryCtaLink", e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
                  placeholder="e.g. #contact or https://..."
                />
              </div>
            </div>
          </div>

          {/* Metrics / Counter Stats Group */}
          <div className="md:col-span-2 bg-[#121214] border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Hero Metrics & Animated Counters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Stat 1 */}
              <div className="bg-[#18181b] p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Metric 1 Number</label>
                <input
                  type="text"
                  value={draftContent.experienceYears ?? "6+"}
                  onChange={(e) => handleFieldChange("experienceYears", e.target.value)}
                  className="w-full px-3 py-2 bg-[#121214] border border-zinc-800 rounded-lg text-zinc-100 text-sm outline-none focus:border-purple-500/50 font-mono"
                  placeholder="e.g. 6+"
                />
                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Metric 1 Label</label>
                <input
                  type="text"
                  value={draftContent.yearsLabel ?? "Years Experience"}
                  onChange={(e) => handleFieldChange("yearsLabel", e.target.value)}
                  className="w-full px-3 py-2 bg-[#121214] border border-zinc-800 rounded-lg text-zinc-100 text-xs outline-none focus:border-purple-500/50"
                  placeholder="e.g. Years Experience"
                />
              </div>

              {/* Stat 2 */}
              <div className="bg-[#18181b] p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Metric 2 Number</label>
                <input
                  type="text"
                  value={draftContent.selectedBrandsCount ?? "11+"}
                  onChange={(e) => handleFieldChange("selectedBrandsCount", e.target.value)}
                  className="w-full px-3 py-2 bg-[#121214] border border-zinc-800 rounded-lg text-zinc-100 text-sm outline-none focus:border-purple-500/50 font-mono"
                  placeholder="e.g. 11+"
                />
                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Metric 2 Label</label>
                <input
                  type="text"
                  value={draftContent.brandsLabel ?? "Selected Brands"}
                  onChange={(e) => handleFieldChange("brandsLabel", e.target.value)}
                  className="w-full px-3 py-2 bg-[#121214] border border-zinc-800 rounded-lg text-zinc-100 text-xs outline-none focus:border-purple-500/50"
                  placeholder="e.g. Selected Brands"
                />
              </div>

              {/* Stat 3 */}
              <div className="bg-[#18181b] p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Metric 3 Number</label>
                <input
                  type="text"
                  value={draftContent.creativeAssetsCount ?? "200+"}
                  onChange={(e) => handleFieldChange("creativeAssetsCount", e.target.value)}
                  className="w-full px-3 py-2 bg-[#121214] border border-zinc-800 rounded-lg text-zinc-100 text-sm outline-none focus:border-purple-500/50 font-mono"
                  placeholder="e.g. 200+"
                />
                <label className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Metric 3 Label</label>
                <input
                  type="text"
                  value={draftContent.assetsLabel ?? "Creative Assets"}
                  onChange={(e) => handleFieldChange("assetsLabel", e.target.value)}
                  className="w-full px-3 py-2 bg-[#121214] border border-zinc-800 rounded-lg text-zinc-100 text-xs outline-none focus:border-purple-500/50"
                  placeholder="e.g. Creative Assets"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (sectionKey === "about") {
      return (
        <div className="space-y-6" id="about-editor-form">
          <div>
            <RichTextControl
              label="Summary Pitch (Short Intro)"
              value={draftContent.aboutSummary || ""}
              onChange={(val) => handleFieldChange("aboutSummary", val)}
              multiline
              placeholder="Short introductory summary pitch..."
            />
          </div>
          <div>
            <RichTextControl
              label="Detailed Narrative (Bio)"
              value={draftContent.aboutDetail || ""}
              onChange={(val) => handleFieldChange("aboutDetail", val)}
              multiline
              placeholder="Detailed background and design philosophy narrative..."
            />
          </div>
        </div>
      );
    }

    if (sectionKey === "contact") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="contact-editor-form">
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Contact Email</label>
            <input
              type="email"
              value={draftContent.email || ""}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Phone Number / WhatsApp</label>
            <input
              type="text"
              value={draftContent.phone || ""}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Location / Address</label>
            <input
              type="text"
              value={draftContent.location || ""}
              onChange={(e) => handleFieldChange("location", e.target.value)}
              className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
              placeholder="e.g. Jashore, Bangladesh"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">LinkedIn URL</label>
            <input
              type="text"
              value={draftContent.linkedin || ""}
              onChange={(e) => handleFieldChange("linkedin", e.target.value)}
              className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Behance Portfolio URL</label>
            <input
              type="text"
              value={draftContent.behance || ""}
              onChange={(e) => handleFieldChange("behance", e.target.value)}
              className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-800 rounded-xl text-zinc-100 text-sm outline-none focus:border-purple-500/50"
            />
          </div>
        </div>
      );
    }

    return null;
  };

  // Render Collection arrays (CRUD table list)
  const renderCollectionEditor = () => {
    if (!Array.isArray(draftContent)) return null;

    return (
      <div className="space-y-6" id="collection-editor-container">
        {/* Collection Header */}
        <div className="flex justify-between items-center bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-2xl">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <ListOrdered className="w-4 h-4 text-purple-400" />
            Collection Records ({draftContent.length})
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedItemIndex(null);
              setIsSubFormOpen(true);
            }}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Row
          </button>
        </div>

        {/* Collection Rows */}
        {draftContent.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-xs">
            No rows in this list yet. Click Add New Row to start.
          </div>
        ) : (
          <div className="space-y-3">
            {draftContent.map((item: any, idx: number) => (
              <div
                key={idx}
                className="bg-[#18181b] border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 flex items-center justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                      />
                    )}
                    <div className="truncate">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {item.title || item.role || item.name || item.quote || `Row #${idx + 1}`}
                      </h4>
                      <p className="text-xs text-zinc-500 truncate">
                        {item.company || item.category || item.logoText || item.author || "No metadata details"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveItem(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 rounded-lg transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, "down")}
                    disabled={idx === draftContent.length - 1}
                    className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 rounded-lg transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemIndex(idx);
                      setIsSubFormOpen(true);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-purple-400 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmIndex(idx)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sub Form Modal for CRUD updates */}
        {isSubFormOpen && renderSubFormModal()}
      </div>
    );
  };

  const renderSubFormModal = () => {
    const isNew = selectedItemIndex === null;
    const currentItem = isNew ? {} : draftContent[selectedItemIndex];

    const handleSaveSubForm = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formEl = e.currentTarget;
      const formData = new FormData(formEl);
      
      const updatedRecord: any = { ...currentItem };
      
      // Parse entries based on section key
      formData.forEach((value, key) => {
        if (key === "tags" || key === "skills") {
          updatedRecord[key] = (value as string).split(",").map(t => t.trim()).filter(Boolean);
        } else if (key === "description") {
          updatedRecord[key] = (value as string).split("\n").map(l => l.trim()).filter(Boolean);
        } else {
          updatedRecord[key] = value;
        }
      });

      // Maintain image if updated via upload state
      if (sectionKey === "services" || sectionKey === "projects") {
        updatedRecord.image = modalImage;
      }

      const updatedCollection = [...draftContent];
      if (isNew) {
        updatedRecord.id = `item-${Math.random().toString(36).substring(2)}`;
        updatedCollection.push(updatedRecord);
      } else {
        updatedCollection[selectedItemIndex] = updatedRecord;
      }

      setDraftContent(updatedCollection);
      setIsSubFormOpen(false);
      setModalImage("");

      await saveToDatabase(
        updatedCollection,
        isVisible,
        isNew ? "New item added and saved!" : "Item updated and saved!"
      );
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              {isNew ? "Add Collection Item" : `Edit Item #${selectedItemIndex + 1}`}
            </h3>
            <button
              type="button"
              onClick={() => setIsSubFormOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveSubForm} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {renderCollectionFields(currentItem)}

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setIsSubFormOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 text-xs font-medium rounded-xl transition-colors"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-xl transition-all shadow-lg"
              >
                Apply Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderCollectionFields = (item: any) => {
    // Dynamically render form inputs based on the target sectionKey
    if (sectionKey === "experience") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Company</label>
              <input type="text" name="company" required defaultValue={item.company || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Role</label>
              <input type="text" name="role" required defaultValue={item.role || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Period</label>
              <input type="text" name="period" required defaultValue={item.period || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" placeholder="e.g. Feb 2025 - Present" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Type</label>
              <input type="text" name="type" defaultValue={item.type || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" placeholder="Hybrid, Full-Time" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Location</label>
            <input type="text" name="location" defaultValue={item.location || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Job Points / Description (one per line)</label>
            <textarea name="description" rows={4} defaultValue={Array.isArray(item.description) ? item.description.join("\n") : ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none resize-none" placeholder="Established design guidelines...\nManaged creative deliverables..." />
          </div>
        </div>
      );
    }

    if (sectionKey === "projects") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Project Title</label>
              <input type="text" name="title" required defaultValue={item.title || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Category</label>
              <input type="text" name="category" required defaultValue={item.category || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="Branding, Packaging" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Project Year</label>
              <input type="text" name="year" required defaultValue={item.year || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Service Provided (appears in top-left label)</label>
              <input type="text" name="serviceProvided" required defaultValue={item.serviceProvided || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="e.g. Brand Identity Design, Packaging Design" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Description</label>
            <textarea name="description" rows={3} defaultValue={item.description || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none resize-none focus:border-purple-500/50" />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Tags (comma separated)</label>
            <input type="text" name="tags" defaultValue={Array.isArray(item.tags) ? item.tags.join(", ") : ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="Brand, Motion, Vector" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Client Name</label>
              <input type="text" name="clientName" defaultValue={item.clientName || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Project Duration</label>
              <input type="text" name="projectDuration" defaultValue={item.projectDuration || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="e.g. 4 Weeks" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Tools Used</label>
            <input type="text" name="toolsUsed" defaultValue={item.toolsUsed || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="e.g. Figma, Photoshop" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Live URL</label>
              <input type="text" name="liveUrl" defaultValue={item.liveUrl || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Behance URL</label>
              <input type="text" name="behanceUrl" defaultValue={item.behanceUrl || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="https://behance.net/..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Award / Featured Badge</label>
              <input type="text" name="awardBadge" defaultValue={item.awardBadge || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="e.g. Gold Winner, Featured" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">External Case Study Link / Button URL</label>
              <input type="text" name="link" defaultValue={item.link || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50" placeholder="https://be.net/xyz" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-2">Project Image Artwork</label>
            <div className="flex gap-4 items-center">
              {(modalImage || item.image) && (
                <img src={modalImage || item.image} alt="" className="w-16 h-16 rounded-xl object-cover bg-zinc-900 border border-zinc-800" />
              )}
              <div className="relative flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => triggerImageUpload(e, (url) => setModalImage(url))}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="px-4 py-2.5 bg-zinc-800 text-center rounded-xl text-zinc-300 font-medium text-xs hover:bg-zinc-700/80 transition-colors">
                  Choose New Asset File
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (sectionKey === "services") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Service Title</label>
            <input
              type="text"
              name="title"
              required
              defaultValue={item.title || ""}
              className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Service Pitch / Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={item.description || ""}
              className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none resize-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Core Deliverables / Sub-skills (comma-separated)</label>
            <input
              type="text"
              name="skills"
              defaultValue={Array.isArray(item.skills) ? item.skills.join(", ") : ""}
              className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none focus:border-purple-500/50"
              placeholder="Logo Design, Styleguides, Typography"
            />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-2">Featured Image Banner (Recommended 1600×400 px, 4:1 ratio)</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) initiateCropping(file, (url) => setModalImage(url));
              }}
              className={`border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-3 text-center ${
                isDragging
                  ? "border-purple-500 bg-purple-500/5"
                  : modalImage
                  ? "border-zinc-800 bg-zinc-900/20"
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/10"
              }`}
            >
              {modalImage ? (
                <div className="w-full space-y-3">
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 group/img">
                    <img
                      src={modalImage}
                      alt="Featured Image Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-[10px] font-mono text-zinc-300">Ready for publish</p>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setModalImage("")}
                      className="px-2.5 py-1 bg-red-950/40 border border-red-900/30 text-red-400 hover:text-red-300 rounded-lg text-[10px] font-medium transition-colors"
                    >
                      Remove Image
                    </button>
                    <label className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-[10px] font-medium transition-colors cursor-pointer border border-zinc-700">
                      Change Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) initiateCropping(file, (url) => setModalImage(url));
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-zinc-400 mx-auto">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-zinc-300">
                      Drag & drop your cover image here, or{" "}
                      <label className="text-purple-400 hover:text-purple-300 cursor-pointer underline">
                        browse
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) initiateCropping(file, (url) => setModalImage(url));
                          }}
                          className="hidden"
                        />
                      </label>
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono">Recommended: 1600×400 px | Aspect Ratio: 4:1</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (sectionKey === "brands") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Brand Name</label>
              <input type="text" name="name" required defaultValue={item.name || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Display Logo Text</label>
              <input type="text" name="logoText" required defaultValue={item.logoText || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Market Location / Country</label>
            <input type="text" name="market" defaultValue={item.market || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" placeholder="Bangladesh, USA, Belgium" />
          </div>
        </div>
      );
    }

    if (sectionKey === "testimonials") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Quote</label>
            <textarea name="quote" required rows={3} defaultValue={item.quote || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Author Name / Role</label>
              <input type="text" name="author" required defaultValue={item.author || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">Company</label>
              <input type="text" name="company" defaultValue={item.company || ""} className="w-full px-3 py-2 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none" />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Custom skills section editor
  const renderSkillsEditor = () => {
    if (!draftContent || typeof draftContent !== "object") return null;

    const core = draftContent.coreCompetencies || [];
    const tools = draftContent.creativeTools || [];

    const handleCompetencyChange = (idx: number, val: string) => {
      const updated = [...core];
      updated[idx] = val;
      setDraftContent((prev: any) => ({ ...prev, coreCompetencies: updated }));
    };

    const addCompetency = () => {
      setDraftContent((prev: any) => ({ ...prev, coreCompetencies: [...core, "New Core Competency"] }));
    };

    const removeCompetency = (idx: number) => {
      const updated = core.filter((_: any, i: number) => i !== idx);
      setDraftContent((prev: any) => ({ ...prev, coreCompetencies: updated }));
    };

    const handleToolChange = (idx: number, field: string, val: any) => {
      const updated = [...tools];
      updated[idx] = { ...updated[idx], [field]: val };
      setDraftContent((prev: any) => ({ ...prev, creativeTools: updated }));
    };

    const addTool = () => {
      setDraftContent((prev: any) => ({ ...prev, creativeTools: [...tools, { name: "New Adobe Tool", level: 80 }] }));
    };

    const removeTool = (idx: number) => {
      const updated = tools.filter((_: any, i: number) => i !== idx);
      setDraftContent((prev: any) => ({ ...prev, creativeTools: updated }));
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="skills-editor-panel">
        {/* Core Competencies Tag Array */}
        <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-purple-400" />
              Core Competencies
            </h3>
            <button type="button" onClick={addCompetency} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              + Add Competency
            </button>
          </div>

          <div className="space-y-3">
            {core.length === 0 ? (
              <p className="text-xs text-zinc-500">No core competencies populated.</p>
            ) : (
              core.map((tag: string, idx: number) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => handleCompetencyChange(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-[#18181b] border border-zinc-800 text-zinc-200 text-xs rounded-lg outline-none"
                  />
                  <button type="button" onClick={() => removeCompetency(idx)} className="text-zinc-500 hover:text-red-400 p-1.5 transition-colors">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tools Slider Array */}
        <div className="bg-zinc-900/40 p-6 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4 text-purple-400" />
              Creative Tools Fluency
            </h3>
            <button type="button" onClick={addTool} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              + Add Tool Skill
            </button>
          </div>

          <div className="space-y-4">
            {tools.length === 0 ? (
              <p className="text-xs text-zinc-500">No dynamic tools populated.</p>
            ) : (
              tools.map((tool: any, idx: number) => (
                <div key={idx} className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={tool.name || ""}
                      onChange={(e) => handleToolChange(idx, "name", e.target.value)}
                      className="bg-transparent text-white text-xs font-semibold border-none outline-none focus:ring-1 focus:ring-purple-500/50 rounded px-1.5"
                    />
                    <button type="button" onClick={() => removeTool(idx)} className="text-zinc-500 hover:text-red-400 p-1 transition-colors">
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tool.level || 0}
                      onChange={(e) => handleToolChange(idx, "level", parseInt(e.target.value))}
                      className="flex-1 accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono text-purple-400 w-8 text-right">{tool.level || 0}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" id="section-editor-panel">
      {/* Panel Action Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-[#121214] border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white capitalize tracking-tight flex items-center gap-2">
              {sectionRecord?.name || sectionKey} Section
            </h2>
            <button
              onClick={async () => {
                const nextState = !isVisible;
                setIsVisible(nextState);
                await saveToDatabase(draftContent, nextState, nextState ? "Section is now visible to visitors!" : "Section is now hidden from visitors!");
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                isVisible
                  ? "bg-purple-950/50 border-purple-500/30 text-purple-300 hover:bg-purple-900/60"
                  : "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              }`}
              title={isVisible ? "Section is currently visible on live site" : "Section is hidden from live site"}
            >
              {isVisible ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{isVisible ? "Visible" : "Hidden"}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap pt-0.5">
            <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Last published:</span>
              <span className="text-zinc-200 font-medium">{formatLastPublished(lastPublishedAt)}</span>
            </div>
            <span className="text-zinc-700">•</span>
            <p className="text-zinc-400 text-xs">
              Live visitors see published content unless sandbox preview is active.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Save Draft Button */}
          <button
            type="button"
            onClick={() => saveToDatabase(draftContent, isVisible)}
            disabled={isSavingDraft || isPublishing || isLoading}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 border active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none ${
              draftSuccess
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950/30"
                : "bg-zinc-800/90 hover:bg-zinc-700/90 border-zinc-700/80 hover:border-zinc-600 text-zinc-200 shadow-sm"
            }`}
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                <span>Saving Draft...</span>
              </>
            ) : draftSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Draft Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-zinc-400" />
                <span>Save Draft Workspace</span>
              </>
            )}
          </button>

          {/* Publish Live Button */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || isSavingDraft || isLoading}
            className={`relative px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-200 flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none ${
              publishSuccess
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400/40"
                : isPublishing
                ? "bg-purple-700 shadow-purple-600/20"
                : "bg-purple-600 hover:bg-purple-500 shadow-purple-600/30 hover:shadow-purple-500/50 hover:-translate-y-0.5"
            }`}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Publishing Live...</span>
              </>
            ) : publishSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-100" />
                <span>Published Live!</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Publish Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 shadow-xl backdrop-blur-md animate-fade-in transition-all ${
            toast.type === "success"
              ? "bg-purple-950/80 border-purple-500/40 text-purple-200 shadow-purple-950/30"
              : "bg-red-950/80 border-red-500/40 text-red-200 shadow-red-950/30"
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.type === "success" ? (
              <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}
            <div>
              <h4 className="font-bold text-white text-xs tracking-wide">{toast.title}</h4>
              <p className="mt-0.5 text-zinc-300 leading-relaxed">{toast.message}</p>
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Body */}
      <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-6">
        {sectionKey === "skills" ? (
          <form onSubmit={async (e) => { e.preventDefault(); await saveToDatabase(draftContent, isVisible, "Skills saved successfully!"); }} className="space-y-6">
            {renderSkillsEditor()}
            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800/80 mt-6">
              <button
                type="submit"
                disabled={isSavingDraft || isPublishing || isLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavingDraft ? "Saving..." : "Save Skills Draft"}</span>
              </button>
            </div>
          </form>
        ) : Array.isArray(draftContent) ? (
          <div className="space-y-6">
            {sectionKey === "projects" && <ProjectGlobalToggles isDemo={isDemo} />}
            {renderCollectionEditor()}
          </div>
        ) : (
          <form onSubmit={async (e) => { e.preventDefault(); await saveToDatabase(draftContent, isVisible, `${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} draft saved successfully!`); }} className="space-y-6">
            {renderSingleObjectEditor()}
            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800/80 mt-6">
              <button
                type="submit"
                disabled={isSavingDraft || isPublishing || isLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavingDraft ? "Saving..." : `Save ${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} Draft`}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Custom Confirmation Dialog for Deletions */}
      {deleteConfirmIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121214] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl overflow-hidden animate-fade-in space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <Trash className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Confirm Delete</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to remove this item? This action will update your draft immediately.
            </p>
            <div className="flex justify-end gap-3 border-t border-zinc-800/80 pt-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmIndex(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const idx = deleteConfirmIndex;
                  setDeleteConfirmIndex(null);
                  await deleteItem(idx);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-xl transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Image Cropper Modal */}
      {cropSource && (
        <ImageCropperModal
          imageUrl={cropSource}
          fileName={cropFileName}
          isDemo={isDemo}
          onClose={() => {
            setCropSource(null);
            setCropFileName("");
            setCropOnComplete(null);
          }}
          onCropSave={(croppedUrl) => {
            if (cropOnComplete) {
              cropOnComplete(croppedUrl);
            }
            setCropSource(null);
            setCropFileName("");
            setCropOnComplete(null);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// HIGH-FIDELITY ASPECT RATIO LOCKED CROPPER MODAL
// ----------------------------------------------------

interface ImageCropperModalProps {
  imageUrl: string;
  fileName: string;
  onClose: () => void;
  onCropSave: (croppedUrl: string) => void;
  isDemo?: boolean;
}

function ImageCropperModal({ imageUrl, fileName, onClose, onCropSave, isDemo = false }: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Drag-to-reposition logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event support for seamless mobile repositioning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    const viewport = viewportRef.current;
    const imgEl = imgRef.current;
    if (!viewport || !imgEl) return;

    setIsCropping(true);

    try {
      const cropWidth = viewport.clientWidth;
      const cropHeight = viewport.clientHeight;

      const imgWidth = imgEl.naturalWidth;
      const imgHeight = imgEl.naturalHeight;

      // Fit the image naturally matching standard cover-contain maths
      const containerRatio = 4 / 1;
      const imgRatio = imgWidth / imgHeight;

      let displayWidth = 0;
      let displayHeight = 0;

      if (imgRatio > containerRatio) {
        displayHeight = cropHeight;
        displayWidth = cropHeight * imgRatio;
      } else {
        displayWidth = cropWidth;
        displayHeight = cropWidth / imgRatio;
      }

      // High-resolution export Canvas (1600x400)
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const outputScale = 1600 / cropWidth;

        const canvasDisplayWidth = displayWidth * outputScale;
        const canvasDisplayHeight = displayHeight * outputScale;

        const canvasLeft = (1600 - canvasDisplayWidth) / 2;
        const canvasTop = (400 - canvasDisplayHeight) / 2;

        const canvasOffsetX = offset.x * outputScale;
        const canvasOffsetY = offset.y * outputScale;

        // Draw cropped view
        ctx.translate(800, 200);
        ctx.translate(canvasOffsetX, canvasOffsetY);
        ctx.scale(zoom, zoom);
        ctx.translate(-800, -200);

        ctx.drawImage(imgEl, canvasLeft, canvasTop, canvasDisplayWidth, canvasDisplayHeight);

        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);

        if (isSupabaseConfigured && supabase && !isDemo) {
          // Convert to Blob for direct Supabase Storage upload
          const res = await fetch(croppedDataUrl);
          const blob = await res.blob();
          
          const fileExt = fileName.split(".").pop() || "jpg";
          const uniqueName = `cropped-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const filePath = `portfolio/${uniqueName}`;

          const { error } = await supabase.storage
            .from("portfolio-assets")
            .upload(filePath, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage
            .from("portfolio-assets")
            .getPublicUrl(filePath);

          onCropSave(publicUrl);
        } else {
          // Fallback to base64 encoding
          onCropSave(croppedDataUrl);
        }
      }
    } catch (err) {
      console.error("Cropping/upload failed:", err);
    } finally {
      setIsCropping(false);
      onClose();
    }
  };

  // Dimensions tracking for absolute styling
  const [imageSize, setImageSize] = useState({ width: "100%", height: "100%" });

  const handleImageLoad = () => {
    const viewport = viewportRef.current;
    const imgEl = imgRef.current;
    if (!viewport || !imgEl) return;

    const cropWidth = viewport.clientWidth;
    const cropHeight = viewport.clientHeight;

    const imgWidth = imgEl.naturalWidth;
    const imgHeight = imgEl.naturalHeight;

    const containerRatio = 4 / 1;
    const imgRatio = imgWidth / imgHeight;

    if (imgRatio > containerRatio) {
      setImageSize({
        width: `${cropHeight * imgRatio}px`,
        height: `${cropHeight}px`,
      });
    } else {
      setImageSize({
        width: `${cropWidth}px`,
        height: `${cropWidth / imgRatio}px`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0c0c12] border border-purple-500/15 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-purple-500/10 rounded-lg text-purple-400">
              <RotateCcw className="w-4 h-4 rotate-45" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Crop Cover Image</h3>
              <p className="text-[10px] text-zinc-500 font-mono">1600 × 400 PX RECOMMENDED (4:1 RATIO)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-purple-950/15 border border-purple-500/10 rounded-xl px-4 py-3 text-left">
            <p className="text-xs text-purple-300 leading-relaxed">
              <span className="font-semibold">Sizing Guide:</span> Ideal dimensions are <span className="font-mono text-purple-400 font-bold">1600×400 px</span> (Minimum <span className="font-mono text-purple-400 font-bold">1200×300 px</span>). Reposition the image to fit beautifully inside the service card.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Interactive Reposition Preview</span>
              <span className="text-[10px] text-purple-400 font-mono bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
                {zoom.toFixed(2)}x Zoom
              </span>
            </div>

            <div
              ref={viewportRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative w-full aspect-[4/1] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden select-none cursor-move group"
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Original source preview"
                onLoad={handleImageLoad}
                style={{
                  width: imageSize.width,
                  height: imageSize.height,
                  position: "absolute",
                  left: imageSize.width !== "100%" ? `calc(50% - ${parseFloat(imageSize.width) / 2}px)` : "0",
                  top: imageSize.height !== "100%" ? `calc(50% - ${parseFloat(imageSize.height) / 2}px)` : "0",
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  maxWidth: "none",
                  maxHeight: "none",
                }}
                className="pointer-events-none"
              />

              {/* Safe Area Dotted Grid */}
              <div className="absolute inset-x-8 inset-y-4 border border-dashed border-purple-500/25 pointer-events-none rounded-lg flex items-start justify-center">
                <span className="text-[8px] font-mono uppercase text-purple-400/50 bg-black/80 px-1.5 py-0.5 rounded tracking-widest mt-1 border border-purple-500/10">
                  Safe Area Boundary
                </span>
              </div>

              {/* Mock Elements overlay matching Services card components */}
              <div className="absolute bottom-3 left-4 w-9 h-9 rounded-xl border border-white/10 bg-black/80 text-white/40 text-[9px] flex items-center justify-center font-mono pointer-events-none shadow-lg">
                ICON
              </div>
              <div className="absolute bottom-3 right-4 font-mono text-[9px] text-zinc-400 bg-black/80 border border-white/10 px-2.5 py-0.5 rounded-md pointer-events-none shadow-lg">
                // 01
              </div>

              {/* Reposition prompt */}
              <div className="absolute inset-0 bg-black/20 opacity-100 group-hover:opacity-0 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-mono text-white/60 bg-black/80 px-3 py-1.5 rounded-full border border-white/10 shadow-lg tracking-wider">
                  Drag image to reposition inside card
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[#101016] border border-white/5 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-zinc-500" />
              <input
                type="range"
                min="1"
                max="4"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-lg text-[10px] font-medium transition-colors flex items-center gap-1.5 border border-zinc-800 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Layout
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-[#09090e] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-xs font-medium rounded-xl cursor-pointer"
            disabled={isCropping}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/20 hover:shadow-purple-900/30 transition-all flex items-center gap-2 cursor-pointer"
            disabled={isCropping}
          >
            {isCropping ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>Apply Cropped Banner</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
