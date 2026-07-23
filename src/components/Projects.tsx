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
}

function ProjectCard({ project, settings }: ProjectCardProps) {
  return (
    <div className="group relative rounded-2xl overflow-hidden bg-[#0c0c12]/60 border border-white/5 hover:border-purple-500/20 shadow-xl transition-all duration-300 flex flex-col justify-between h-full">
      {/* Image Section */}
      <div className="aspect-[4/3] w-full overflow-hidden relative bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-60 z-10" />
        
        {/* Category Label Overlay */}
        {settings.showCategory && (
          <span className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[9px] uppercase tracking-widest font-mono text-purple-300">
            {project.category}
          </span>
        )}

        {/* Image */}
        <img
          src={project.image}
          alt={project.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
        />

        {/* Tech/Tag Pills inside overlay - hidden on mobile UI */}
        {settings.showProjectTags && project.tags && project.tags.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 z-20 hidden sm:flex flex-wrap gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {project.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-purple-600/90 text-[9px] font-mono font-medium text-white">
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
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
              {settings.showYear ? `${project.year} // ${project.serviceProvided || "DESIGN PROJECT"}` : (project.serviceProvided || "DESIGN PROJECT")}
            </span>
          </div>

          <h3 className="font-display font-semibold text-lg text-white group-hover:text-purple-300 transition-colors duration-300 line-clamp-1">
            <FormattedText content={project.title} />
          </h3>
          <div className="text-zinc-400 text-xs sm:text-sm mt-2 line-clamp-3 font-sans leading-relaxed">
            <FormattedText content={project.description} />
          </div>

          {/* Dynamic Project Metadata Fields */}
          {((settings.showClientName && project.clientName) || 
            (settings.showServices && project.serviceProvided) || 
            (settings.showToolsUsed && project.toolsUsed) || 
            (settings.showProjectDuration && project.projectDuration)) && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
              {settings.showClientName && project.clientName && (
                <div className="text-[11px] flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Client</span>
                  <span className="text-zinc-300 font-medium">{project.clientName}</span>
                </div>
              )}
              {settings.showServices && project.serviceProvided && (
                <div className="text-[11px] flex items-start justify-between gap-4 text-zinc-400">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider mt-0.5">Services</span>
                  <span className="text-zinc-300 font-medium text-right line-clamp-1">{project.serviceProvided}</span>
                </div>
              )}
              {settings.showToolsUsed && project.toolsUsed && (
                <div className="text-[11px] flex items-start justify-between gap-4 text-zinc-400">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider mt-0.5">Tools</span>
                  <span className="text-zinc-300 font-mono text-[10px] text-right line-clamp-1">{project.toolsUsed}</span>
                </div>
              )}
              {settings.showProjectDuration && project.projectDuration && (
                <div className="text-[11px] flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Duration</span>
                  <span className="text-zinc-300 font-medium">{project.projectDuration}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
          {settings.showAwardBadge && (project.awardBadge || "Award Quality") ? (
            <span className="font-mono text-[9px] text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              {project.awardBadge || "Award Quality"}
            </span>
          ) : <div />}
          
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {settings.showCaseStudyButton && project.link && (
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-purple-950/40 border border-purple-500/20 text-[10px] font-mono uppercase tracking-widest text-purple-300 hover:bg-purple-900/40 transition-all flex items-center gap-1"
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
                className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
              >
                Live
                <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              </a>
            )}

            {settings.showBehanceUrl && (
              <a
                href={project.behanceUrl || project.link || "https://be.net/rashedpervej"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-zinc-400 hover:text-purple-400 group-hover:translate-x-0.5 transition-all"
              >
                Behance
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
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
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.2 });
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    loop: true,
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
    <div ref={containerRef} className="block md:hidden w-full overflow-hidden">
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
        <div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing py-2">
          <div className="flex -ml-3">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex-[0_0_85%] min-w-0 pl-3 flex flex-col"
              >
                <ProjectCard project={project} settings={settings} />
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
                  ? "w-7 bg-purple-500 shadow-md shadow-purple-500/50"
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
  const { portfolioData, siteSettings } = usePortfolio();
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
    <section id="projects" className="py-24 bg-[#050508] relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-950/5 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="flex flex-col items-start text-left">
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
              Selected Works & <br />
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Visual Artifacts
              </span>
            </h2>
            <div className="w-12 h-[2px] bg-purple-500 mt-4" />
          </div>

          {/* Filters */}
          {showFilterBar && (
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-mono transition-all duration-300 border ${
                    selectedCategory === cat.id
                      ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-950/40"
                      : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop / Tablet Projects Grid */}
        <motion.div
          layout
          className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-8"
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
        <div className="mt-16 relative overflow-hidden rounded-[20px] bg-[#07060c] border border-white/10 shadow-2xl flex flex-col sm:flex-row items-center justify-between min-h-[120px] gap-6 p-4 sm:p-0 group">
          {/* Subtle dot pattern background / radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.08] pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Left 3D Glass Magnifier Visual Area */}
          <div className="relative w-full sm:w-64 md:w-72 h-40 sm:h-32 flex-shrink-0 flex items-center justify-center sm:justify-start sm:pl-8 overflow-visible">
            {/* Soft ambient violet aura glow underneath */}
            <div className="absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500/25 rounded-full blur-2xl pointer-events-none" />

            {/* Concentric subtle background orbital rings matching reference */}
            <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-40 h-40 border border-purple-500/10 rounded-full pointer-events-none" />
            <div className="absolute left-10 sm:left-12 top-1/2 -translate-y-1/2 w-28 h-28 border border-purple-500/15 rounded-full pointer-events-none" />

            {/* Floating 3D Glass Magnifier Image */}
            <div className="relative z-10 w-36 sm:w-44 md:w-48 h-36 sm:h-44 md:h-48 flex items-center justify-center select-none">
              <img
                src="https://i.ibb.co.com/GQxxJ3Tc/magnify-glass-400px.webp"
                alt="Custom Creative Solution 3D Magnifying Glass"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain drop-shadow-[0_12px_28px_rgba(168,85,247,0.5)]"
              />
            </div>
          </div>

          {/* Center Title Text */}
          <div className="flex-1 text-center sm:text-left px-2 sm:px-4 py-2 sm:py-0 relative z-10">
            <h4 className="font-display font-semibold text-xl sm:text-2xl md:text-[22px] text-white tracking-tight leading-snug">
              Looking for a custom creative solution?
            </h4>
          </div>

          {/* Right Action Button */}
          <div className="flex-shrink-0 sm:mr-8 mb-3 sm:mb-0 relative z-10">
            <a
              href="https://be.net/rashedpervej"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 hover:border-purple-400 text-white font-medium text-sm sm:text-base tracking-wide transition-all duration-300 shadow-lg shadow-purple-950/40 flex items-center gap-2 active:scale-95"
            >
              Explore
              <ArrowUpRight className="w-4 h-4 text-purple-300" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

