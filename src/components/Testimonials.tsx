import React, { useState, useEffect, useCallback } from "react";
import { usePortfolio } from "../context/PortfolioContext";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import FormattedText from "./FormattedText";

export default function Testimonials() {
  const { portfolioData } = usePortfolio();
  const testimonials = portfolioData.testimonials || [];

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const handlePrev = () => {
    if (emblaApi) emblaApi.scrollPrev();
  };

  const handleNext = () => {
    if (emblaApi) emblaApi.scrollNext();
  };

  if (!testimonials.length) return null;

  return (
    <section className="py-24 bg-[#050508] relative overflow-hidden border-y border-white/5">
      {/* Absolute glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-900/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        {/* Title */}
        <div className="flex flex-col items-center mb-10">
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Client Testimonials
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        {/* Carousel Container - Touch / Swipe Friendly */}
        <div className="relative">
          <div
            ref={emblaRef}
            className="overflow-hidden cursor-grab active:cursor-grabbing rounded-3xl"
          >
            <div className="flex -ml-4">
              {testimonials.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex-[0_0_100%] min-w-0 pl-4"
                >
                  <div className="relative p-6 sm:p-12 rounded-3xl bg-[#0c0c12]/60 border border-white/5 shadow-2xl min-h-[260px] flex flex-col justify-between select-none h-full text-center">
                    <div className="absolute top-6 left-6 text-purple-500/20 pointer-events-none">
                      <Quote className="w-12 sm:w-16 h-12 sm:h-16 transform -scale-x-100" />
                    </div>

                    <div className="space-y-6 relative z-10 my-auto pt-4">
                      {/* Star Rating */}
                      <div className="flex justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 fill-amber-500" />
                        ))}
                      </div>

                      <div className="text-zinc-300 text-sm sm:text-lg italic font-sans leading-relaxed px-2 sm:px-6">
                        "<FormattedText content={item.quote} />"
                      </div>

                      <div>
                        <h4 className="font-display font-semibold text-sm sm:text-base text-white">
                          {item.author}
                        </h4>
                        <p className="font-mono text-[10px] sm:text-xs text-zinc-500 uppercase tracking-wider mt-1">
                          {item.role} — <span className="text-purple-400">{item.company}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Controls & Pagination Dots */}
          <div className="flex items-center justify-center gap-4 mt-8 relative z-20">
            <button
              onClick={handlePrev}
              aria-label="Previous Testimonial"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => emblaApi?.scrollTo(idx)}
                  aria-label={`Go to testimonial ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    selectedIndex === idx ? "bg-purple-500 w-6 shadow-md shadow-purple-500/50" : "bg-white/15 w-2 hover:bg-white/30"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              aria-label="Next Testimonial"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
