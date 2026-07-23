import React from "react";
import { usePortfolio } from "../context/PortfolioContext";
import { Palette, Box, Film, ShieldAlert, ArrowUpRight, HelpCircle } from "lucide-react";
import FormattedText from "./FormattedText";

export default function Services() {
  const { portfolioData } = usePortfolio();
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
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Professional Services & <br />
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
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
              className="rounded-2xl bg-[#0c0c12]/40 border border-white/5 hover:border-purple-500/20 transition-all duration-500 group flex flex-col justify-between text-left overflow-hidden h-full"
            >
              <div>
                {/* Premium Image Banner at the top of the card */}
                <div className="relative w-full h-[155px] overflow-hidden bg-zinc-900 border-b border-white/5">
                  {service.image ? (
                    <img
                      src={service.image}
                      alt={service.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-950/20 to-indigo-950/20 flex items-center justify-center">
                      <span className="text-zinc-600 font-mono text-[10px] uppercase tracking-wider">No cover image</span>
                    </div>
                  )}

                  {/* Overlaid Icon (bottom-left of the image banner) */}
                  <div className="absolute bottom-3 left-4 w-10 h-10 rounded-xl bg-black/80 flex items-center justify-center border border-white/15 shadow-lg group-hover:bg-purple-600/10 group-hover:border-purple-500/30 transition-all duration-300 backdrop-blur-sm">
                    {getServiceIcon(index)}
                  </div>
                </div>

                {/* Content Area with custom padding */}
                <div className="p-6 sm:p-8">
                  <h3 className="font-display font-semibold text-xl text-white group-hover:text-purple-300 transition-colors mb-3">
                    <FormattedText content={service.title} />
                  </h3>
                  <div className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-1">
                    <FormattedText content={service.description} />
                  </div>
                </div>
              </div>

              {/* Skills/Bullets list, positioned at the bottom of the card */}
              <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                <div className="w-full h-[1px] bg-white/5 mb-4" />
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
