import React from "react";
import { portfolioData } from "../data";
import { Palette, Box, Film, ShieldAlert, ArrowUpRight, HelpCircle } from "lucide-react";

export default function Services() {
  const services = portfolioData.services;

  const getServiceIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Palette className="w-6 h-6 text-purple-400" />;
      case 1:
        return <Box className="w-6 h-6 text-indigo-400" />;
      case 2:
        return <Film className="w-6 h-6 text-pink-400" />;
      default:
        return <ShieldAlert className="w-6 h-6 text-emerald-400" />;
    }
  };

  return (
    <section id="services" className="py-24 bg-[#030303] relative overflow-hidden">
      {/* Decorative Orb */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-80 h-80 rounded-full bg-purple-900/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Title */}
        <div className="flex flex-col items-start mb-16 text-left">
          <span className="font-mono text-xs uppercase tracking-widest text-purple-400 mb-2">
            05 // Offerings
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Professional Services & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
              Creative Disciplines
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl bg-[#0c0c12]/40 border border-white/5 hover:border-purple-500/20 transition-all duration-500 group flex flex-col justify-between text-left"
            >
              <div>
                {/* Header Icon + Number */}
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-purple-600/10 group-hover:border-purple-500/30 transition-all duration-300">
                    {getServiceIcon(index)}
                  </div>
                  <span className="font-mono text-xs text-zinc-600">
                    // 0{index + 1}
                  </span>
                </div>

                {/* Content */}
                <h3 className="font-display font-semibold text-xl text-white group-hover:text-purple-300 transition-colors mb-3">
                  {service.title}
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
                  {service.description}
                </p>
              </div>

              {/* Skills/Bullets list */}
              <div>
                <div className="w-full h-[1px] bg-white/5 my-4" />
                <div className="flex flex-wrap gap-2">
                  {service.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2.5 py-1 rounded-md bg-white/[0.02] border border-white/5 text-[10px] font-mono text-zinc-300 group-hover:bg-purple-500/10 group-hover:text-purple-300 group-hover:border-purple-500/10 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
