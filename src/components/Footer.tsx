import React from "react";
import { usePortfolio } from "../context/PortfolioContext";

export default function Footer() {
  const { portfolioData } = usePortfolio();
  const info = portfolioData.personalInfo;

  return (
    <footer className="bg-[#050508] border-t border-white/5 py-12 relative overflow-hidden text-zinc-400 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        
        {/* Brand/Signature */}
        <div className="space-y-2">
          <p className="font-display font-extrabold text-white text-lg tracking-tight">
            RASHED<span className="text-purple-500">.</span>PERVEJ
          </p>
          <p className="text-[11px] font-mono text-zinc-500 tracking-wider">
            SENIOR VISUALIZER // © {new Date().getFullYear()}
          </p>
        </div>


        {/* Meta & Links */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest hidden sm:inline">
            JASHORE, BD // UTC+6
          </span>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/admin");
              window.dispatchEvent(new Event("popstate"));
            }}
            className="text-[10px] font-mono text-zinc-500 hover:text-purple-400 uppercase tracking-widest transition-colors cursor-pointer mr-2"
            id="cms-portal-link"
          >
            [CMS]
          </a>
          <a
            href="/invoice-maker"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/invoice-maker");
              window.dispatchEvent(new Event("popstate"));
            }}
            className="text-[10px] font-mono text-zinc-500 hover:text-purple-400 uppercase tracking-widest transition-colors cursor-pointer mr-2"
            id="inv-maker-link"
          >
            [Inv Maker]
          </a>
        </div>
      </div>
    </footer>
  );
}
