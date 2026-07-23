import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, Award, Zap, Paintbrush, Play } from "lucide-react";
import { usePortfolio } from "../context/PortfolioContext";
import { scrollToSection } from "../utils/scroll";
import FormattedText from "./FormattedText";

// Simple custom hook to handle counter animations
function AnimatedCounter({ value, duration = 2 }: { value: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const target = parseInt(value.replace(/\D/g, ""), 10);
  const isPlus = value.includes("+");

  useEffect(() => {
    let start = 0;
    const end = target;
    if (end === 0) return;
    
    const stepTime = Math.abs(Math.floor((duration * 1000) / end));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 20));

    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <span>
      {count}
      {isPlus ? "+" : ""}
    </span>
  );
}

export default function Hero() {
  const { portfolioData } = usePortfolio();
  const info = portfolioData.personalInfo || {};

  // Name splitting for second word coloring
  const fullDisplayName = info.name || "Rashed Pervej";
  const nameParts = fullDisplayName.trim().split(" ");
  const firstName = nameParts[0] || "Rashed";
  const lastName = nameParts.slice(1).join(" ") || "Pervej";

  const primaryCtaText = info.primaryCtaText || "Explore My Work";
  const primaryCtaLink = info.primaryCtaLink || "#projects";
  const secondaryCtaText = info.secondaryCtaText || "Get In Touch";
  const secondaryCtaLink = info.secondaryCtaLink || "#contact";

  const experienceYears = info.experienceYears || "6+";
  const yearsLabel = info.yearsLabel || "Years Experience";

  const selectedBrandsCount = info.selectedBrandsCount || "11+";
  const brandsLabel = info.brandsLabel || "Selected Brands";

  const creativeAssetsCount = info.creativeAssetsCount || "200+";
  const assetsLabel = info.assetsLabel || "Creative Assets";

  const availabilityTag = info.availability || "Available for Remote & Hybrid";
  const roleText = info.role || "Senior Visualizer";
  const bioText = info.heroBio || "Senior Visualizer with 6+ years of premium experience. Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging.";

  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
    if (link.startsWith("#")) {
      e.preventDefault();
      scrollToSection(link);
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center pt-32 pb-20 overflow-hidden bg-[#030303]"
    >
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-purple-900/10 blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-indigo-950/15 blur-[150px] animate-pulse-slow-reverse pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Core Text */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          {/* Tagline / Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[11px] font-mono tracking-wider text-purple-400 uppercase mb-6"
          >
            <Zap className="w-3.5 h-3.5 animate-pulse text-purple-400" />
            <FormattedText content={availabilityTag} />
          </motion.div>

          {/* Role/Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2"
          >
            <FormattedText content={roleText} />
          </motion.p>

          {/* Headline Name */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display font-bold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-white mb-6 leading-[0.95]"
          >
            <FormattedText content={fullDisplayName} />
          </motion.h1>

          {/* Bio Headline */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-zinc-400 text-sm sm:text-base max-w-xl font-sans leading-relaxed mb-8"
          >
            <FormattedText content={bioText} />
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 mb-14"
          >
            <a
              href={primaryCtaLink}
              onClick={(e) => handleCtaClick(e, primaryCtaLink)}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-lg shadow-purple-950/20 active:scale-95 flex items-center gap-2 border border-purple-500/20 cursor-pointer"
            >
              <Paintbrush className="w-4 h-4 text-purple-200" />
              <FormattedText content={primaryCtaText} />
            </a>
            <a
              href={secondaryCtaLink}
              onClick={(e) => handleCtaClick(e, secondaryCtaLink)}
              className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 text-xs uppercase tracking-widest font-semibold transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <FormattedText content={secondaryCtaText} />
            </a>
          </motion.div>

          {/* Decorative Horizontal Divider */}
          <div className="w-full h-[1px] bg-zinc-900 mb-8" />

          {/* Metrics Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-3 gap-6 sm:gap-10 w-full"
          >
            <div>
              <p className="font-display font-medium text-3xl sm:text-4xl text-white">
                <AnimatedCounter value={experienceYears} />
              </p>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                {yearsLabel}
              </p>
            </div>
            <div>
              <p className="font-display font-medium text-3xl sm:text-4xl text-white">
                <AnimatedCounter value={selectedBrandsCount} />
              </p>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                {brandsLabel}
              </p>
            </div>
            <div>
              <p className="font-display font-medium text-3xl sm:text-4xl text-white">
                <AnimatedCounter value={creativeAssetsCount} />
              </p>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                {assetsLabel}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Hero Portrait Image */}
        <div className="lg:col-span-5 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative w-full max-w-sm sm:max-w-md aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl group flex flex-col justify-end"
          >
            {/* Ambient Radial Glow Behind Frame */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-transparent blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none" />

            {/* Portrait Image */}
            <img
              src={info.portraitImage || info.heroImage || info.avatar || "https://i.ibb.co.com/Hf2cC3WR/Generated-Image-September-05-2025-12-33-AM-1.jpg"}
              alt={info.name || "Rashed Pervej"}
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-105 group-hover:scale-105 transition-transform duration-700"
            />

            {/* Subtle Gradient Vignette at Bottom for Edge Blend */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent opacity-60 pointer-events-none" />
          </motion.div>
        </div>
      </div>

      {/* Decorative Absolute Elements */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce">
        <span className="font-mono text-[9px] text-zinc-500 tracking-[0.2em] uppercase">
          Scroll Down
        </span>
        <ArrowDown className="w-3.5 h-3.5 text-zinc-400" />
      </div>
    </section>
  );
}
