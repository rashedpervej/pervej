import React from "react";
import { motion } from "motion/react";
import { GraduationCap, Award, Shield, FileCheck, CheckCircle2 } from "lucide-react";
import { portfolioData } from "../data";

export default function About() {
  const info = portfolioData.personalInfo;
  const certs = portfolioData.educationCertifications;

  const highlights = [
    {
      icon: Award,
      title: "6+ Years Design Ops",
      desc: "Delivering strategic brand visualizers for national & international companies."
    },
    {
      icon: Shield,
      title: "Security Minded",
      desc: "Conducted annual InfoSec training to safeguard intellectual assets and brand guidelines."
    },
    {
      icon: FileCheck,
      title: "Print-Ready Precision",
      desc: "Delivering complete, flawless packaging artwork and complex physical labels."
    }
  ];

  return (
    <section id="about" className="py-24 bg-[#050508] relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-900/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Title */}
        <div className="flex flex-col items-start mb-16 text-left">
          <span className="font-mono text-xs uppercase tracking-widest text-purple-400 mb-2">
            01 // About Me
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Creative Strategy & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              Visual Narrative
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Side: Summary & Details */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="font-display font-medium text-xl sm:text-2xl text-zinc-100">
              "Visuals aren't just seen; they are experienced."
            </h3>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              {info.aboutSummary}
            </p>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              {info.aboutDetail}
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={index}
                    className="p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 group hover:border-purple-500/20 transition-colors duration-300"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/10">
                      <Icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-xs sm:text-sm text-zinc-200 uppercase tracking-wide">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Education & Certifications */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl glass-panel border border-white/10 space-y-6">
              <h4 className="font-display font-medium text-base text-white tracking-wide uppercase flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                Education & Certs
              </h4>
              <div className="w-full h-[1px] bg-white/10" />

              <div className="space-y-6">
                {certs.map((item, index) => (
                  <div key={index} className="flex gap-4 items-start relative group">
                    {/* Circle Bullet */}
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1.5 shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.5)] group-hover:scale-125 transition-transform" />
                    
                    <div>
                      <h5 className="font-display font-medium text-xs sm:text-sm text-zinc-200 leading-tight">
                        {item.title}
                      </h5>
                      <p className="font-sans text-xs text-zinc-400 mt-1">
                        {item.institution}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-500 mt-1">
                        {item.period}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Languages Highlight */}
              <div className="pt-4 border-t border-white/5">
                <h5 className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
                  LANGUAGES & PROFICIENCY
                </h5>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span className="font-sans text-xs text-zinc-300">
                    English — Professional proficiency for global teams
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
