import React from "react";
import { usePortfolio } from "../context/PortfolioContext";

export default function Footer() {
  const { portfolioData, theme } = usePortfolio();
  const isLight = theme === "light";
  const info = portfolioData.personalInfo;

  return (
    <footer className={`border-t py-6 sm:py-8 lg:py-9 relative overflow-hidden text-xs sm:text-sm ${
      isLight ? "bg-transparent border-zinc-200/80 text-zinc-600" : "bg-[#050508] border-white/5 text-zinc-400"
    }`}>
      <div className="max-w-7xl mx-auto content-gutter relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-center md:text-left">
        
        {/* Brand/Signature */}
        <div className="space-y-2">
          <p className={`font-display font-extrabold text-lg tracking-tight ${isLight ? "text-zinc-950" : "text-white"}`}>
            RASHED<span className="text-purple-500">.</span>PERVEJ
          </p>
          <p className={`text-[11px] font-mono tracking-wider ${isLight ? "text-zinc-500" : "text-zinc-500"}`}>
            SENIOR VISUALIZER // © {new Date().getFullYear()}
          </p>
        </div>


        {/* Meta & Links */}
        <div className="flex items-center gap-4">
          <span className={`text-[10px] font-mono uppercase tracking-widest hidden sm:inline ${
            isLight ? "text-zinc-500" : "text-zinc-600"
          }`}>
            JASHORE, BD // UTC+6
          </span>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", "/admin");
              window.dispatchEvent(new Event("popstate"));
            }}
            className={`text-[10px] font-mono uppercase tracking-widest transition-colors cursor-pointer mr-2 ${
              isLight ? "text-zinc-500 hover:text-purple-600" : "text-zinc-500 hover:text-purple-400"
            }`}
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
            className={`text-[10px] font-mono uppercase tracking-widest transition-colors cursor-pointer mr-2 ${
              isLight ? "text-zinc-500 hover:text-purple-600" : "text-zinc-500 hover:text-purple-400"
            }`}
            id="inv-maker-link"
          >
            [Inv Maker]
          </a>
        </div>
      </div>
    </footer>
  );
}
