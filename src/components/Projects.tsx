import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { ExternalLink, Layers, Film, Award, BookOpen, ArrowUpRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { usePortfolio } from "../context/PortfolioContext";
import { Project } from "../data";
import FormattedText from "./FormattedText";

interface ProjectCardProps {
  project: Project;
  settings: any;
  isCarouselActive?: boolean;
}

function ProjectCard({ project, settings, isCarouselActive }: ProjectCardProps) {
  const { theme } = usePortfolio();
  const isLight = theme === "light";

  const hasVisibleTags = Boolean(
    settings.showProjectTags && project.tags && project.tags.length > 0
  );

  const carouselClass = isCarouselActive === true
    ? "carousel-card-active"
    : isCarouselActive === false
    ? "carousel-card-inactive"
    : "";

  return (
    <div
      className={`group relative rounded-2xl transition-all duration-300 flex flex-col justify-between h-full project-card ${carouselClass} ${
        isLight
          ? "project-card-light bg-white/80 hover:bg-white/95 border border-white/95 hover:border-purple-300 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_28px_-4px_rgba(124,58,237,0.12)] hover:-translate-y-1"
          : "project-card-dark bg-[#0e0f18]/90 hover:bg-[#141624]/95 border border-white/10 hover:border-purple-500/40 shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.6),0_0_16px_-2px_rgba(168,85,247,0.15)] hover:-translate-y-1"
      } backdrop-blur-xl`}
    >
      {/* Inner Container to isolate overflow-hidden for image & content clipping */}
      <div className="relative w-full h-full flex flex-col justify-between rounded-2xl overflow-hidden">
        {/* Image Section */}
        <div className="aspect-[4/3] w-full overflow-hidden relative bg-zinc-950 project-card-img-container">
        {/* Category Label Overlay */}
        {settings.showCategory && (
          <span className={`absolute top-4 left-4 z-20 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest font-mono backdrop-blur-md border ${
            isLight
              ? "bg-white/85 text-purple-700 border-white/95 shadow-sm font-semibold"
              : "bg-black/70 text-purple-300 border-white/10"
          }`}>
            {project.category}
          </span>
        )}

        {/* Image */}
        <img
          src={project.image}
          alt={project.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85 group-hover:opacity-100 project-card-image"
        />

        {/* Bottom shadow/gradient overlay for tags:
            - Rendered ONLY if visible tags exist.
            - Hidden on mobile devices.
            - On desktop, appears on hover behind the tags.
        */}
        {hasVisibleTags && (
          <div className="project-card-tag-overlay absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-10 hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}

        {/* Tech/Tag Pills inside overlay - hidden on mobile UI */}
        {hasVisibleTags && (
          <div className="absolute bottom-4 left-4 right-4 z-20 hidden sm:flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {project.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-purple-600/90 text-[9px] font-mono font-medium text-white shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between text-left">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`font-mono text-[10px] uppercase tracking-widest ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
              {settings.showYear ? `${project.year} // ${project.serviceProvided || "DESIGN PROJECT"}` : (project.serviceProvided || "DESIGN PROJECT")}
            </span>
          </div>

          <h3 className={`font-display font-semibold text-lg transition-colors duration-300 line-clamp-1 ${
            isLight
              ? "text-zinc-900 group-hover:text-purple-600"
              : "text-white group-hover:text-purple-300"
          }`}>
            <FormattedText content={project.title} />
          </h3>
          <div className={`text-xs sm:text-sm mt-2 line-clamp-3 font-sans leading-relaxed ${
            isLight ? "text-zinc-600" : "text-zinc-300"
          }`}>
            <FormattedText content={project.description} />
          </div>

          {/* Dynamic Project Metadata Fields */}
          {((settings.showClientName && project.clientName) || 
            (settings.showServices && project.serviceProvided) || 
            (settings.showToolsUsed && project.toolsUsed) || 
            (settings.showProjectDuration && project.projectDuration)) && (
            <div className={`mt-4 pt-4 border-t space-y-1.5 ${isLight ? "border-zinc-200/80" : "border-white/10"}`}>
              {settings.showClientName && project.clientName && (
                <div className="text-[11px] flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Client</span>
                  <span className={`font-medium ${isLight ? "text-zinc-700" : "text-zinc-200"}`}>{project.clientName}</span>
                </div>
              )}
              {settings.showServices && project.serviceProvided && (
                <div className="text-[11px] flex items-start justify-between gap-4 text-zinc-400">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider mt-0.5">Services</span>
                  <span className={`font-medium text-right line-clamp-1 ${isLight ? "text-zinc-700" : "text-zinc-200"}`}>{project.serviceProvided}</span>
                </div>
              )}
              {settings.showToolsUsed && project.toolsUsed && (
                <div className="text-[11px] flex items-start justify-between gap-4 text-zinc-400">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider mt-0.5">Tools</span>
                  <span className={`font-mono text-[10px] text-right line-clamp-1 ${isLight ? "text-zinc-700" : "text-zinc-200"}`}>{project.toolsUsed}</span>
                </div>
              )}
              {settings.showProjectDuration && project.projectDuration && (
                <div className="text-[11px] flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Duration</span>
                  <span className={`font-medium ${isLight ? "text-zinc-700" : "text-zinc-200"}`}>{project.projectDuration}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3 ${
          isLight ? "border-zinc-200/80" : "border-white/10"
        }`}>
          {settings.showAwardBadge && (project.awardBadge || "Award Quality") ? (
            <span className="font-mono text-[9px] text-purple-500 uppercase tracking-widest flex items-center gap-1.5 font-medium">
              <Award className="w-3.5 h-3.5 text-purple-500" />
              {project.awardBadge || "Award Quality"}
            </span>
          ) : <div />}
          
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {settings.showCaseStudyButton && project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all flex items-center gap-1 ${
                  isLight
                    ? "bg-purple-100 hover:bg-purple-200/80 border border-purple-200 text-purple-700 shadow-sm"
                    : "bg-purple-950/40 border border-purple-500/20 text-purple-300 hover:bg-purple-900/40"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Case Study
              </a>
            )}

            {settings.showLiveUrl && project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest transition-all ${
                  isLight ? "text-zinc-600 hover:text-purple-600" : "text-zinc-400 hover:text-white"
                }`}
              >
                Live
                <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
              </a>
            )}

            {settings.showBehanceUrl && (
              <a
                href={project.behanceUrl || project.link || "https://be.net/rashedpervej"}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest group-hover:translate-x-0.5 transition-all ${
                  isLight ? "text-zinc-600 hover:text-purple-600" : "text-zinc-400 hover:text-purple-400"
                }`}
              >
                Behance
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function MobileProjectsCarousel({
  filteredProjects,
  settings,
}: {
  filteredProjects: Project[];
  settings: any;
}) {
  const { theme } = usePortfolio();
  const isLight = theme === "light";
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    loop: true,
    dragThreshold: 8,
    skipSnaps: false,
    duration: 22,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  // Enhanced mobile touch/swipe sensitivity: short distance swipe smoothly advances slide
  useEffect(() => {
    if (!emblaApi) return;
    const node = emblaApi.rootNode();
    if (!node) return;

    let startX = 0;
    let startY = 0;
    let startIndex = 0;
    let isTracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startIndex = emblaApi.selectedScrollSnap();
      isTracking = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return;
      isTracking = false;

      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Minimum swipe distance (30px) and clean horizontal dominance (avoids accidental vertical scrolls & taps)
      const isHorizontalSwipe = Math.abs(diffX) >= 30 && Math.abs(diffX) > Math.abs(diffY) * 1.25;

      if (isHorizontalSwipe) {
        requestAnimationFrame(() => {
          if (!emblaApi) return;
          const currentIndex = emblaApi.selectedScrollSnap();
          // If Embla would have snapped back due to low drag distance, smoothly change slide
          if (currentIndex === startIndex) {
            if (diffX < 0) {
              emblaApi.scrollNext();
            } else {
              emblaApi.scrollPrev();
            }
          }
        });
      }
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
      emblaApi.scrollTo(0);
    }
  }, [filteredProjects, emblaApi]);

  const prefersReducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  return (
    <div ref={containerRef} className="block md:hidden edge-to-edge-carousel-container overflow-hidden">
      <motion.div
        animate={
          isInView && !hasPlayedIntro && !prefersReducedMotion
            ? { x: [0, -75, 0] }
            : { x: 0 }
        }
        transition={{
          duration: 1.4,
          ease: [0.25, 1, 0.5, 1],
          times: [0, 0.45, 1],
        }}
        onAnimationComplete={() => setHasPlayedIntro(true)}
      >
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y select-none -my-8 py-8 edge-to-edge-carousel-viewport">
          <div className="flex -ml-4">
            {filteredProjects.map((project, index) => (
              <div
                key={project.id}
                className="flex-[0_0_86%] sm:flex-[0_0_75%] min-w-0 pl-4 py-2 flex flex-col"
              >
                <ProjectCard
                  project={project}
                  settings={settings}
                  isCarouselActive={selectedIndex === index}
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Pagination Dots */}
      {filteredProjects.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {filteredProjects.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                selectedIndex === index
                  ? "w-7 bg-purple-600 shadow-sm shadow-purple-500/30"
                  : isLight
                  ? "w-2 bg-zinc-400/50 hover:bg-zinc-600/70"
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { portfolioData, siteSettings, theme } = usePortfolio();
  const isLight = theme === "light";
  const projects = portfolioData.projects;

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

  const allCategories = [
    { id: "All", label: "All", key: "showFilterAll" as const },
    { id: "Branding & Packaging", label: "Branding & Packaging", key: "showFilterBranding" as const },
    { id: "Motion Graphics", label: "Motion Graphics", key: "showFilterMotion" as const },
    { id: "Digital Marketing & Print", label: "Marketing & Print", key: "showFilterMarketing" as const },
    { id: "International Branding", label: "International", key: "showFilterInternational" as const },
  ];

  const visibleCategories = allCategories.filter((cat) => settings[cat.key] !== false);
  const showFilterBar = settings.showCategoryFilters !== false && visibleCategories.length > 0;

  useEffect(() => {
    if (visibleCategories.length > 0 && !visibleCategories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory(visibleCategories[0].id);
    }
  }, [visibleCategories, selectedCategory]);

  // Helper to normalize classifications
  const filteredProjects = selectedCategory === "All"
    ? projects
    : projects.filter((proj) => proj.category.toLowerCase().includes(selectedCategory.toLowerCase()) || selectedCategory.toLowerCase().includes(proj.category.toLowerCase()));

  return (
    <section id="projects" className={`py-10 sm:py-12 md:py-14 lg:py-16 relative overflow-hidden ${isLight ? "bg-transparent" : "bg-[#050508]"}`}>
      {/* Background radial highlight */}
      <div className={`absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none ${
        isLight ? "bg-purple-200/25" : "bg-purple-950/5"
      }`} />

      <div className="max-w-7xl mx-auto content-gutter relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-5 sm:mb-6 lg:mb-8"
        >
          <div className="flex flex-col items-start text-left">
            <h2 className={`font-display font-bold text-3xl sm:text-5xl tracking-tight ${isLight ? "text-zinc-950" : "text-white"}`}>
              Selected Works & <br />
              <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
                Visual Artifacts
              </span>
            </h2>
            <div className="w-12 h-[2px] bg-purple-500 mt-4" />
          </div>

          {/* Filters */}
          {showFilterBar && (
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-mono transition-all duration-300 border ${
                      isActive
                        ? "btn-keep-white bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/30 shadow-xs shadow-purple-600/20"
                        : isLight
                        ? "bg-white/65 hover:bg-white/90 text-zinc-600 hover:text-zinc-900 border-white/90 shadow-xs backdrop-blur-md"
                        : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Desktop / Tablet Projects Grid */}
        <motion.div
          layout
          className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-8 p-3 -m-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                key={project.id}
                className="h-full p-1"
              >
                <ProjectCard project={project} settings={settings} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Mobile Projects Carousel */}
        <MobileProjectsCarousel
          filteredProjects={filteredProjects}
          settings={settings}
        />

        {/* Showcase Bottom Banner - Custom Creative Solution with Branded 3D Glass Magnifying Glass */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className={`mt-8 sm:mt-10 lg:mt-12 relative overflow-hidden rounded-2xl md:rounded-[24px] transition-colors duration-300 flex flex-col sm:flex-row items-center justify-between min-h-[120px] gap-6 p-6 sm:py-5 sm:px-6 md:px-8 group ${
            isLight
              ? "bg-white/90 border border-purple-200/90 shadow-[0_8px_24px_-4px_rgba(168,85,247,0.08)] backdrop-blur-xl"
              : "bg-[#0c0d16]/90 border border-white/10 shadow-[0_8px_28px_-4px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          }`}
        >
          {/* Subtle dot pattern background / radial glow */}
          <div
            className={`absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none ${
              isLight ? "opacity-[0.04]" : "opacity-[0.08]"
            }`}
          />
          <div
            className={`absolute -left-10 -bottom-10 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
              isLight ? "bg-purple-400/20" : "bg-purple-600/15"
            }`}
          />

          {/* Left 3D Glass Magnifier Visual Area */}
          <div className="relative w-full sm:w-56 md:w-64 h-36 sm:h-32 flex-shrink-0 flex items-center justify-center sm:justify-start sm:pl-2 md:pl-4 overflow-visible">
            {/* Soft ambient violet aura glow underneath */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-6 top-1/2 -translate-y-1/2 w-28 h-28 sm:w-32 sm:h-32 rounded-full blur-2xl pointer-events-none ${
                isLight ? "bg-purple-400/25" : "bg-purple-500/25"
              }`}
            />

            {/* Concentric subtle background orbital rings */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-4 top-1/2 -translate-y-1/2 w-36 h-36 sm:w-40 sm:h-40 border rounded-full pointer-events-none ${
                isLight ? "border-purple-500/15" : "border-purple-500/10"
              }`}
            />
            <div
              className={`absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-8 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 border rounded-full pointer-events-none ${
                isLight ? "border-purple-500/20" : "border-purple-500/15"
              }`}
            />

            {/* Floating 3D Glass Magnifier Image */}
            <div className="relative z-10 w-32 sm:w-40 md:w-44 h-32 sm:h-40 md:h-44 flex items-center justify-center select-none transform transition-transform duration-500 group-hover:scale-105 group-hover:rotate-2">
              <img
                src="https://i.ibb.co.com/GQxxJ3Tc/magnify-glass-400px.webp"
                alt="Custom Creative Solution 3D Magnifying Glass"
                referrerPolicy="no-referrer"
                className={`w-full h-full object-contain ${
                  isLight
                    ? "drop-shadow-[0_8px_16px_rgba(168,85,247,0.18)]"
                    : "drop-shadow-[0_8px_20px_rgba(168,85,247,0.35)]"
                }`}
              />
            </div>
          </div>

          {/* Center Title Text */}
          <div className="flex-1 text-center sm:text-left px-2 sm:px-4 relative z-10">
            <h4
              className={`font-display font-bold text-2xl sm:text-3xl md:text-3xl lg:text-4xl tracking-tight leading-tight ${
                isLight ? "text-zinc-950" : "text-white"
              }`}
            >
              Looking for a custom creative solution?
            </h4>
          </div>

          {/* Right Action Button */}
          <div className="w-full sm:w-auto flex justify-center sm:justify-end flex-shrink-0 relative z-10">
            <a
              href="https://be.net/rashedpervej"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full sm:w-auto px-7 py-3 rounded-full font-medium text-sm sm:text-base tracking-wide transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 ${
                isLight
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20 hover:shadow-md hover:shadow-purple-600/30 border border-purple-500/30"
                  : "bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 hover:border-purple-400 text-white shadow-sm shadow-purple-950/40 hover:shadow-md hover:shadow-purple-500/25"
              }`}
            >
              Explore
              <ArrowUpRight
                className={`w-4 h-4 ${isLight ? "text-white" : "text-purple-300"}`}
              />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

