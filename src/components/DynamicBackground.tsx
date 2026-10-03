import React, { useEffect, useState } from "react";
import { usePortfolio } from "../context/PortfolioContext";

export default function DynamicBackground() {
  const { backgroundStyle } = usePortfolio();
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    // Detect mobile or low-power devices to skip heavy SVG filter
    const isMobile = window.innerWidth < 768 || "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsLowPower(isMobile);
  }, []);

  // Parallax Engine for desktop only (LERP smoothed)
  useEffect(() => {
    // Graceful bail-out on touch devices, small screens, or reduced motion preference
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMobile = window.innerWidth < 768;
    const prefersReduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isTouch || isMobile || prefersReduced) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animFrame: number | null = null;
    let isMoving = false;

    const handlePointerMove = (e: PointerEvent) => {
      const halfX = window.innerWidth / 2;
      const halfY = window.innerHeight / 2;
      targetX = (e.clientX - halfX) / halfX;
      targetY = (e.clientY - halfY) / halfY;

      if (!isMoving) {
        isMoving = true;
        animFrame = requestAnimationFrame(renderParallax);
      }
    };

    const renderParallax = () => {
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;

      const parallaxElements = document.querySelectorAll<HTMLElement>("[data-parallax]");
      parallaxElements.forEach((el) => {
        const factor = parseFloat(el.getAttribute("data-parallax") || "0.02");
        const shiftX = (currentX * factor * 120).toFixed(2);
        const shiftY = (currentY * factor * 120).toFixed(2);
        el.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0)`;
      });

      if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.0005) {
        animFrame = requestAnimationFrame(renderParallax);
      } else {
        isMoving = false;
        animFrame = null;
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [backgroundStyle]);

  return (
    <div className="dynamic-bg-stage" aria-hidden="true">
      {/* 1. Liquid Glass (Signature Default Style) */}
      {backgroundStyle === "liquid" && (
        <div className="bg-layer bg-liquid active" data-bg-mode="liquid">
          <div className="liquid-mesh liquid-mesh-light" />
          <div className="liquid-mesh liquid-mesh-dark" />
          <div className="liquid-shape shape-1 shape-light" data-parallax="0.03" />
          <div className="liquid-shape shape-1 shape-dark" data-parallax="0.03" />
          <div className="liquid-shape shape-2 shape-light" data-parallax="-0.025" />
          <div className="liquid-shape shape-2 shape-dark" data-parallax="-0.025" />
        </div>
      )}

      {/* 2. Aurora Ribbon */}
      {backgroundStyle === "aurora" && (
        <div className="bg-layer bg-aurora active" data-bg-mode="aurora">
          <div className="aurora-ribbon" />
        </div>
      )}

      {/* 3. Mesh Gradient */}
      {backgroundStyle === "mesh" && (
        <div className="bg-layer bg-mesh active" data-bg-mode="mesh" />
      )}

      {/* 4. Floating Glass Orbs */}
      {backgroundStyle === "floating-orbs" && (
        <div className="bg-layer bg-floating-orbs active" data-bg-mode="floating-orbs">
          <div className="orb orb-a" data-parallax="0.025" />
          <div className="orb orb-b" data-parallax="-0.035" />
        </div>
      )}

      {/* 5. Iridescent */}
      {backgroundStyle === "iridescent" && (
        <div className="bg-layer bg-iridescent active" data-bg-mode="iridescent" />
      )}

      {/* 6. Cinematic Dark */}
      {backgroundStyle === "cinematic" && (
        <div className="bg-layer bg-cinematic active" data-bg-mode="cinematic" />
      )}

      {/* 7. Minimal Clean */}
      {backgroundStyle === "minimal" && (
        <div className="bg-layer bg-minimal active" data-bg-mode="minimal" />
      )}

      {/* Tactile Micro-Grain Noise Filter - skipped on low power/mobile devices */}
      {!isLowPower && (
        <svg className="bg-grain-noise" xmlns="http://www.w3.org/2000/svg">
          <filter id="liquidNoise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.75"
              numOctaves="2"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#liquidNoise)" />
        </svg>
      )}
    </div>
  );
}
