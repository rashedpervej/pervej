/**
 * Smoothly scrolls to a target section by element ID with an intentional initial delay and custom easing.
 * 
 * @param targetId - The element ID or hash (e.g. "about" or "#about")
 * @param delay - Delay before scroll starts in ms (default: 500ms)
 * @param duration - Animation duration in ms (default: 700ms)
 * @param offset - Fixed header offset in px (default: 80px)
 */
export function scrollToSection(
  targetId: string,
  delay = 500,
  duration = 700,
  offset = 80
) {
  setTimeout(() => {
    const cleanId = targetId.replace("#", "");
    let targetPosition = 0;

    if (cleanId && cleanId !== "hero") {
      const el = document.getElementById(cleanId);
      if (el) {
        targetPosition = el.getBoundingClientRect().top + window.pageYOffset - offset;
      } else {
        return;
      }
    }

    // Prevent overscroll beyond bottom of document
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    targetPosition = Math.min(Math.max(0, targetPosition), maxScroll);

    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;

    if (Math.abs(distance) < 2) {
      window.scrollTo(0, targetPosition);
      return;
    }

    let startTime: number | null = null;

    // Luxury ease-in-out cubic curve (acceleration until half, deceleration after)
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
      }
    };

    requestAnimationFrame(step);
  }, delay);
}
