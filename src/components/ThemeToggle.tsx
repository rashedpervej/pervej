import React from "react";
import { motion } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { usePortfolio } from "../context/PortfolioContext";

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
  onToggle?: () => void;
  onAnimationComplete?: () => void;
}

export default function ThemeToggle({
  className = "",
  compact = false,
  onToggle,
  onAnimationComplete,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = usePortfolio();
  const isLight = theme === "light";

  const isAnimatingRef = React.useRef(false);

  const handleToggle = () => {
    isAnimatingRef.current = true;
    toggleTheme();
    onToggle?.();
  };

  const handleAnimationComplete = () => {
    if (isAnimatingRef.current) {
      isAnimatingRef.current = false;
      onAnimationComplete?.();
    }
  };

  return (
    <button
      id="theme-toggle-button"
      onClick={handleToggle}
      type="button"
      aria-label={`Switch to ${isLight ? "Dark" : "Light"} Mode`}
      title={`Switch to ${isLight ? "Dark" : "Light"} Mode`}
      className={`group relative inline-flex items-center rounded-full p-1 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
        compact ? "min-w-[44px] min-h-[44px] justify-center" : ""
      } ${
        isLight
          ? "bg-white/75 hover:bg-white/90 border border-white/90 shadow-xs"
          : "bg-[#0d0d12]/90 hover:bg-[#15151e] border border-white/10 shadow-xs"
      } backdrop-blur-xl ${className}`}
    >
      {/* Specular sheen effect on hover */}
      <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />
      </span>

      {compact ? (
        // Compact single-icon toggle
        <div className="relative w-8 h-8 flex items-center justify-center">
          <motion.div
            key={theme}
            initial={{ scale: 0.6, rotate: isLight ? -45 : 45, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            onAnimationComplete={handleAnimationComplete}
            className="flex items-center justify-center"
          >
            {isLight ? (
              <Sun className="w-4.5 h-4.5 text-amber-500 fill-amber-500/20" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-purple-400 fill-purple-400/20" />
            )}
          </motion.div>
        </div>
      ) : (
        // Dual-state pill slider (Hardware-accelerated GPU slide)
        <div className="relative flex items-center gap-1">
          {/* Active Liquid Glass Thumb */}
          <motion.div
            initial={false}
            animate={{ x: isLight ? 0 : 32 }}
            transition={{ type: "spring", stiffness: 700, damping: 36 }}
            onAnimationComplete={handleAnimationComplete}
            className="absolute top-0 left-0 w-7 h-7 rounded-full pointer-events-none overflow-hidden"
          >
            {/* Light Mode Thumb Layer */}
            <div
              className={`absolute inset-0 rounded-full bg-white border border-white/90 shadow-xs ${
                isLight ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* Dark Mode Thumb Layer */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400/30 shadow-[0_2px_8px_rgba(147,51,234,0.3)] ${
                !isLight ? "opacity-100" : "opacity-0"
              }`}
            />
          </motion.div>

          {/* Light / Sun Option */}
          <div
            className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ${
              isLight ? "text-amber-500" : "text-zinc-500 group-hover:text-zinc-300"
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${isLight ? "scale-110" : "scale-90 opacity-60"}`} />
          </div>

          {/* Dark / Moon Option */}
          <div
            className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ${
              !isLight ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"
            }`}
          >
            <Moon className={`w-3.5 h-3.5 ${!isLight ? "scale-110" : "scale-90 opacity-60"}`} />
          </div>
        </div>
      )}
    </button>
  );
}
