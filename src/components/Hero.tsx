import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, Award, Zap, Paintbrush, Play } from "lucide-react";
import { portfolioData } from "../data";

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
  const info = portfolioData.personalInfo;

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
            <span>Available for Onsite, Remote & Hybrid Roles</span>
          </motion.div>

          {/* Role/Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2"
          >
            {info.role}
          </motion.p>

          {/* Headline Name */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display font-bold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-white mb-6 leading-[0.95]"
          >
            Rashed <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-200 to-purple-500">
              Pervej
            </span>
          </motion.h1>

          {/* Bio Headline */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-zinc-400 text-sm sm:text-base max-w-xl font-sans leading-relaxed mb-8"
          >
            Senior Visualizer with <span className="text-purple-300 font-medium">6+ years of premium experience</span>. Specialize in high-impact brand identities, modern motion graphics, and tactical food supplement packaging.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 mb-14"
          >
            <a
              href="#projects"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-lg shadow-purple-950/20 active:scale-95 flex items-center gap-2 border border-purple-500/20"
            >
              <Paintbrush className="w-4 h-4 text-purple-200" />
              Explore My Work
            </a>
            <a
              href="#contact"
              className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 text-xs uppercase tracking-widest font-semibold transition-all duration-300 active:scale-95"
            >
              Get In Touch
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
                <AnimatedCounter value="6+" />
              </p>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                Years Experience
              </p>
            </div>
            <div>
              <p className="font-display font-medium text-3xl sm:text-4xl text-white">
                <AnimatedCounter value="11+" />
              </p>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                Selected Brands
              </p>
            </div>
            <div>
              <p className="font-display font-medium text-3xl sm:text-4xl text-white">
                <AnimatedCounter value="200+" />
              </p>
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                Creative Assets
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Graphic/Artistic Card representation of Senior Visualizer */}
        <div className="lg:col-span-5 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 1 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative w-full max-w-sm aspect-[4/5] rounded-3xl overflow-hidden glass-panel border border-white/15 p-6 shadow-2xl flex flex-col justify-between group"
          >
            {/* Visual Header */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                RP // VISUAL LAB
              </span>
              <Award className="w-5 h-5 text-purple-400" />
            </div>

            {/* Glowing background inside card */}
            <div className="absolute inset-0 bg-gradient-to-t from-purple-950/20 to-transparent opacity-50 pointer-events-none group-hover:opacity-70 transition-opacity" />

            {/* Artistry Placeholder graphic to show design craft */}
            <div className="my-8 flex-1 relative flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 border border-white/5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.12)_0,transparent_100%)]" />
              
              {/* Dynamic abstract layout represent creative visual design */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border border-dashed border-zinc-800 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 border border-zinc-700/60 rounded-full"
                />
                
                {/* Centered Glowing Sphere representing 'Insight' / 'Concept' */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600/30 to-indigo-600/30 border border-purple-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.25)]">
                  <Play className="w-5 h-5 text-purple-300 fill-purple-300/20 ml-0.5" />
                </div>
              </div>
            </div>

            {/* Project Quick Description */}
            <div className="relative z-10">
              <p className="text-[10px] font-mono text-purple-400 uppercase tracking-widest mb-1">
                Visualizer Core Creed
              </p>
              <h4 className="font-display font-medium text-lg text-zinc-200 leading-tight mb-2">
                Strategic thinking paired with premium visual craft.
              </h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                "Combining organic visual identity, motion narrative, and luxury packaging layout."
              </p>
            </div>
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
