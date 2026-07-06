import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Layers, Film, Award, BookOpen, ArrowUpRight } from "lucide-react";
import { portfolioData, Project } from "../data";

export default function Projects() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const projects = portfolioData.projects;

  const categories = ["All", "Branding & Packaging", "Motion Graphics", "Digital Marketing & Print", "International Branding"];

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
            <span className="font-mono text-xs uppercase tracking-widest text-purple-400 mb-2">
              03 // Showcase
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
              Selected Works & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                Visual Artifacts
              </span>
            </h2>
            <div className="w-12 h-[2px] bg-purple-500 mt-4" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-mono transition-all duration-300 border ${
                  selectedCategory === cat
                    ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-950/40"
                    : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat === "Digital Marketing & Print" ? "Marketing & Print" : cat === "International Branding" ? "International" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
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
                className="group relative rounded-2xl overflow-hidden bg-[#0c0c12]/40 border border-white/5 hover:border-purple-500/20 shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Image Section */}
                <div className="aspect-[4/3] w-full overflow-hidden relative bg-zinc-950">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-60 z-10" />
                  
                  {/* Category Label Overlay */}
                  <span className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[9px] uppercase tracking-widest font-mono text-purple-300">
                    {project.category}
                  </span>

                  {/* Image */}
                  <img
                    src={project.image}
                    alt={project.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                  />

                  {/* Tech/Tag Pills inside overlay */}
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {project.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-purple-600/90 text-[9px] font-mono font-medium text-white">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-6 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                        {project.year} // DESIGN PROJECT
                      </span>
                      <span className="text-zinc-600 font-mono text-xs">#{project.id}</span>
                    </div>

                    <h3 className="font-display font-semibold text-lg text-white group-hover:text-purple-300 transition-colors duration-300 line-clamp-1">
                      {project.title}
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-2 line-clamp-3 font-sans leading-relaxed">
                      {project.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="font-mono text-[9px] text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-purple-400" />
                      Award Quality
                    </span>
                    
                    <a
                      href="https://be.net/rashedpervej"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white group-hover:translate-x-0.5 transition-all"
                    >
                      View Behance
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Showcase Bottom Banner */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-tr from-[#0b0c13] to-[#040406] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div>
            <h4 className="font-display font-semibold text-lg text-white">
              Looking for a custom creative solution?
            </h4>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Explore Rashed's complete visual design archive featuring branding, motion posters, interactive social campaigns, and premium packaging concepts.
            </p>
          </div>
          <a
            href="https://be.net/rashedpervej"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            Explore Complete Behance
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </a>
        </div>
      </div>
    </section>
  );
}
