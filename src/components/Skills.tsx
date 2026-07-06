import React from "react";
import { portfolioData } from "../data";
import { Check, Cpu, Award, Zap, Code, Shield } from "lucide-react";

export default function Skills() {
  const skillsData = portfolioData.skills;

  const getCompetencyIcon = (index: number) => {
    switch (index % 5) {
      case 0: return <Award className="w-4 h-4 text-purple-400" />;
      case 1: return <Zap className="w-4 h-4 text-amber-400" />;
      case 2: return <Cpu className="w-4 h-4 text-sky-400" />;
      case 3: return <Code className="w-4 h-4 text-emerald-400" />;
      default: return <Shield className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <section id="skills" className="py-24 bg-[#050508] relative overflow-hidden">
      {/* Decorative Blur elements */}
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-purple-950/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Title */}
        <div className="flex flex-col items-start mb-16 text-left">
          <span className="font-mono text-xs uppercase tracking-widest text-purple-400 mb-2">
            04 // Competencies
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Craftsmanship & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              Technical Expertise
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Core Competencies */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0c0c12]/50 border border-white/5">
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-white mb-6">
                Core Competencies
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {skillsData.coreCompetencies.map((comp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-all duration-300"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                      {getCompetencyIcon(idx)}
                    </div>
                    <span className="font-display text-sm text-zinc-200 font-medium">
                      {comp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quick Tip Box */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-950/20 to-[#07070a] border border-purple-500/15 text-left">
              <span className="font-mono text-[10px] text-purple-400 uppercase tracking-widest block mb-1">
                Visual Artistry Principle
              </span>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Rashed integrates modern generative AI tooling directly into standard Adobe production dielines, accelerating iteration times by up to 40% while preserving absolute pre-press layout precision.
              </p>
            </div>
          </div>

          {/* Right Column: Creative Tools */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0c0c12]/50 border border-white/5 text-left">
              <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-white mb-8">
                Creative Tools & Software Proficiency
              </h3>

              <div className="space-y-6">
                {skillsData.creativeTools.map((tool, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="font-display font-medium text-zinc-200">
                        {tool.name}
                      </span>
                      <span className="font-mono text-xs text-purple-400 font-semibold">
                        {tool.level}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${tool.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
