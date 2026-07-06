import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, MapPin, ChevronDown, ChevronUp, Briefcase } from "lucide-react";
import { portfolioData } from "../data";

export default function Experience() {
  const experiences = portfolioData.experiences;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // First expanded by default

  const toggleExpand = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(index);
    }
  };

  return (
    <section id="experience" className="py-24 bg-[#030303] relative overflow-hidden">
      {/* Decorative Orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-purple-950/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Title */}
        <div className="flex flex-col items-start mb-16 text-left">
          <span className="font-mono text-xs uppercase tracking-widest text-purple-400 mb-2">
            02 // History
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Work Experience & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              Creative Milestones
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        {/* Timeline container */}
        <div className="relative max-w-4xl mx-auto pl-4 sm:pl-8 border-l border-zinc-800 space-y-8">
          {experiences.map((item, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div key={index} className="relative group">
                {/* Bullet Icon */}
                <div className={`absolute -left-[21px] sm:-left-[37px] top-1 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  isExpanded
                    ? "bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-110"
                    : "bg-[#0c0c10] border-zinc-800 text-zinc-400 group-hover:border-zinc-700"
                }`}>
                  <Briefcase className="w-3.5 h-3.5" />
                </div>

                {/* Main Card */}
                <div
                  onClick={() => toggleExpand(index)}
                  className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 border text-left ${
                    isExpanded
                      ? "bg-white/[0.04] border-purple-500/30 shadow-lg"
                      : "bg-[#07070b] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      {/* Role & Company */}
                      <h3 className="font-display font-semibold text-lg sm:text-xl text-white">
                        {item.role}{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 font-medium">
                          @ {item.company}
                        </span>
                      </h3>

                      {/* Meta links */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-1.5 font-sans">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-400" />
                          {item.period}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                          {item.location}
                        </span>
                        {item.type && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-[10px] uppercase tracking-wider text-purple-300 font-mono border border-purple-500/10">
                            {item.type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <div className="self-end sm:self-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-purple-400" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Description - Expanded with motion layout */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pt-6 border-t border-white/5 mt-5 space-y-3">
                          {item.description.map((bullet, idx) => (
                            <div key={idx} className="flex gap-2 items-start text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
                              <span className="text-purple-400 mt-1.5 shrink-0">■</span>
                              <span>{bullet}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
