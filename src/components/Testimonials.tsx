import React, { useState } from "react";
import { portfolioData } from "../data";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Testimonials() {
  const testimonials = portfolioData.testimonials;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const current = testimonials[currentIndex];

  return (
    <section className="py-24 bg-[#050508] relative overflow-hidden border-y border-white/5">
      {/* Absolute glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-900/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        {/* Title */}
        <div className="flex flex-col items-center mb-12">
          <span className="font-mono text-xs uppercase tracking-widest text-purple-400 mb-2">
            06 // Commendations
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Client Testimonials
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        {/* Quotes Display Card */}
        <div className="relative p-8 sm:p-12 rounded-3xl bg-[#0c0c12]/40 border border-white/5 shadow-2xl min-h-[250px] flex flex-col justify-between">
          <div className="absolute top-6 left-6 text-purple-500/20">
            <Quote className="w-16 h-16 transform -scale-x-100" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 relative z-10"
            >
              {/* Star Rating decoration */}
              <div className="flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                ))}
              </div>

              <p className="text-zinc-300 text-sm sm:text-lg italic font-sans leading-relaxed px-4">
                "{current.quote}"
              </p>

              <div>
                <h4 className="font-display font-semibold text-sm sm:text-base text-white">
                  {current.author}
                </h4>
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
                  {current.role} — <span className="text-purple-400">{current.company}</span>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/5 relative z-20">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1.5">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentIndex === idx ? "bg-purple-500 w-5" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
