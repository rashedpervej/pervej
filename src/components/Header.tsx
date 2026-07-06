import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ArrowUpRight, Download } from "lucide-react";
import { portfolioData } from "../data";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const navItems = [
    { label: "Home", href: "#hero" },
    { label: "About", href: "#about" },
    { label: "Experience", href: "#experience" },
    { label: "Projects", href: "#projects" },
    { label: "Services", href: "#services" },
    { label: "Skills", href: "#skills" },
    { label: "Contact", href: "#contact" }
  ];

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
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const downloadCV = () => {
    const info = portfolioData.personalInfo;
    const experiencesText = portfolioData.experiences
      .map(
        (exp) =>
          `• ${exp.role} — ${exp.company} (${exp.period})\n  Location: ${exp.location} | Type: ${exp.type}\n  ${exp.description.map((d) => `  - ${d}`).join("\n")}`
      )
      .join("\n\n");

    const cvContent = `=====================================================
RASHED PERVEJ — SENIOR VISUALIZER & ART DIRECTOR
=====================================================
Role: Senior Visualizer & Graphic Designer
Headline: Brand Identity | Motion Graphics | Packaging
Location: Jashore, Bangladesh
Email: ${info.email}
Phone/WhatsApp: ${info.phone}
LinkedIn: https://${info.linkedin}
Behance: https://${info.behance}

-----------------------------------------------------
PROFESSIONAL SUMMARY
-----------------------------------------------------
${info.aboutSummary}
${info.aboutDetail}

-----------------------------------------------------
WORK EXPERIENCE
-----------------------------------------------------
${experiencesText}

-----------------------------------------------------
CORE COMPETENCIES & TECHNICAL SKILLS
-----------------------------------------------------
Core: ${portfolioData.skills.coreCompetencies.join(", ")}
Creative Tools: ${portfolioData.skills.creativeTools.map((t) => `${t.name} (${t.level}%)`).join(", ")}

-----------------------------------------------------
SELECTED BRANDS WORKED WITH
-----------------------------------------------------
${portfolioData.selectedBrands.map((b) => `• ${b.logoText} (${b.market || "Bangladesh"})`).join("\n")}

-----------------------------------------------------
EDUCATION & CERTIFICATIONS
-----------------------------------------------------
${portfolioData.educationCertifications.map((e) => `• ${e.title} — ${e.institution} (${e.period})`).join("\n")}

Generated via Rashed Pervej's Premium Portfolio Site.
`;

    const blob = new Blob([cvContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Rashed_Pervej_Senior_Visualizer_CV.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <a href="#hero" className="flex items-center gap-2 group">
            <span className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-0.5">
              RASHED<span className="text-purple-500">.</span>P
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="font-sans text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={downloadCV}
              className="group relative inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-semibold text-white tracking-wide transition-all duration-300 overflow-hidden active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-purple-400 group-hover:translate-y-[1px] transition-transform" />
              Download CV
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
                {navItems.map((item, index) => (
                  <a
                    key={index}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-display font-medium text-lg text-zinc-300 hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      downloadCV();
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download CV
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
