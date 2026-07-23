import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Download } from "lucide-react";
import { usePortfolio } from "../context/PortfolioContext";
import { scrollToSection } from "../utils/scroll";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");
  const { portfolioData, siteSettings, trackEvent, isSectionVisible } = usePortfolio();

  const allNavItems = [
    { label: "Home", href: "#hero", id: "hero" },
    { label: "About", href: "#about", id: "about" },
    { label: "Experience", href: "#experience", id: "experience" },
    { label: "Skills", href: "#skills", id: "skills" },
    { label: "Services", href: "#services", id: "services" },
    { label: "Projects", href: "#projects", id: "projects" },
    { label: "Contact", href: "#contact", id: "contact" }
  ];

  const navItems = allNavItems.filter((item) => isSectionVisible(item.id));

  useEffect(() => {
    const handleScroll = () => {
      // Background toggle
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Scroll progress indicator
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      }

      // Determine active section based on scroll position
      const scrollPos = window.scrollY + 100;
      for (const item of navItems) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    scrollToSection(href);
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadCV = async () => {
    const cvSource = siteSettings.cvSource || "upload";
    const url = siteSettings.cvUrl;
    
    // Original filename configured by user or fallback
    let fileName = siteSettings.cvFileName?.trim() || "Rashed_Pervej_CV.pdf";
    if (!fileName.toLowerCase().endsWith(".pdf")) {
      fileName += ".pdf";
    }

    // Track download analytics
    trackEvent("cv_download", {
      type: cvSource,
      fileName,
      timestamp: new Date().toISOString(),
    });

    if (!url) {
      alert("CV document has not been uploaded or configured yet. Please upload a PDF in Admin Settings.");
      return;
    }

    setIsDownloading(true);

    try {
      let blob: Blob | null = null;

      // 1. If stored in Supabase 'cv' bucket, download via Supabase Client API to avoid CORS and raw URL exposure
      if (isSupabaseConfigured && supabase && (url.includes("/storage/v1/object/") || url.includes("/cv/"))) {
        try {
          let storagePath = "";
          if (url.includes("/storage/v1/object/public/cv/")) {
            storagePath = url.split("/storage/v1/object/public/cv/")[1];
          } else if (url.includes("/storage/v1/object/sign/cv/")) {
            storagePath = url.split("/storage/v1/object/sign/cv/")[1]?.split("?")[0];
          } else if (url.includes("/cv/")) {
            storagePath = url.split("/cv/")[1]?.split("?")[0];
          }

          if (storagePath) {
            const decodedPath = decodeURIComponent(storagePath);
            const { data, error } = await supabase.storage.from("cv").download(decodedPath);
            if (!error && data) {
              blob = data;
            } else if (error) {
              console.warn("Supabase storage SDK download warning:", error);
            }
          }
        } catch (sErr) {
          console.warn("Error attempting Supabase SDK download:", sErr);
        }
      }

      // 2. Fallback to direct fetch to blob if not loaded via Supabase SDK or if url is a data URL / external URL
      if (!blob) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch CV file. Server returned status ${response.status}`);
        }
        blob = await response.blob();
      }

      // Ensure blob content type is application/pdf for consistency
      const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });

      // 3. Create temporary Object URL and trigger immediate forced download with original filename
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke object URL after brief timeout
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);

    } catch (err: any) {
      console.error("CV download failed:", err);
      alert(`Could not download CV file automatically: ${err.message || "Unknown error"}. Please check Admin Settings.`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-zinc-900 z-[100]">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled
            ? "py-4 bg-[#030303]/85 backdrop-blur-md border-b border-white/5"
            : "py-6 bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#hero"
            onClick={(e) => handleNavClick(e, "#hero")}
            className="flex items-center gap-2 group"
          >
            <span className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-0.5">
              RASHED<span className="text-purple-500">.</span>P
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item, index) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={index}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`font-sans text-xs uppercase tracking-widest transition-all duration-300 relative py-1 ${
                    isActive
                      ? "text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-500 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={downloadCV}
              disabled={isDownloading}
              className="group relative inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:brightness-110 text-xs font-semibold text-white tracking-wide transition-all duration-300 ease-out overflow-hidden active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {/* Glossy Shine Sweep Overlay */}
              <span className="absolute inset-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12" />

              <span className="relative z-10 inline-flex items-center gap-2">
                {isDownloading ? (
                  <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-purple-400 group-hover:translate-y-[1px] transition-transform" />
                )}
                {isDownloading ? "Downloading..." : "Download CV"}
              </span>
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 md:hidden text-zinc-300 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-b border-white/10 bg-[#050508]/98 backdrop-blur-lg overflow-hidden"
            >
              <div className="px-6 py-6 flex flex-col gap-5">
                {navItems.map((item, index) => {
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={index}
                      href={item.href}
                      onClick={(e) => {
                        setMobileMenuOpen(false);
                        handleNavClick(e, item.href);
                      }}
                      className={`font-display font-medium text-lg flex items-center justify-between transition-colors ${
                        isActive ? "text-purple-400 font-semibold" : "text-zinc-300 hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                    </a>
                  );
                })}
                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      downloadCV();
                    }}
                    disabled={isDownloading}
                    className="group relative flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 hover:brightness-110 text-sm font-semibold text-white transition-all duration-300 ease-out overflow-hidden cursor-pointer shadow-md hover:shadow-purple-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Glossy Shine Sweep Overlay */}
                    <span className="absolute inset-0 pointer-events-none -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12" />

                    <span className="relative z-10 inline-flex items-center gap-2">
                      {isDownloading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isDownloading ? "Downloading..." : "Download CV"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
