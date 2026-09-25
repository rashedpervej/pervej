import React from "react";
import { Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { usePortfolio } from "../context/PortfolioContext";

export default function Contact() {
  const { portfolioData, theme } = usePortfolio();
  const isLight = theme === "light";
  const info = portfolioData.personalInfo || {};

  const email = info.email || "rashedpervej2011@gmail.com";
  const phone = info.phone || "+8801932623969";
  const location = info.contactLocation || info.location || "Jashore, Bangladesh";
  const linkedin = info.linkedin || "linkedin.com/in/rpervej";
  const behance = info.behance || "be.net/rashedpervej";

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const linkedinUrl = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
  const behanceUrl = behance.startsWith('http') ? behance : `https://${behance}`;

  return (
    <section
      id="contact"
      className={`py-10 sm:py-12 md:py-14 lg:py-16 relative overflow-hidden ${
        isLight ? "bg-transparent" : "bg-[#030303]"
      }`}
    >
      {/* Ambient background glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] blur-[140px] pointer-events-none rounded-full ${
        isLight ? "bg-purple-200/30" : "bg-purple-950/15"
      }`} />

      <div className="max-w-7xl mx-auto content-gutter relative z-10">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-start mb-10 sm:mb-12 lg:mb-14 text-left"
        >
          <h2
            className={`font-display font-bold text-3xl sm:text-5xl tracking-tight leading-tight ${
              isLight ? "text-zinc-950" : "text-white"
            }`}
          >
            Let's Collaborate on <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
              Your Next Brand Story
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4 mb-3 sm:mb-4" />
          <h3 className={`font-display font-semibold text-lg sm:text-2xl ${isLight ? "text-zinc-700" : "text-zinc-100"}`}>
            Direct Contact &amp; Credentials
          </h3>
        </motion.div>

        {/* 3 Equal Width Glassmorphism Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch mb-8 sm:mb-10 lg:mb-12">
          {/* Card 1: Email */}
          <motion.a
            href={`mailto:${email}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex items-center gap-4 sm:gap-5 p-5 sm:p-6 rounded-2xl transition-all duration-300 group cursor-pointer ${
              isLight
                ? "bg-white/65 hover:bg-white/90 border border-white/90 hover:border-purple-300 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-4px_rgba(124,58,237,0.08)] hover:-translate-y-0.5 backdrop-blur-xl"
                : "bg-[#09090e]/80 border border-white/[0.06] hover:border-purple-500/30 hover:bg-[#0c0c16] shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)] hover:-translate-y-0.5"
            }`}
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-300 ${
              isLight ? "bg-purple-100/70 border border-purple-200 group-hover:border-purple-300" : "bg-purple-950/30 border border-purple-500/20 group-hover:border-purple-500/40"
            }`}>
              <Mail className={`w-5 h-5 sm:w-6 sm:h-6 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-medium mb-1 ${isLight ? "text-zinc-500 font-semibold" : "text-zinc-400"}`}>
                EMAIL
              </p>
              <p className={`font-sans text-sm sm:text-base font-medium truncate transition-colors ${
                isLight ? "text-zinc-900 group-hover:text-purple-700" : "text-white group-hover:text-purple-300"
              }`}>
                {email}
              </p>
            </div>
          </motion.a>

          {/* Card 2: Phone & WhatsApp */}
          <motion.a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex items-center gap-4 sm:gap-5 p-5 sm:p-6 rounded-2xl transition-all duration-300 group cursor-pointer ${
              isLight
                ? "bg-white/65 hover:bg-white/90 border border-white/90 hover:border-purple-300 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-4px_rgba(124,58,237,0.08)] hover:-translate-y-0.5 backdrop-blur-xl"
                : "bg-[#09090e]/80 border border-white/[0.06] hover:border-purple-500/30 hover:bg-[#0c0c16] shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)] hover:-translate-y-0.5"
            }`}
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-300 ${
              isLight ? "bg-purple-100/70 border border-purple-200 group-hover:border-purple-300" : "bg-purple-950/30 border border-purple-500/20 group-hover:border-purple-500/40"
            }`}>
              <Phone className={`w-5 h-5 sm:w-6 sm:h-6 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-medium mb-1 ${isLight ? "text-zinc-500 font-semibold" : "text-zinc-400"}`}>
                PHONE &amp; WHATSAPP
              </p>
              <p className={`font-sans text-sm sm:text-base font-medium truncate transition-colors ${
                isLight ? "text-zinc-900 group-hover:text-purple-700" : "text-white group-hover:text-purple-300"
              }`}>
                {phone}
              </p>
            </div>
          </motion.a>

          {/* Card 3: Location */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex items-center gap-4 sm:gap-5 p-5 sm:p-6 rounded-2xl transition-all duration-300 group ${
              isLight
                ? "bg-white/65 border border-white/90 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] backdrop-blur-xl"
                : "bg-[#09090e]/80 border border-white/[0.06] hover:border-purple-500/30 hover:bg-[#0c0c16] shadow-[0_4px_16px_-2px_rgba(0,0,0,0.35)]"
            }`}
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-300 ${
              isLight ? "bg-purple-100/70 border border-purple-200" : "bg-purple-950/30 border border-purple-500/20 group-hover:border-purple-500/40"
            }`}>
              <MapPin className={`w-5 h-5 sm:w-6 sm:h-6 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-widest font-medium mb-1 ${isLight ? "text-zinc-500 font-semibold" : "text-zinc-400"}`}>
                LOCATION
              </p>
              <p className={`font-sans text-sm sm:text-base font-medium truncate ${
                isLight ? "text-zinc-900" : "text-white"
              }`}>
                {location}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Divider with Center Heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="relative flex items-center justify-center my-6 sm:my-8"
        >
          <div className={`flex-grow border-t ${isLight ? "border-zinc-300/80" : "border-white/[0.08]"}`} />
          <span className={`shrink-0 px-4 sm:px-6 font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em] font-medium ${isLight ? "text-zinc-500" : "text-zinc-400"}`}>
            SOCIAL CONNECTIONS
          </span>
          <div className={`flex-grow border-t ${isLight ? "border-zinc-300/80" : "border-white/[0.08]"}`} />
        </motion.div>

        {/* Social Connection Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center gap-4 sm:gap-5 mt-4 sm:mt-6"
        >
          {/* Behance Button */}
          <a
            href={behanceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 sm:gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl hover:-translate-y-0.5 transition-all duration-300 group ${
              isLight
                ? "bg-white/70 hover:bg-white/95 border border-white/90 hover:border-purple-300 shadow-xs hover:shadow-sm backdrop-blur-xl"
                : "bg-[#09090e]/90 border border-white/[0.08] hover:border-purple-500/40 hover:bg-[#0c0c16] shadow-xs hover:shadow-sm"
            }`}
          >
            <span className={`font-sans font-black text-lg sm:text-xl tracking-tight ${isLight ? "text-purple-600" : "text-purple-400"}`}>
              Bē
            </span>
            <ExternalLink className={`w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all ${
              isLight ? "text-purple-600" : "text-purple-400/80 group-hover:text-purple-300"
            }`} />
          </a>

          {/* LinkedIn Button */}
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 sm:gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl hover:-translate-y-0.5 transition-all duration-300 group ${
              isLight
                ? "bg-white/70 hover:bg-white/95 border border-white/90 hover:border-purple-300 shadow-xs hover:shadow-sm backdrop-blur-xl"
                : "bg-[#09090e]/90 border border-white/[0.08] hover:border-purple-500/40 hover:bg-[#0c0c16] shadow-xs hover:shadow-sm"
            }`}
          >
            <span className={`font-sans font-extrabold text-lg sm:text-xl tracking-tight ${isLight ? "text-purple-600" : "text-purple-400"}`}>
              in
            </span>
            <ExternalLink className={`w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all ${
              isLight ? "text-purple-600" : "text-purple-400/80 group-hover:text-purple-300"
            }`} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
