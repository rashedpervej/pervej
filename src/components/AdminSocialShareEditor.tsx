import React, { useState, useEffect } from "react";
import {
  Share2,
  Image as ImageIcon,
  Upload,
  Globe,
  RefreshCw,
  Check,
  AlertCircle,
  Sparkles,
  Link2,
  Eye,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { usePortfolio } from "../context/PortfolioContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { savePersistentSnapshot } from "../utils/persistentSnapshot";
import {
  resolveSocialImageUrl,
  getDisplayHostname,
} from "../utils/seo";

interface AdminSocialShareEditorProps {
  isDemo?: boolean;
}

const DEFAULT_OG_IMAGE = "/og-image.jpg";
const DEFAULT_SITE_URL = "";

export const AdminSocialShareEditor: React.FC<AdminSocialShareEditorProps> = ({ isDemo = false }) => {
  const { siteSettings, setSiteSettings, sections } = usePortfolio();

  // Form State
  const [ogTitle, setOgTitle] = useState(
    siteSettings.ogTitle || siteSettings.seoTitle || "Rashed Pervej | Senior Visualizer Portfolio"
  );
  const [ogDescription, setOgDescription] = useState(
    siteSettings.ogDescription ||
      siteSettings.seoDescription ||
      "Award-winning portfolio of Rashed Pervej, Senior Visualizer & Graphic Designer specializing in brand identity, packaging, and motion graphics."
  );
  const [ogImage, setOgImage] = useState(siteSettings.ogImage || DEFAULT_OG_IMAGE);
  const [ogUrl, setOgUrl] = useState(siteSettings.ogUrl || DEFAULT_SITE_URL);

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewPlatform, setPreviewPlatform] = useState<"facebook" | "twitter" | "linkedin">("facebook");
  const [imageError, setImageError] = useState(false);

  // Sync with context updates and auto-reset image error state
  useEffect(() => {
    if (siteSettings.ogTitle) {
      setOgTitle(siteSettings.ogTitle);
    } else if (siteSettings.seoTitle) {
      setOgTitle(siteSettings.seoTitle);
    }
    if (siteSettings.ogDescription) {
      setOgDescription(siteSettings.ogDescription);
    } else if (siteSettings.seoDescription) {
      setOgDescription(siteSettings.seoDescription);
    }
    if (siteSettings.ogImage) setOgImage(siteSettings.ogImage);
    if (siteSettings.ogUrl) setOgUrl(siteSettings.ogUrl);
  }, [siteSettings.ogTitle, siteSettings.ogDescription, siteSettings.seoTitle, siteSettings.seoDescription, siteSettings.ogImage, siteSettings.ogUrl]);

  useEffect(() => {
    setImageError(false);
  }, [ogImage]);

  // Handle Image File Upload to Supabase Storage with Validation
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Please select a valid image file (JPG, PNG, or WebP).");
      setSaveStatus("error");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage("Image file exceeds the 5MB maximum limit. Please choose a smaller image.");
      setSaveStatus("error");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setImageError(false);

    try {
      if (isSupabaseConfigured && supabase && !isDemo) {
        const fileExt = file.name.split(".").pop();
        const fileName = `og-share-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `og/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("portfolio-assets")
          .upload(filePath, file, { contentType: file.type || "image/jpeg", cacheControl: "3600", upsert: true });

        if (uploadError) {
          console.warn("Storage upload failed, attempting fallback:", uploadError);
          // If storage bucket isn't available, fallback to reader data url
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const resultUrl = uploadEvent.target?.result as string;
            setOgImage(resultUrl);
            setIsUploading(false);
          };
          reader.readAsDataURL(file);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("portfolio-assets").getPublicUrl(filePath);

        setOgImage(publicUrl);
        setIsUploading(false);
        return;
      }

      // Local / Offline fallback using FileReader
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const resultUrl = uploadEvent.target?.result as string;
        setOgImage(resultUrl);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Image upload exception:", err);
      setErrorMessage("Failed to upload image. Please try again or specify an image URL directly.");
      setSaveStatus("error");
      setIsUploading(false);
    }
  };

  // Preset Image Options from Existing Portfolio Assets (Universal relative paths)
  const presetImages = [
    { label: "Default Global 1200x630 OG Banner", url: "/og-image.jpg" },
    { label: "Brand Showcase Banner", url: "/brand-header.webp" },
    { label: "Packaging Showcase Header", url: "/packeging-header.webp" },
    { label: "Motion Graphics Showcase Header", url: "/motion-header.webp" },
  ];

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage("");

    try {
      const updatedFields = {
        ogTitle: ogTitle.trim(),
        ogDescription: ogDescription.trim(),
        ogImage: ogImage.trim(),
        ogUrl: ogUrl.trim(),
      };

      // 1. Update React Context and persistent snapshot
      const newSettings = {
        ...siteSettings,
        ...updatedFields,
      };
      setSiteSettings(newSettings);
      savePersistentSnapshot(sections, newSettings);

      // 2. Persist to Supabase site_settings table if configured
      if (isSupabaseConfigured && supabase && !isDemo) {
        const rowsToUpsert = [
          { key: "ogTitle", value: updatedFields.ogTitle },
          { key: "ogDescription", value: updatedFields.ogDescription },
          { key: "ogImage", value: updatedFields.ogImage },
          { key: "ogUrl", value: updatedFields.ogUrl },
        ];

        for (const row of rowsToUpsert) {
          const { error } = await supabase
            .from("site_settings")
            .upsert(row, { onConflict: "key" });

          if (error) {
            console.error(`Failed to save setting ${row.key}:`, error);
          }
        }
      }

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 4000);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMessage(err.message || "Failed to save social share settings.");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="admin-social-share-editor" className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="bg-[#121216] border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                Social Share / Open Graph (SEO)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800/60 text-purple-300">
                  Global Configuration
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 shrink-0"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : saveStatus === "success" ? (
              <>
                <Check className="w-4 h-4 text-white" />
                Saved Successfully!
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Save / Update Social Share
              </>
            )}
          </button>
        </div>

        {/* Status Messages */}
        {saveStatus === "success" && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Global social share settings updated! New link shares and social crawler requests will now receive these
              preview values.
            </span>
          </div>
        )}

        {saveStatus === "error" && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage || "An error occurred while saving. Please try again."}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Primary Fields */}
          <div className="bg-[#121216] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Globe className="w-4 h-4 text-purple-400" />
              Social Card Content
            </h3>

            {/* Field 1: Social Share Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-zinc-300">
                    1. Social Share Title <span className="text-purple-400">*</span>
                  </label>
                  {siteSettings.seoTitle && siteSettings.seoTitle !== ogTitle && (
                    <button
                      type="button"
                      onClick={() => setOgTitle(siteSettings.seoTitle || "")}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Sync with Meta Title"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Sync with Meta Title</span>
                    </button>
                  )}
                </div>
                <span
                  className={`text-[11px] font-mono ${
                    ogTitle.length > 70 ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {ogTitle.length} / 70 characters
                </span>
              </div>
              <input
                type="text"
                value={ogTitle}
                onChange={(e) => setOgTitle(e.target.value)}
                placeholder={siteSettings.seoTitle || "Rashed Pervej | Senior Visualizer Portfolio"}
                className="w-full bg-[#18181d] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>

            {/* Field 2: Social Share Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-zinc-300">
                    2. Social Share Description <span className="text-purple-400">*</span>
                  </label>
                  {siteSettings.seoDescription && siteSettings.seoDescription !== ogDescription && (
                    <button
                      type="button"
                      onClick={() => setOgDescription(siteSettings.seoDescription || "")}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      title="Sync with Meta Description"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Sync with Meta Description</span>
                    </button>
                  )}
                </div>
                <span
                  className={`text-[11px] font-mono ${
                    ogDescription.length > 165 ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {ogDescription.length} / 160 characters
                </span>
              </div>
              <textarea
                rows={3}
                value={ogDescription}
                onChange={(e) => setOgDescription(e.target.value)}
                placeholder={siteSettings.seoDescription || "Award-winning portfolio of Rashed Pervej, Senior Visualizer & Graphic Designer specializing in brand identity, packaging, and motion graphics."}
                className="w-full bg-[#18181d] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
              />
            </div>

            {/* Field 3: Website Canonical URL */}
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1.5 block">
                Website Domain / Canonical URL
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={ogUrl}
                  onChange={(e) => setOgUrl(e.target.value)}
                  placeholder={typeof window !== "undefined" && window.location?.origin ? `${window.location.origin}/` : "https://your-domain.com/"}
                  className="w-full bg-[#18181d] border border-zinc-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Card: Image Configuration */}
          <div className="bg-[#121216] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              3. Social Share Image (Open Graph)
            </h3>

            {/* Image URL Input */}
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1.5 block">
                Image Public URL / Path <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                value={ogImage}
                onChange={(e) => {
                  setOgImage(e.target.value);
                  setImageError(false);
                }}
                placeholder="/og-image.jpg or https://..."
                className="w-full bg-[#18181d] border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono"
              />
            </div>

            {/* Upload New Image Control */}
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1.5 block">
                Upload New Social Preview Image
              </label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-700/80 hover:border-purple-500/80 rounded-xl cursor-pointer bg-[#18181d]/50 hover:bg-[#18181d] transition-all">
                <div className="flex flex-col items-center justify-center pt-2 pb-2">
                  <Upload className="w-5 h-5 text-purple-400 mb-1" />
                  <p className="text-xs text-zinc-300 font-medium">
                    {isUploading ? "Uploading to Cloud Storage..." : "Click to upload image"}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">JPG, PNG, or WebP (Max 5MB, 1200×630px recommended)</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Select Presets */}
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                Or Select from Existing Portfolio Assets:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {presetImages.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setOgImage(preset.url);
                      setImageError(false);
                    }}
                    className={`text-left p-2.5 rounded-xl border text-[11px] transition-all ${
                      ogImage === preset.url
                        ? "bg-purple-950/40 border-purple-500/80 text-purple-300"
                        : "bg-[#18181d] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    <div className="font-medium truncate">{preset.label}</div>
                    <div className="text-[9px] text-zinc-500 truncate mt-0.5 font-mono">{preset.url}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Previews (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Live Social Preview Card */}
          <div className="bg-[#121216] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                Live Card Preview
              </h3>

              {/* Platform Selector Tabs */}
              <div className="flex items-center gap-1 bg-[#18181d] p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("facebook")}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    previewPlatform === "facebook" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("twitter")}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    previewPlatform === "twitter" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  X / Twitter
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform("linkedin")}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                    previewPlatform === "linkedin" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  LinkedIn
                </button>
              </div>
            </div>

            {/* Platform Mock Card Rendering */}
            {(() => {
              const liveImageUrl = resolveSocialImageUrl(ogImage);
              const liveHostname = getDisplayHostname(ogUrl);
              const liveTitle = ogTitle || siteSettings.seoTitle || "Rashed Pervej | Senior Visualizer Portfolio";
              const liveDescription =
                ogDescription ||
                siteSettings.seoDescription ||
                "Award-winning portfolio of Rashed Pervej, Senior Visualizer specializing in Brand Identity and Packaging.";

              return (
                <div className="bg-[#18181d] border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
                  {/* Image Preview Container */}
                  <div className="relative w-full aspect-[1.91/1] bg-zinc-900 overflow-hidden flex items-center justify-center">
                    {liveImageUrl && !imageError ? (
                      <img
                        key={liveImageUrl}
                        src={liveImageUrl}
                        alt="Social preview banner"
                        onError={() => {
                          console.warn("Live Preview image failed to load:", liveImageUrl);
                          setImageError(true);
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-500 p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-1.5 opacity-40" />
                        <span className="text-xs">No preview image available</span>
                        <span className="text-[10px] text-zinc-600 max-w-[280px] truncate mt-0.5">
                          {ogImage ? ogImage : "Please provide a valid image URL"}
                        </span>
                        {imageError && (
                          <button
                            type="button"
                            onClick={() => setImageError(false)}
                            className="mt-2 text-[10px] px-2.5 py-1 rounded-md bg-purple-900/60 hover:bg-purple-800 text-purple-200 transition-colors"
                          >
                            Retry Loading
                          </button>
                        )}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300 border border-white/10">
                      1200 × 630 (1.91:1)
                    </div>
                  </div>

                  {/* Text Container per Platform */}
                  <div className="p-3.5 space-y-1 bg-[#1e1e24]">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider truncate">
                      {liveHostname}
                    </div>
                    <div className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                      {liveTitle}
                    </div>
                    <div className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {liveDescription}
                    </div>
                  </div>
                </div>
              );
            })()}

            <p className="text-[10px] text-zinc-500 text-center">
              Simulated preview for {previewPlatform === "facebook" ? "Facebook & WhatsApp" : previewPlatform === "twitter" ? "X / Twitter Summary Large Image" : "LinkedIn & Slack"}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
