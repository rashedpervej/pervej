import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Zap, Paintbrush } from "lucide-react";
import { usePortfolio } from "../context/PortfolioContext";
import { navigateToSection } from "../utils/scroll";
import FormattedText from "./FormattedText";
const defaultHeaderImage = "/Rashed Header Image.webp";

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
  const { portfolioData, theme } = usePortfolio();
  const isLight = theme === "light";
  const info = portfolioData.personalInfo || {};

  const primaryImage = info.portraitImage || info.heroImage || info.avatar || defaultHeaderImage;
  const [imgSrc, setImgSrc] = useState(primaryImage);

  useEffect(() => {
    setImgSrc(primaryImage);
  }, [primaryImage]);

  // Name display
  const fullDisplayName = info.name || "Rashed Pervej";

  const primaryCtaText = info.primaryCtaText || "Explore My Work";
  const primaryCtaLink = info.primaryCtaLink || "projects";
  const secondaryCtaText = info.secondaryCtaText || "Get In Touch";
  const secondaryCtaLink = info.secondaryCtaLink || "contact";

  const experienceYears = info.experienceYears || "6+";
  const yearsLabel = info.yearsLabel || "Years Experience";

  const selectedBrandsCount = info.selectedBrandsCount || "11+";
  const brandsLabel = info.brandsLabel || "Selected Brands";

  const creativeAssetsCount = info.creativeAssetsCount || "200+";
  const assetsLabel = info.assetsLabel || "Creative Assets";

  const availabilityTag = info.availability || "Available for Remote & Hybrid";
  const roleText = info.role || "Senior Visualizer";
  const bioText = info.heroBio || "Senior Visualizer with <span style=\"color: rgb(193, 141, 236);\"><b>6+ years of premium experience.</b></span> Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging.";

  const cleanBioText = React.useMemo(() => {
    if (!bioText) return "";
    return bioText
      .replace(/<span style="color:\s*rgb\(255,\s*255,\s*255\);?">/gi, "")
      .replace(/<span style="color:\s*rgb\(23,\s*23,\s*23\);?">/gi, "")
      .replace(/<span style="color:\s*rgb\(161,\s*161,\s*170\);?">/gi, "");
  }, [bioText]);

  const isExternalUrl = (url: string) => {
    return /^https?:\/\//i.test(url) || /^mailto:/i.test(url) || /^tel:/i.test(url);
  };

  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
    if (!link) return;
    if (isExternalUrl(link)) {
      // Allow browser natural external navigation / new tab
      return;
    }
    e.preventDefault();
    const sectionId = link.replace(/^#/, "").replace(/^\//, "") || "hero";
    navigateToSection(sectionId);
  };

  const getHref = (link: string) => {
    if (!link) return "/";
    if (isExternalUrl(link)) return link;
    return `/#${link.replace(/^#/, "").replace(/^\//, "")}`;
  };

  return (
    <section
      id="hero"
      className={`relative min-h-screen flex items-center justify-center pt-24 sm:pt-28 lg:pt-32 pb-14 sm:pb-16 lg:pb-28 overflow-hidden ${
        isLight ? "bg-transparent" : "bg-[#030303]"
      }`}
    >
      {/* Decorative Blur Orbs */}
      <div className={`absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[120px] animate-pulse-slow pointer-events-none ${
        isLight ? "bg-purple-300/30" : "bg-purple-900/10"
      }`} />
      <div className={`absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full blur-[150px] animate-pulse-slow-reverse pointer-events-none ${
        isLight ? "bg-indigo-300/25" : "bg-indigo-950/15"
      }`} />

      <div className="max-w-7xl mx-auto content-gutter w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Core Text */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          {/* Tagline / Availability Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider uppercase mb-6 transition-all duration-300 ${
              isLight
                ? "bg-white/70 border border-white/90 text-purple-700 shadow-[0_4px_14px_rgba(147,51,234,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-md"
                : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 animate-pulse ${isLight ? "text-purple-600" : "text-purple-400"}`} />
            <FormattedText content={availabilityTag} />
          </motion.div>

          {/* Role / Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`font-mono text-xs uppercase tracking-[0.25em] mb-2 ${
              isLight ? "text-zinc-500 font-medium" : "text-zinc-500"
            }`}
          >
            <FormattedText content={roleText} />
          </motion.p>

          {/* Headline Name */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={`font-display font-bold text-5xl sm:text-7xl lg:text-8xl tracking-tight mb-6 leading-[0.95] ${
              isLight ? "text-zinc-950" : "text-white"
            }`}
          >
            <FormattedText content={fullDisplayName} />
          </motion.h1>

          {/* Bio Description */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`hero-bio-text text-[18px] leading-relaxed max-w-xl font-sans mb-8 ${
              isLight ? "text-zinc-800 font-medium" : "text-zinc-200 font-normal"
            }`}
          >
            <FormattedText content={cleanBioText} />
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 mb-8 sm:mb-10 lg:mb-12"
          >
            <a
              href={getHref(primaryCtaLink)}
              target={isExternalUrl(primaryCtaLink) ? "_blank" : undefined}
              rel={isExternalUrl(primaryCtaLink) ? "noopener noreferrer" : undefined}
              onClick={(e) => handleCtaClick(e, primaryCtaLink)}
              className="btn-keep-white group relative px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm shadow-purple-600/25 hover:shadow-md hover:shadow-purple-600/30 active:scale-95 flex items-center gap-2 border border-purple-400/30 overflow-hidden cursor-pointer"
            >
              <span className="absolute inset-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12" />
              <Paintbrush className="w-4 h-4 text-purple-200" />
              <FormattedText content={primaryCtaText} />
            </a>
            <a
              href={getHref(secondaryCtaLink)}
              target={isExternalUrl(secondaryCtaLink) ? "_blank" : undefined}
              rel={isExternalUrl(secondaryCtaLink) ? "noopener noreferrer" : undefined}
              onClick={(e) => handleCtaClick(e, secondaryCtaLink)}
              className={`px-8 py-4 rounded-xl text-xs uppercase tracking-widest font-semibold transition-all duration-300 active:scale-95 cursor-pointer ${
                isLight
                  ? "bg-white/65 hover:bg-white/95 text-zinc-900 border border-white/90 hover:border-purple-400/40 shadow-xs hover:shadow-sm backdrop-blur-md"
                  : "bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20"
              }`}
            >
              <FormattedText content={secondaryCtaText} />
            </a>
          </motion.div>

          {/* Divider line */}
          <div className={`w-full h-[1px] mb-8 ${isLight ? "bg-zinc-200/80" : "bg-zinc-900"}`} />

          {/* Stats Metadata Group */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="grid grid-cols-3 gap-6 sm:gap-10 w-full lg:max-w-[460px] xl:max-w-[500px] lg:gap-8 xl:gap-10"
          >
            <div>
              <p className={`font-display font-medium text-3xl sm:text-4xl ${isLight ? "text-zinc-900" : "text-white"}`}>
                <AnimatedCounter value={experienceYears} />
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest mt-1 text-zinc-500">
                {yearsLabel}
              </p>
            </div>
            <div>
              <p className={`font-display font-medium text-3xl sm:text-4xl ${isLight ? "text-zinc-900" : "text-white"}`}>
                <AnimatedCounter value={selectedBrandsCount} />
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest mt-1 text-zinc-500">
                {brandsLabel}
              </p>
            </div>
            <div>
              <p className={`font-display font-medium text-3xl sm:text-4xl ${isLight ? "text-zinc-900" : "text-white"}`}>
                <AnimatedCounter value={creativeAssetsCount} />
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest mt-1 text-zinc-500">
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
            className={`relative w-full max-w-sm sm:max-w-md aspect-[4/5] rounded-3xl overflow-hidden group flex flex-col justify-end transition-all duration-500 ${
              isLight
                ? "border border-white/90 bg-white/40 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)] backdrop-blur-xl"
                : "border border-white/10 bg-zinc-950 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.5)]"
            }`}
          >
            {/* Ambient Radial Glow Behind Frame */}
            <div className={`absolute -inset-1 bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-transparent blur-2xl transition-opacity duration-700 pointer-events-none ${
              isLight ? "opacity-30 group-hover:opacity-60" : "opacity-50 group-hover:opacity-80"
            }`} />

            {/* Portrait Image */}
            <img
              src={imgSrc}
              onError={() => setImgSrc(defaultHeaderImage)}
              alt={info.name || "Rashed Pervej - Senior Visualizer"}
              width="448"
              height="560"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-105 group-hover:scale-105 transition-transform duration-700"
            />

            {/* Subtle Gradient Vignette at Bottom for Edge Blend */}
            <div className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent pointer-events-none ${
              isLight ? "from-white/40 opacity-40" : "from-zinc-950/60 opacity-60"
            }`} />
          </motion.div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div className="absolute bottom-2 sm:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce">
        <button
          type="button"
          onClick={() => navigateToSection("about")}
          aria-label="Scroll down to About section"
          className="flex flex-col items-center gap-1.5 cursor-pointer group focus:outline-hidden"
        >
          <span className="font-mono text-[9px] text-zinc-500 group-hover:text-purple-400 transition-colors tracking-[0.2em] uppercase">
            Scroll Down
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-purple-400 transition-colors" />
        </button>
      </div>
    </section>
  );
}