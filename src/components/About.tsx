import React from "react";
import { motion } from "motion/react";
import { GraduationCap, Award, Shield, FileCheck, CheckCircle2, ExternalLink } from "lucide-react";
import { usePortfolio } from "../context/PortfolioContext";
import FormattedText from "./FormattedText";

export default function About() {
  const { portfolioData, theme, isSectionVisible } = usePortfolio();
  const isLight = theme === "light";
  const info = portfolioData.personalInfo;
  const certs = portfolioData.educationCertifications || [];
  const isCertsVisible = isSectionVisible("educationCertifications");

  const highlights = [
    {
      icon: Award,
      title: "6+ Years Design Ops",
    },
    {
      icon: Shield,
      title: "Security Minded",
    },
    {
      icon: FileCheck,
      title: "Print-Ready Precision",
    }
  ];

  return (
    <section
      id="about"
      className={`py-10 sm:py-12 md:py-14 lg:py-16 relative overflow-hidden ${
        isLight ? "bg-transparent" : "bg-[#050508]"
      }`}
    >
      {/* Decorative Orbs */}
      <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-72 h-72 rounded-full blur-[100px] pointer-events-none ${
        isLight ? "bg-purple-200/30" : "bg-purple-900/5"
      }`} />

      <div className="max-w-7xl mx-auto content-gutter relative z-10">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-start mb-10 sm:mb-12 lg:mb-14 text-left"
        >
          <h2
            className={`font-display font-bold text-3xl sm:text-5xl tracking-tight leading-tight ${
              isLight ? "text-zinc-950" : "text-white"
            }`}
          >
            Creative Strategy & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
              Visual Narrative
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-start">
          {/* Left Side: Summary & Details */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`${isCertsVisible ? "lg:col-span-7" : "lg:col-span-12"} space-y-4 sm:space-y-6`}
          >
            <h3 className={`font-display font-medium text-lg sm:text-2xl ${isLight ? "text-zinc-900" : "text-zinc-100"}`}>
              "Visuals aren't just seen; they are experienced."
            </h3>
            <p className={`text-base sm:text-lg leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              <FormattedText content={info.aboutSummary} />
            </p>
            <p className={`text-base sm:text-lg leading-relaxed ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
              <FormattedText content={info.aboutDetail} />
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
                    className={`p-4 sm:p-5 rounded-2xl flex sm:flex-col items-center sm:items-start gap-3 sm:gap-3 group transition-all duration-300 ${
                      isLight
                        ? "bg-white/65 hover:bg-white/85 border border-white/90 hover:border-purple-300 shadow-xs hover:shadow-sm backdrop-blur-md"
                        : "bg-[#0d0e17]/80 hover:bg-[#121320]/90 border border-white/10 hover:border-purple-500/30 backdrop-blur-md shadow-xs"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isLight ? "bg-purple-100 border border-purple-200" : "bg-purple-500/10 border border-purple-500/10"
                    }`}>
                      <Icon className={`w-5 h-5 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
                    </div>
                    <div>
                      <h4 className={`font-display font-semibold text-xs sm:text-sm uppercase tracking-wide ${
                        isLight ? "text-zinc-800" : "text-zinc-100"
                      }`}>
                        {item.title}
                      </h4>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Side: Education & Certifications */}
          {isCertsVisible && (
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-5 space-y-4 sm:space-y-6"
            >
              <div className={`p-6 sm:p-8 rounded-2xl space-y-4 sm:space-y-6 ${
                isLight
                  ? "bg-white/65 backdrop-blur-xl border border-white/90 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]"
                  : "glass-panel border border-white/10"
              }`}>
                <h4 className={`font-display font-bold text-sm sm:text-base tracking-wide uppercase flex items-center gap-2 ${
                  isLight ? "text-zinc-900" : "text-white"
                }`}>
                  <GraduationCap className={`w-5 h-5 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
                  Education &amp; Certs
                </h4>
                <div className={`w-full h-[1px] ${isLight ? "bg-zinc-200/80" : "bg-white/10"}`} />

                <div className="space-y-4 sm:space-y-6">
                  {certs.length === 0 ? (
                    <p className={`text-xs ${isLight ? "text-zinc-500" : "text-zinc-400"} italic`}>
                      No certifications listed yet.
                    </p>
                  ) : (
                    certs.map((item, index) => (
                      <div key={index} className="flex gap-4 items-start relative group">
                        {/* Circle Bullet */}
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1.5 shrink-0 shadow-[0_0_6px_rgba(168,85,247,0.4)] group-hover:scale-125 transition-transform" />
                        
                        <div>
                          <h5 className={`font-display font-medium text-xs sm:text-sm leading-tight ${
                            isLight ? "text-zinc-900" : "text-zinc-200"
                          }`}>
                            {item.title}
                          </h5>
                          <p className={`font-sans text-xs mt-1 ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                            {item.institution}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-zinc-400">
                              {item.period}
                            </span>
                            {(item as any).credentialUrl && (
                              <a
                                href={(item as any).credentialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-0.5"
                              >
                                Verify <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Languages Highlight */}
                <div className={`pt-4 border-t ${isLight ? "border-zinc-200/80" : "border-white/5"}`}>
                  <h5 className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 mb-2">
                    LANGUAGES &amp; PROFICIENCY
                  </h5>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 ${isLight ? "text-purple-600" : "text-purple-400"}`} />
                    <span className={`font-sans text-xs ${isLight ? "text-zinc-700" : "text-zinc-300"}`}>
                      English — Professional proficiency for global teams
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
