import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePortfolio } from "../context/PortfolioContext";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "motion/react";
import FormattedText from "./FormattedText";

export default function Testimonials() {
  const { portfolioData, theme } = usePortfolio();
  const isLight = theme === "light";
  const testimonials = portfolioData.testimonials || [];

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    dragThreshold: 8,
    skipSnaps: false,
    duration: 22,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const resetAutoplayRef = useRef<() => void>(() => {});

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

  // Enhanced mobile touch/swipe sensitivity for testimonials
  useEffect(() => {
    if (!emblaApi) return;
    const node = emblaApi.rootNode();
    if (!node) return;

    let startX = 0;
    let startY = 0;
    let startIndex = 0;
    let isTracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startIndex = emblaApi.selectedScrollSnap();
      isTracking = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return;
      isTracking = false;

      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Minimum swipe distance (30px) and clean horizontal dominance (prevents accidental vertical scroll/tap)
      const isHorizontalSwipe = Math.abs(diffX) >= 30 && Math.abs(diffX) > Math.abs(diffY) * 1.25;

      if (isHorizontalSwipe) {
        requestAnimationFrame(() => {
          if (!emblaApi) return;
          const currentIndex = emblaApi.selectedScrollSnap();
          if (currentIndex === startIndex) {
            if (diffX < 0) {
              emblaApi.scrollNext();
            } else {
              emblaApi.scrollPrev();
            }
            resetAutoplayRef.current();
          }
        });
      }
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, [emblaApi]);

  // Autoplay every 3 seconds with temporary pause on interaction and auto-resume
  useEffect(() => {
    if (!emblaApi || testimonials.length <= 1) return;

    let autoInterval: NodeJS.Timeout | null = null;
    let resumeTimeout: NodeJS.Timeout | null = null;
    let isDragging = false;
    let isHovered = false;

    const stopAutoplay = () => {
      if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
      }
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (isDragging || isHovered || document.hidden) return;
      autoInterval = setInterval(() => {
        if (emblaApi && !isDragging && !isHovered && !document.hidden) {
          emblaApi.scrollNext();
        }
      }, 3000);
    };

    // Called on click of navigation controls or pagination dots
    const handleUserAction = () => {
      stopAutoplay();
      if (resumeTimeout) clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        startAutoplay();
      }, 3000);
    };
    resetAutoplayRef.current = handleUserAction;

    // Called when user begins swiping / dragging
    const onPointerDown = () => {
      isDragging = true;
      stopAutoplay();
      if (resumeTimeout) clearTimeout(resumeTimeout);
    };

    // Called when user releases swipe / drag
    const onPointerUp = () => {
      isDragging = false;
      if (resumeTimeout) clearTimeout(resumeTimeout);
      // Resume automatically after swipe finishes
      resumeTimeout = setTimeout(() => {
        startAutoplay();
      }, 3000);
    };

    // Hover listeners for desktop pointer devices
    const onMouseEnter = () => {
      isHovered = true;
      stopAutoplay();
    };

    const onMouseLeave = () => {
      isHovered = false;
      if (resumeTimeout) clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        startAutoplay();
      }, 2000);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    };

    // Start initial 3s autoplay
    startAutoplay();

    // Attach listeners
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp", onPointerUp);

    const rootNode = emblaApi.rootNode();
    rootNode.addEventListener("mouseenter", onMouseEnter);
    rootNode.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopAutoplay();
      if (resumeTimeout) clearTimeout(resumeTimeout);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp", onPointerUp);
      rootNode.removeEventListener("mouseenter", onMouseEnter);
      rootNode.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [emblaApi, testimonials.length]);

  const handlePrev = () => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      resetAutoplayRef.current();
    }
  };

  const handleNext = () => {
    if (emblaApi) {
      emblaApi.scrollNext();
      resetAutoplayRef.current();
    }
  };

  const handleDotClick = (index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
      resetAutoplayRef.current();
    }
  };

  if (!testimonials.length) return null;

  return (
    <section id="testimonials" className={`py-10 sm:py-12 md:py-14 lg:py-16 relative overflow-hidden ${
      isLight ? "bg-transparent border-y border-zinc-200/80" : "bg-[#050508] border-y border-white/5"
    }`}>
      {/* Absolute glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none ${
        isLight ? "bg-purple-200/30" : "bg-purple-900/5"
      }`} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto content-gutter relative z-10 text-center"
      >
        {/* Title */}
        <div className="flex flex-col items-center mb-6 sm:mb-8 lg:mb-10">
          <h2 className={`font-display font-bold text-3xl sm:text-5xl tracking-tight ${
            isLight ? "text-zinc-950" : "text-white"
          }`}>
            Client Testimonials
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        {/* Carousel Container - Touch / Swipe Friendly */}
        <div className="relative">
          <div
            ref={emblaRef}
            className="overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y select-none rounded-3xl"
          >
            <div className="flex -ml-4">
              {testimonials.map((item: any, idx) => (
                <div
                  key={item.id || idx}
                  className="flex-[0_0_100%] min-w-0 pl-4"
                >
                  <div className={`relative p-6 sm:p-12 rounded-3xl min-h-[260px] flex flex-col justify-between select-none h-full text-center transition-all duration-300 ${
                    isLight
                      ? "bg-white/70 border border-white/95 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] backdrop-blur-xl"
                      : "bg-[#0e0f18]/85 backdrop-blur-xl border border-white/10 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]"
                  }`}>
                    <div className={`absolute top-6 left-6 pointer-events-none ${
                      isLight ? "text-purple-300/30" : "text-purple-500/20"
                    }`}>
                      <Quote className="w-12 sm:w-16 h-12 sm:h-16 transform -scale-x-100" />
                    </div>

                    <div className="space-y-6 relative z-10 my-auto pt-4">
                      {/* Star Rating */}
                      <div className="flex justify-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 fill-amber-500" />
                        ))}
                      </div>

                      <div className={`text-sm sm:text-lg italic font-sans leading-relaxed px-2 sm:px-6 ${
                        isLight ? "text-zinc-700" : "text-zinc-200"
                      }`}>
                        "<FormattedText content={item.quote} />"
                      </div>

                      <div>
                        <h4 className={`font-display font-semibold text-sm sm:text-base ${
                          isLight ? "text-zinc-950 font-bold" : "text-white"
                        }`}>
                          {item.author}
                        </h4>
                        <p className={`font-mono text-[10px] sm:text-xs uppercase tracking-wider mt-1 ${
                          isLight ? "text-zinc-500 font-medium" : "text-zinc-400"
                        }`}>
                          {item.role} — <span className={isLight ? "text-purple-600 font-semibold" : "text-purple-400 font-semibold"}>{item.company}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Controls & Pagination Dots */}
          <div className="flex items-center justify-center gap-4 mt-5 relative z-20">
            <button
              onClick={handlePrev}
              aria-label="Previous Testimonial"
              className={`p-2.5 rounded-xl border transition-all active:scale-90 ${
                isLight
                  ? "bg-white/70 hover:bg-white/95 text-zinc-700 hover:text-zinc-950 border-white/90 shadow-xs backdrop-blur-md"
                  : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDotClick(idx)}
                  aria-label={`Go to testimonial ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    selectedIndex === idx
                      ? "bg-purple-600 w-6 shadow-sm shadow-purple-600/30"
                      : isLight
                      ? "bg-zinc-300 w-2 hover:bg-zinc-400"
                      : "bg-white/15 w-2 hover:bg-white/30"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              aria-label="Next Testimonial"
              className={`p-2.5 rounded-xl border transition-all active:scale-90 ${
                isLight
                  ? "bg-white/70 hover:bg-white/95 text-zinc-700 hover:text-zinc-950 border-white/90 shadow-xs backdrop-blur-md"
                  : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5"
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
