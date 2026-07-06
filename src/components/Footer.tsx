import React from "react";
import { ArrowUp, Star, Heart } from "lucide-react";
import { portfolioData } from "../data";

export default function Footer() {
  const info = portfolioData.personalInfo;

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#050508] border-t border-white/5 py-12 relative overflow-hidden text-zinc-400 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        
        {/* Brand/Signature */}
        <div className="space-y-2">
          <p className="font-display font-extrabold text-white text-lg tracking-tight">
            RASHED<span className="text-purple-500">.</span>P
          </p>
          <p className="text-[11px] font-mono text-zinc-500 tracking-wider">
            SENIOR VISUALIZER & ART DIRECTOR // © {new Date().getFullYear()}
          </p>
        </div>

        {/* Made with love credit */}
        <div className="flex items-center gap-1.5 font-sans text-xs text-zinc-500">
          <span>Made for</span>
          <span className="font-semibold text-zinc-300">Rashed Pervej</span>
          <span>from Bangladesh</span>
          <Star className="w-3.5 h-3.5 text-purple-500 fill-purple-500/10 animate-pulse" />
        </div>

        {/* Back to top & meta */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest hidden sm:inline">
            JASHORE, BD // UTC+6
          </span>
          <button
            onClick={handleBackToTop}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white transition-all active:scale-90"
            title="Back to Top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
