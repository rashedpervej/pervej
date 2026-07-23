import React from "react";
import { Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { usePortfolio } from "../context/PortfolioContext";

export default function Contact() {
  const { portfolioData } = usePortfolio();
  const info = portfolioData.personalInfo || {};

  const email = info.email || "rashedpervej2011@gmail.com";
  const phone = info.phone || "+8801932623969";
  const location = info.location || "Jashore, Bangladesh";
  const linkedin = info.linkedin || "linkedin.com/in/rpervej";
  const behance = info.behance || "be.net/rashedpervej";

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const linkedinUrl = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
  const behanceUrl = behance.startsWith('http') ? behance : `https://${behance}`;

  return (
    <section id="contact" className="py-24 bg-[#030303] relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-950/15 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Title */}
        <div className="flex flex-col items-start mb-12 text-left">
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Let's Collaborate on <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Your Next Brand Story
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4 mb-6" />
          <h3 className="font-display font-semibold text-lg sm:text-xl text-zinc-100">
            Direct Contact &amp; Credentials
          </h3>
        </div>

        {/* 3 Equal Width Glassmorphism Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mb-16">
          {/* Card 1: Email */}
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-4.5 p-5 sm:p-6 rounded-[20px] bg-[#09090e]/80 border border-white/[0.06] hover:border-purple-500/30 hover:bg-[#0c0c16] transition-all duration-300 group cursor-pointer shadow-lg shadow-black/40"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-purple-500/40 transition-all duration-300">
              <Mail className="w-6 h-6 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest font-medium mb-1">
                EMAIL
              </p>
              <p className="font-sans text-sm sm:text-base font-medium text-white group-hover:text-purple-300 transition-colors truncate">
                {email}
              </p>
            </div>
          </a>

          {/* Card 2: Phone & WhatsApp */}
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4.5 p-5 sm:p-6 rounded-[20px] bg-[#09090e]/80 border border-white/[0.06] hover:border-purple-500/30 hover:bg-[#0c0c16] transition-all duration-300 group cursor-pointer shadow-lg shadow-black/40"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-purple-500/40 transition-all duration-300">
              <Phone className="w-6 h-6 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest font-medium mb-1">
                PHONE &amp; WHATSAPP
              </p>
              <p className="font-sans text-sm sm:text-base font-medium text-white group-hover:text-purple-300 transition-colors truncate">
                {phone}
              </p>
            </div>
          </a>

          {/* Card 3: Location */}
          <div className="flex items-center gap-4.5 p-5 sm:p-6 rounded-[20px] bg-[#09090e]/80 border border-white/[0.06] hover:border-purple-500/30 hover:bg-[#0c0c16] transition-all duration-300 group shadow-lg shadow-black/40">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-purple-500/40 transition-all duration-300">
              <MapPin className="w-6 h-6 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-zinc-400 uppercase tracking-widest font-medium mb-1">
                LOCATION
              </p>
              <p className="font-sans text-sm sm:text-base font-medium text-white group-hover:text-purple-300 transition-colors truncate">
                {location}
              </p>
            </div>
          </div>
        </div>

        {/* Divider with Center Heading */}
        <div className="relative flex items-center justify-center my-12">
          <div className="flex-grow border-t border-white/[0.08]" />
          <span className="shrink-0 px-6 font-mono text-xs text-zinc-400 uppercase tracking-[0.2em] font-medium">
            SOCIAL CONNECTIONS
          </span>
          <div className="flex-grow border-t border-white/[0.08]" />
        </div>

        {/* Social Connection Buttons */}
        <div className="flex items-center justify-center gap-4 mt-8">
          {/* Behance Button */}
          <a
            href={behanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#09090e]/90 border border-white/[0.08] hover:border-purple-500/40 hover:bg-[#0c0c16] hover:-translate-y-0.5 transition-all duration-300 group shadow-lg"
          >
            <span className="font-sans font-black text-xl text-purple-400 tracking-tight">
              Bē
            </span>
            <ExternalLink className="w-4 h-4 text-purple-400/80 group-hover:text-purple-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>

          {/* LinkedIn Button */}
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#09090e]/90 border border-white/[0.08] hover:border-purple-500/40 hover:bg-[#0c0c16] hover:-translate-y-0.5 transition-all duration-300 group shadow-lg"
          >
            <span className="font-sans font-extrabold text-xl text-purple-400 tracking-tight">
              in
            </span>
            <ExternalLink className="w-4 h-4 text-purple-400/80 group-hover:text-purple-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        </div>
      </div>
    </section>
  );
}
