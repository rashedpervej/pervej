import React from "react";
import { motion } from "motion/react";
import { SectionRecord, usePortfolio } from "../context/PortfolioContext";
import {
  Sparkles,
  Folder,
  Briefcase,
  Award,
  Star,
  Layers,
  Globe,
  Heart,
  ExternalLink,
  FileText,
  CheckCircle2,
  Zap,
  Compass,
  Code,
  Monitor,
  Smartphone,
  Palette,
  Package,
  Box,
  Camera,
  Video,
  Users,
  Target,
  Shield,
  Tag,
  Cpu,
  Bookmark,
  ArrowUpRight,
  ChevronRight,
  LucideIcon
} from "lucide-react";

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Sparkles,
  Folder,
  Briefcase,
  Award,
  Star,
  Layers,
  Globe,
  Heart,
  ExternalLink,
  FileText,
  CheckCircle2,
  Zap,
  Compass,
  Code,
  Monitor,
  Smartphone,
  Palette,
  Package,
  Box,
  Camera,
  Video,
  Users,
  Target,
  Shield,
  Tag,
  Cpu,
  Bookmark,
};

interface DynamicSectionProps {
  section: SectionRecord;
  isPreview?: boolean;
  key?: string;
}

export default function DynamicSection({ section, isPreview = false }: DynamicSectionProps) {
  const { theme } = usePortfolio();
  const isLight = theme === "light";
  const content = isPreview
    ? section.draft_content || section.published_content
    : section.published_content;

  if (!content) return null;

  // Resolve Lucide icon from curated icon registry with fallback
  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const SelectedIcon = ICON_REGISTRY[iconName] || Sparkles;
    return <SelectedIcon className={`w-5 h-5 ${isLight ? "text-purple-600" : "text-purple-400"}`} />;
  };

  return (
    <section id={section.key} className={`py-10 sm:py-12 md:py-14 lg:py-16 relative border-t ${isLight ? "border-zinc-200/80 bg-transparent" : "border-zinc-900"}`}>
      {/* Decorative Gradient Background glow */}
      {!isLight && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-purple-950/5 to-[#030303] pointer-events-none" />
      )}

      <div className="max-w-7xl mx-auto content-gutter relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-5 sm:mb-6 lg:mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-mono text-xs tracking-widest uppercase ${isLight ? "text-purple-600 font-semibold" : "text-purple-400"}`}>
              {section.name}
            </span>
            <div className={`h-[1px] w-8 ${isLight ? "bg-purple-300" : "bg-purple-500/30"}`} />
          </div>
          <h2 className={`text-4xl md:text-5xl font-sans font-medium tracking-tight mb-4 ${isLight ? "text-zinc-950" : "text-white"}`}>
            {content.title || section.name}
          </h2>
          {content.subtitle && (
            <p className={`max-w-2xl font-light text-lg ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              {content.subtitle}
            </p>
          )}
        </motion.div>

        {/* Section Content */}
        {section.type === "collection" ? (
          // Grid layout for collections (like grids of projects/services)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(Array.isArray(content) ? content : Array.isArray(content.items) ? content.items : []).map((item: any, idx: number) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`group relative rounded-2xl p-6 transition-all duration-300 overflow-hidden ${
                  isLight
                    ? "bg-white/65 hover:bg-white/85 border border-white/90 hover:border-purple-300 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-4px_rgba(124,58,237,0.08)] backdrop-blur-xl"
                    : "bg-[#070707] border border-zinc-800/60 hover:border-purple-500/40 hover:bg-zinc-900/10 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)]"
                }`}
              >
                {/* Image if available */}
                {item.image && (
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-5 bg-zinc-950">
                    <img
                      src={item.image}
                      alt={item.title || "Section item"}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Header elements */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {item.badge && (
                      <span className={`inline-block text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded mb-2 border ${
                        isLight
                          ? "text-purple-700 bg-purple-100 border-purple-200"
                          : "text-purple-400 bg-purple-950/30 border-purple-500/20"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    <h3 className={`text-xl font-medium transition-colors ${
                      isLight ? "text-zinc-900 group-hover:text-purple-700" : "text-white group-hover:text-purple-300"
                    }`}>
                      {item.title}
                    </h3>
                  </div>
                  {renderIcon(item.icon)}
                </div>

                {/* Description */}
                {item.description && (
                  <p className={`text-sm font-light leading-relaxed mb-4 ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                    {item.description}
                  </p>
                )}

                {/* List tags */}
                {Array.isArray(item.tags) && (
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {item.tags.map((tag: string, tagIdx: number) => (
                      <span
                        key={tagIdx}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          isLight ? "text-zinc-700 bg-white/80 border border-purple-200/50" : "text-zinc-500 bg-zinc-900"
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* External link */}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-xs mt-4 font-mono transition-colors ${
                      isLight ? "text-purple-700 hover:text-purple-900" : "text-purple-400 hover:text-purple-300"
                    }`}
                  >
                    Explore <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          // Content Block layout for single object/text models (like an additional bio block)
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`rounded-2xl p-8 md:p-12 ${
              isLight
                ? "bg-white/65 border border-white/90 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl"
                : "bg-[#070707] border border-zinc-800/60 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)]"
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className={`${content.image ? "lg:col-span-7" : "lg:col-span-12"} space-y-6`}>
                {content.tagline && (
                  <span className={`text-xs font-mono tracking-wider uppercase ${isLight ? "text-purple-600 font-semibold" : "text-purple-400"}`}>
                    {content.tagline}
                  </span>
                )}
                {content.body && (
                  <div className={`font-light text-lg leading-relaxed space-y-4 ${isLight ? "text-zinc-700" : "text-zinc-300"}`}>
                    {typeof content.body === "string" ? (
                      <p>{content.body}</p>
                    ) : (
                      content.body.map((para: string, idx: number) => <p key={idx}>{para}</p>)
                    )}
                  </div>
                )}

                {/* Optional links */}
                {content.linkText && content.linkUrl && (
                  <a
                    href={content.linkUrl}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                      isLight
                        ? "bg-white/80 hover:bg-white border border-white/90 text-zinc-900 shadow-sm"
                        : "bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-800 text-white"
                    }`}
                  >
                    {content.linkText} <ChevronRight className="w-4 h-4" />
                  </a>
                )}
              </div>

              {content.image && (
                <div className="lg:col-span-5 relative aspect-square md:aspect-video lg:aspect-square w-full rounded-xl overflow-hidden bg-zinc-950">
                  <img
                    src={content.image}
                    alt={content.title || "Section image"}
                    className="object-cover w-full h-full hover:scale-102 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
