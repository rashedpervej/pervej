import React from "react";
import { motion } from "motion/react";
import { SectionRecord } from "../context/PortfolioContext";
import * as Icons from "lucide-react";

interface DynamicSectionProps {
  section: SectionRecord;
  isPreview?: boolean;
  key?: string;
}

export default function DynamicSection({ section, isPreview = false }: DynamicSectionProps) {
  const content = isPreview
    ? section.draft_content || section.published_content
    : section.published_content;

  if (!content) return null;

  // Resolve Lucide icon dynamically if defined
  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const LucideIcon = (Icons as any)[iconName];
    if (!LucideIcon) return <Icons.Sparkles className="w-5 h-5 text-purple-400" />;
    return <LucideIcon className="w-5 h-5 text-purple-400" />;
  };

  return (
    <section id={section.key} className="py-24 relative border-t border-zinc-900">
      {/* Decorative Gradient Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-purple-950/5 to-[#030303] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs tracking-widest text-purple-400 uppercase">
              {section.name}
            </span>
            <div className="h-[1px] w-8 bg-purple-500/30" />
          </div>
          <h2 className="text-4xl md:text-5xl font-sans font-medium tracking-tight text-white mb-4">
            {content.title || section.name}
          </h2>
          {content.subtitle && (
            <p className="text-zinc-400 max-w-2xl font-light text-lg">
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
                className="group relative bg-[#070707] border border-zinc-800/60 rounded-xl p-6 hover:border-purple-500/40 hover:bg-zinc-900/10 transition-all duration-300 overflow-hidden"
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
                      <span className="inline-block text-[10px] font-mono tracking-widest text-purple-400 uppercase bg-purple-950/30 border border-purple-500/20 px-2 py-0.5 rounded mb-2">
                        {item.badge}
                      </span>
                    )}
                    <h3 className="text-xl font-medium text-white group-hover:text-purple-300 transition-colors">
                      {item.title}
                    </h3>
                  </div>
                  {renderIcon(item.icon)}
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-sm text-zinc-400 font-light leading-relaxed mb-4">
                    {item.description}
                  </p>
                )}

                {/* List tags */}
                {Array.isArray(item.tags) && (
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {item.tags.map((tag: string, tagIdx: number) => (
                      <span
                        key={tagIdx}
                        className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded"
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
                    className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-4 font-mono transition-colors"
                  >
                    Explore <Icons.ArrowUpRight className="w-3.5 h-3.5" />
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
            className="bg-[#070707] border border-zinc-800/60 rounded-2xl p-8 md:p-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className={`${content.image ? "lg:col-span-7" : "lg:col-span-12"} space-y-6`}>
                {content.tagline && (
                  <span className="text-xs font-mono text-purple-400 tracking-wider uppercase">
                    {content.tagline}
                  </span>
                )}
                {content.body && (
                  <div className="text-zinc-300 font-light text-lg leading-relaxed space-y-4">
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-800 text-sm font-medium rounded-lg text-white transition-all duration-300"
                  >
                    {content.linkText} <Icons.ChevronRight className="w-4 h-4" />
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
