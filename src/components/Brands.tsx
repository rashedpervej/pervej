import React from "react";
import { usePortfolio } from "../context/PortfolioContext";
import { Star } from "lucide-react";

export default function Brands() {
  const { portfolioData } = usePortfolio();
  const brands = portfolioData.selectedBrands;

  return (
    <section className="py-16 bg-[#030303] border-y border-white/5 relative overflow-hidden">
      {/* Absolute faint lighting */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-32 bg-purple-500/5 blur-[50px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500 text-center mb-8">
          SELECTED BRANDS & COLLABORATORS
        </p>

        {/* Dynamic Horizontal Ticker Marquee */}
        <div className="relative w-full overflow-hidden py-4">
          <div className="flex gap-16 items-center animate-[marquee_25s_linear_infinite] whitespace-nowrap min-w-full">
            {/* Duplicate array to create endless scroll */}
            {[...brands, ...brands].map((brand, index) => (
              <div
                key={index}
                className="flex items-center gap-3 shrink-0 select-none group"
              >
                <Star className="w-3.5 h-3.5 text-purple-500 opacity-40 group-hover:rotate-45 transition-transform duration-300" />
                <span className="font-display font-medium text-lg sm:text-xl text-zinc-400 group-hover:text-white transition-colors duration-200 tracking-tight">
                  {brand.logoText}
                </span>
                {brand.market && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-500 border border-white/5 uppercase">
                    {brand.market}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Static Grid on Mobile, nicely structured */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-12 pt-8 border-t border-white/5">
          {brands.slice(0, 11).map((brand, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-purple-500/20 text-center transition-all duration-300 group"
            >
              <p className="font-display font-medium text-xs sm:text-sm text-zinc-300 group-hover:text-white">
                {brand.name}
              </p>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-1 block">
                {brand.market || "Local Client"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Custom marquee keyframes if they are not inside Tailwind, we will inject a style tag */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </section>
  );
}
