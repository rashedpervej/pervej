/**
 * Clean URL Section Navigation & Smooth Scroll Engine
 * 
 * Provides:
 * - Clean URL section navigation via HTML5 History API (pushState/replaceState)
 * - Restores section on direct load / browser refresh
 * - Handles browser Back/Forward (popstate)
 * - Luxury cubic ease-in-out smooth scrolling
 * - Programmatic scroll tracking to prevent scroll-spy race conditions
 */

let isProgrammaticScroll = false;
let programmaticScrollTimer: ReturnType<typeof setTimeout> | null = null;

export function isProgrammaticScrollActive(): boolean {
  return isProgrammaticScroll;
}

export function setProgrammaticScrollActive(active: boolean, durationMs = 800) {
  if (programmaticScrollTimer) {
    clearTimeout(programmaticScrollTimer);
    programmaticScrollTimer = null;
  }
  isProgrammaticScroll = active;
  if (active) {
    programmaticScrollTimer = setTimeout(() => {
      isProgrammaticScroll = false;
      programmaticScrollTimer = null;
    }, durationMs);
  }
}

/**
 * Checks if a pathname is an isolated standalone route (not a section in the portfolio)
 */
export function isStandaloneRoute(pathname: string): boolean {
  const clean = pathname.replace(/^\//, "").replace(/\/$/, "").toLowerCase();
  return clean === "admin" || clean === "invoice-maker";
}

/**
 * Derives the section ID from a clean URL pathname
 * e.g. "/about" -> "about", "/" -> "hero", "/projects" -> "projects"
 */
export function getSectionFromPath(pathname: string): string {
  const clean = pathname.replace(/^\//, "").replace(/\/$/, "").toLowerCase();
  if (!clean || clean === "home") {
    return "hero";
  }
  return clean;
}

/**
 * Derives the clean URL path from a section ID
 * e.g. "hero" -> "/", "about" -> "/about", "projects" -> "/projects"
 */
export function getPathFromSection(sectionId: string): string {
  const clean = sectionId.replace(/^#/, "").replace(/^\//, "").toLowerCase();
  if (!clean || clean === "hero" || clean === "home") {
    return "/";
  }
  return `/${clean}`;
}

/**
 * Smoothly scrolls to a target section by element ID with custom easing and retry logic.
 * 
 * @param targetId - The element ID, path, or hash (e.g. "about", "/about", or "#about")
 * @param delay - Delay before scroll starts in ms (default: 0ms)
 * @param duration - Animation duration in ms (default: 700ms)
 * @param offset - Fixed header offset in px (default: 80px)
 * @param behavior - "smooth" or "instant"
 * @param onComplete - Optional callback when scrolling finishes
 */
export function scrollToSection(
  targetId: string,
  delay = 0,
  duration = 700,
  offset = 80,
  behavior: "smooth" | "instant" = "smooth",
  onComplete?: () => void
) {
  const cleanId = targetId.replace(/^#/, "").replace(/^\//, "").toLowerCase();

  // Flag programmatic scroll active to prevent manual scroll listeners from firing replaceState
  setProgrammaticScrollActive(true, delay + duration + 100);

  setTimeout(() => {
    // If target is hero / home / empty, scroll to top
    if (!cleanId || cleanId === "hero" || cleanId === "home") {
      performScroll(0, duration, behavior, onComplete);
      return;
    }

    // Try finding element with retry logic if mounting
    let attempts = 0;
    const maxAttempts = 10;

    const findAndScroll = () => {
      const el = document.getElementById(cleanId);
      if (el) {
        const rawTarget = el.getBoundingClientRect().top + window.pageYOffset - offset;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetPosition = Math.min(Math.max(0, rawTarget), maxScroll);
        performScroll(targetPosition, duration, behavior, onComplete);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(findAndScroll, 60);
      } else {
        setProgrammaticScrollActive(false);
      }
    };

    findAndScroll();
  }, delay);
}

function performScroll(
  targetPosition: number,
  duration: number,
  behavior: "smooth" | "instant",
  onComplete?: () => void
) {
  const prefersReducedMotion = typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (behavior === "instant" || prefersReducedMotion || duration <= 0) {
    try {
      window.scrollTo({ top: targetPosition, behavior: "auto" });
    } catch (_) {
      try {
        window.scrollTo(0, targetPosition);
      } catch (_) {}
    }
    setProgrammaticScrollActive(false);
    onComplete?.();
    return;
  }

  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;

  if (Math.abs(distance) < 2) {
    window.scrollTo(0, targetPosition);
    setProgrammaticScrollActive(false);
    onComplete?.();
    return;
  }

  let startTime: number | null = null;

  // Luxury ease-in-out cubic curve
  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const step = (currentTime: number) => {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const easeProgress = easeInOutCubic(progress);

    window.scrollTo(0, startPosition + distance * easeProgress);

    if (timeElapsed < duration) {
      requestAnimationFrame(step);
    } else {
      window.scrollTo(0, targetPosition);
      setProgrammaticScrollActive(false);
      onComplete?.();
    }
  };

  requestAnimationFrame(step);
}

/**
 * Navigates to a portfolio section smoothly.
 * The browser URL strictly remains exactly the root "/" URL (no pathname or hash).
 * Updates History state and sessionStorage for Back/Forward and refresh restoration.
 * 
 * @param targetIdOrPath - Target section or path (e.g. "about", "projects", "contact", "hero")
 * @param options - Navigation options (delay, replace, behavior)
 */
export function navigateToSection(
  targetIdOrPath: string,
  options: { delay?: number; replace?: boolean; behavior?: "smooth" | "instant" } = {}
) {
  const { delay = 0, replace = false, behavior = "smooth" } = options;
  const targetPath = getPathFromSection(targetIdOrPath);
  const sectionId = getSectionFromPath(targetPath);

  if (typeof window !== "undefined") {
    // Keep visible URL strictly as "/"
    if (replace) {
      window.history.replaceState({ section: sectionId }, "", "/");
    } else {
      window.history.pushState({ section: sectionId }, "", "/");
    }

    try {
      sessionStorage.setItem("portfolio_active_section", sectionId);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("portfolio:sectionchange", { detail: { section: sectionId } })
    );
  }

  // Smoothly scroll to target section
  scrollToSection(sectionId, delay, 700, 80, behavior);
}

