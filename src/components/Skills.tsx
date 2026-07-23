import React from "react";
import { usePortfolio } from "../context/PortfolioContext";
import { motion } from "motion/react";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import { 
  Award, 
  Zap, 
  Package, 
  Film, 
  Shield, 
  Palette, 
  Sparkles, 
  Monitor, 
  ChevronRight, 
  Brain 
} from "lucide-react";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 18,
      mass: 0.8
    }
  }
};

// Universal typography controllers for Creative Tools section
const TOOL_TEXT = {
  name: "block font-sans text-xs font-normal text-zinc-300 group-hover:text-white transition-colors duration-300 truncate px-1",
  percentage: "block font-sans text-[12px] text-[#C18DEC]-500 font-medium",
};


export default function Skills() {
  const { portfolioData } = usePortfolio();
  const skillsData = portfolioData.skills;
  const [sectionRef, isInViewport] = useIntersectionObserver({ threshold: 0.1, triggerOnce: true });

  const getCompetencyIcon = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes("brand")) {
      return <Award className="w-4 h-4 text-purple-400" />;
    }
    if (norm.includes("visual design") || norm.includes("storytelling")) {
      return <Zap className="w-4 h-4 text-amber-400" />;
    }
    if (norm.includes("packaging") || norm.includes("print")) {
      return <Package className="w-4 h-4 text-sky-400" />;
    }
    if (norm.includes("motion")) {
      return <Film className="w-4 h-4 text-emerald-400" />;
    }
    if (norm.includes("leadership") || norm.includes("team")) {
      return <Shield className="w-4 h-4 text-rose-400" />;
    }
    if (norm.includes("direction") || norm.includes("creative")) {
      return <Palette className="w-4 h-4 text-fuchsia-400" />;
    }
    if (norm.includes("ai")) {
      return <Sparkles className="w-4 h-4 text-teal-400" />;
    }
    if (norm.includes("ui/ux") || norm.includes("visuals")) {
      return <Monitor className="w-4 h-4 text-indigo-400" />;
    }
    return <Award className="w-4 h-4 text-purple-400" />;
  };

  const getToolBranding = (name: string) => {
    const norm = name.toLowerCase();
    if (norm.includes("photoshop") || norm.includes("ps")) {
      return {
        logo: (
          <div className="w-12 h-12 rounded-xl bg-[#001e36] border-2 border-[#00c8ff] flex items-center justify-center shadow-lg shadow-[#00c8ff]/10">
            <span className="font-sans font-black text-lg text-[#00c8ff] tracking-tight">Ps</span>
          </div>
        ),
        accentColor: "bg-[#00c8ff]",
      };
    }
    if (norm.includes("illustrator") || norm === "ai" || norm === "adobe ai") {
      return {
        logo: (
          <div className="w-12 h-12 rounded-xl bg-[#261300] border-2 border-[#ff9a00] flex items-center justify-center shadow-lg shadow-[#ff9a00]/10">
            <span className="font-sans font-black text-lg text-[#ff9a00] tracking-tight">Ai</span>
          </div>
        ),
        accentColor: "bg-[#ff9a00]",
      };
    }
    if (norm.includes("after effects") || norm.includes("ae")) {
      return {
        logo: (
          <div className="w-12 h-12 rounded-xl bg-[#060247] border-2 border-[#2F207E] flex items-center justify-center shadow-lg shadow-[#8a81bd]/10">
            <span className="font-sans font-black text-lg text-[#8A77F6] tracking-tight">Ae</span>
          </div>
        ),
        accentColor: "bg-[#8A77F6]",
      };
    }
    if (norm.includes("canva")) {
      return {
        logo: (
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center shadow-lg shadow-[#7928eb]/20">
            <svg viewBox="0 0 253.43 255" className="w-full h-full">
              <defs>
                <linearGradient id="canva-new-grad" x1="27.63" y1="11.42" x2="226.26" y2="248.14" gradientUnits="userSpaceOnUse">
                  <stop offset="0.08" stopColor="#03c0cd" />
                  <stop offset="0.5" stopColor="#3275e4" />
                  <stop offset="0.84" stopColor="#7928eb" />
                </linearGradient>
              </defs>
              <rect fill="url(#canva-new-grad)" x="-0.21" y="2.54" width="253.41" height="253.41" />
              <path fill="#ffffff" d="M185.38,155.14c-1.04,0-1.96.88-2.91,2.8-10.77,21.84-29.38,37.3-50.91,37.3-24.9,0-40.31-22.47-40.31-53.52,0-52.59,29.3-83,55.04-83,12.03,0,19.37,7.56,19.37,19.59,0,14.27-8.11,21.83-8.11,26.87,0,2.26,1.41,3.63,4.19,3.63,11.2,0,24.34-12.87,24.34-31.05s-15.34-30.58-41.08-30.58c-42.53,0-80.34,39.43-80.34,93.99,0,42.23,24.12,70.14,61.33,70.14,39.5,0,62.33-39.3,62.33-52.05,0-2.82-1.44-4.12-2.95-4.12Z" />
            </svg>
          </div>
        ),
        accentColor: "bg-[#7928eb]",
      };
    }
    if (norm.includes("capcut")) {
      return {
        logo: (
          <div className="w-12 h-12 rounded-xl bg-white border border-white/10 flex items-center justify-center p-2.5 shadow-lg overflow-hidden">
            <svg viewBox="0 0 924.47 708.98" className="w-full h-full text-black">
              <path fill="#000000" d="M4.07,125.83C11,64.89,61.15,18,122.42,15.18h521.38c37.85,3.12,72.3,23.07,93.85,54.34,9.59,14.07,16.35,29.87,19.92,46.51l153.22-75.97c3.36-1.68,7.45-.32,9.14,3.04.34.68.57,1.42.66,2.18v86.15c.12,5.89-3.39,11.25-8.84,13.49-140.96,69.91-281.94,139.9-422.95,209.98l421.99,208.77c5.51,1.91,9.36,6.91,9.8,12.73v86.28c.03,3.9-3.11,7.08-7.01,7.11-1.53.01-3.02-.48-4.25-1.38-50.27-25.45-101.24-49.44-151.12-75.4-3.35,12.06-7.83,23.77-13.36,35-17.09,31.45-46.63,54.24-81.38,62.8-11.5,2.42-23.26,3.38-35,2.86H142.53c-10.94,0-21.95,0-32.83-.83-56.44-8.45-99.94-54.13-105.63-110.91v-83.48c.94-7.1,5.9-13.03,12.73-15.21,86.66-42.82,173.14-86.03,259.93-128.66-87.43-43.52-174.92-86.92-262.47-130.19-6.08-2.68-10.02-8.69-10.05-15.33-.13-27.68-.57-55.49-.13-83.23ZM100.66,126.4c-5.22,10.5-2.8,22.65-3.25,33.98,95.44,47.15,190.19,94.55,285.44,141.39,94.13-46.66,188.3-93.32,282.52-139.99,0-8.46.38-16.93,0-25.45-2.29-15.76-15.89-27.4-31.81-27.23H129.74c-12.26-.41-23.64,6.35-29.14,17.31h.06ZM97.41,548.65c.45,11.45-2.04,23.8,3.5,34.42,5.67,10.66,16.88,17.19,28.95,16.86h504.14c11.37.09,21.91-5.97,27.55-15.84,6.36-11.14,3.44-24.5,4.07-36.71-94.36-46.58-188.6-93.92-283.15-139.99-95.32,47.09-190.36,94.17-285.13,141.26h.06Z" />
            </svg>
          </div>
        ),
        accentColor: "#000000",
      };
    }
    if (norm.includes("wordpress")) {
      return {
        logo: (
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg border border-[#21759b]/50 flex items-center justify-center bg-[#21759b]">
            <svg viewBox="0 0 512 512" className="w-full h-full">
              <rect width="512" height="512" fill="#21759b" rx="15%" />
              <circle cx="256" cy="256" r="190" fill="none" stroke="#ffffff" strokeWidth="20" />
              <path fill="#ffffff" d="M204 436l56-164 58 159 29-16 56-162c10-26 13-47 13-65 1-33-13-62-37-65-22-2-34 19-33 32 2 30 32 47 32 88 0 30-19 77-32 122l-65-194c11-1 21-1 21-1 10-1 9-16-1-15-33 3-63 2-96 0-10-1-11 14-1 15 0 0 9 0 19 1l28 77-40 119-65-196c11-1 20-1 20-1 10-1 9-16-1-15-30 2-59 4-66-1l-9 25 88 243z" />
            </svg>
          </div>
        ),
        accentColor: "bg-[#21759b]",
      };
    }
    if (norm.includes("ai")) {
      return {
        logo: (
          <div className="w-12 h-12 rounded-xl bg-[#0a2119] border border-[#0a4a2e] flex items-center justify-center p-2 shadow-lg shadow-[#62BB46]/10 overflow-hidden">
            <svg viewBox="0 0 153.15 165.65" className="w-full h-full">
              <g fill="#09b26d">
                <g>
                  <g>
                    <g>
                      <path d="M75.8,4.82c1.52,0.89,1.7-0.67,2.39-1.15c8.1-5.59,16.34-3.4,24.79,0.3c5.85,2.56,20.12,11.31,23.06,16.74c2.42,4.46,2.49,9.45,1.42,14.28c6.54,1.24,13.1,6.76,15.63,12.9c1.25,3.05,2.36,7.96,2.04,11.22c-0.14,1.47-1.19,3.46-0.81,4.77c0.22,0.76,3.59,4.67,4.43,6.65c3.22,7.61,2.5,15.13-1.78,22.12c7.11,11.19,3.62,25.98-7.6,32.89c0.57,11.03-4.14,19.72-13.47,25.35c-1.21,0.73-2.97,0.99-4,1.75c-1.11,0.82-2.2,3.08-3.29,4.22c-10.27,10.8-27.38,11.62-38.07,0.89c-0.96-0.96-3.07-4.6-3.35-4.68c-1.82-0.5-1.82,1.49-2.83,2.77c-9.97,12.62-28.95,12.43-39.79,1.02c-1.07-1.12-2.02-3.13-3.06-4.02c-1.23-1.06-3.03-1.21-4.25-1.94c-9.3-5.59-14.05-14.37-13.46-25.35c-11.24-6.97-14.75-21.69-7.6-32.89c0.06-0.63-1.53-2.45-1.87-3.3c-2.59-6.41-2.61-12.81,0.23-19.12c0.8-1.78,4.1-5.69,4.29-6.35c0.39-1.36-0.63-3-0.77-4.37c-0.43-4.15,0.99-10.02,3.05-13.67c2.92-5.18,8.71-9.77,14.58-10.85c-1.48-6.09-0.57-12.22,3.37-17.19c2.67-3.36,16.8-11.93,21.11-13.82c8.46-3.72,16.71-5.87,24.79-0.3C75.44,3.98,75.62,4.71,75.8,4.82z M73.05,35.88V12.67c0-0.32-1.91-2.84-2.44-3.3c-5.82-5.04-14.92-0.27-20.79,2.63c-0.83,1.26,2.09,1.92,2.72,2.4c1.41,1.07,4.98,4.55,5.65,6.06c1.36,3.04,0.46,6.51-3.37,6.06c-2.54-0.29-2.43-2.23-3.69-3.86c-6.78-8.76-20.71-2.21-19.17,8.12c0.69,4.63,3.47,3.37,6.6,4.45c5.35,1.84,10.21,5.45,12.98,10.46c1.62,2.91,5.56,13.82,0.85,14.88c-5.92,1.34-4.28-5.74-6.01-9.72c-6.53-15.04-29.2-11.59-31.22,4.32c-0.54,4.22,1.07,6.01,1.25,9.32c0.2,3.6-3.55,4.86-5.14,8.02c-4.29,8.52-0.41,19.31,8.49,22.65c3.56,1.34,10.49,0.45,9.51,5.51c-0.75,3.86-7.61,2.34-10.36,1.53c-1.72-0.5-7.11-3.76-7.94-3.48c-0.49,0.16-1.4,3.58-1.49,4.28c-0.83,6.22,1.87,11.84,6.76,15.58c1.25,0.96,3.89,1.85,4.54,2.97c0.88,1.52-0.19,7.1,0.13,9.61c0.66,5.24,4.91,10.55,9.29,13.26c1.83,1.14,5.27,1.92,6.45,3.06c0.73,0.71,1.41,2.42,2.18,3.35c11.26,13.56,30.5,8.1,34.25-8.57l0.01-94.67c-0.22-1.71-1.95-4.09-3.34-5.06c-3.1-2.16-8.36-0.26-7.76-5.55C62.65,30.89,72.47,36.45,73.05,35.88z M80.12,12.67v34.27c3.26-0.58,11.11-3.79,11.1,1.99c-0.01,4.38-4.47,2.73-7.62,4.8c-0.71,0.47-3.47,3.62-3.47,4.04v62.36l0.88,0.44c2.37-2.94,15.87-10.94,15.92-3.04c0.02,3.38-4.1,3.57-6.57,4.87c-22.59,11.96-4.37,45.55,17.86,33.78c4.93-2.61,6.25-7.46,8.81-9.32c2.99-2.17,6.74-1.81,10.4-5.94c5.73-6.47,4.41-10.04,4.52-17.7c0.04-2.76,3.29-3.32,5.23-4.85c4.52-3.57,7.29-9.17,6.59-15.01c-0.07-0.56-1.07-4.35-1.26-4.49c-1.01-0.75-5.62,2.41-7.25,2.99c-3.28,1.16-11.94,3.22-11.39-2.52c0.33-3.48,4.8-2.8,7.55-3.54c10.12-2.71,15.29-13.79,10.49-23.3c-1.14-2.26-4.74-4.76-5.1-6.42c-0.5-2.33,1.04-4.67,1.27-6.95c1.8-18.06-23.48-25.2-31.16-8.6c-1.33,2.87-0.88,9.4-3.68,10.03c-8.07,1.82-3.66-11.19-1.61-14.88c2.8-5.05,7.6-8.58,13-10.44c3.21-1.11,5.92,0.08,6.59-4.46c1.53-10.32-12.1-16.83-19.17-8.12c-1.54,1.9-1.5,4.25-4.79,3.86c-2.98-0.35-3.31-3.41-2.41-5.75c0.64-1.67,4.28-5.23,5.78-6.37c0.63-0.48,3.55-1.14,2.72-2.4c-5.87-2.9-14.96-7.67-20.79-2.63C81.94,9.9,80.26,12.06,80.12,12.67z" />
                    </g>
                  </g>
                  <path d="M55.62,69.76c0.78-0.51,1.66-1.9,2.81-2.28c2.11-0.69,4.53,0.37,4.76,2.74c0.46,4.73-10.03,9.29-14.02,9.67c-1.82,4.43-3.47,8.59-7.63,11.39c-2.92,1.96-12.94,5.51-13.59,0.07c-0.54-4.44,4.01-3.74,6.82-4.63c2.79-0.88,5.56-3.59,6.43-6.35c-7.06-2.83-12.36-5.22-16.06-12.26c-1.82-3.46-6.22-16.14,1.6-14.44c3.25,0.71,2.15,3.8,2.57,5.85C31.91,72.23,44.91,76.81,55.62,69.76z" />
                  <path d="M49.32,107.24c-2.83,2.65-5.8,8.54-5.03,12.46c0.25,1.27,2.61,1.63,3.76,2.43c3.42,2.39,6.58,6.03,8.27,9.87c1.34,3.05,4.53,12.43-0.78,13.11c-4.78,0.61-3.71-3.79-4.19-6.38c-0.96-5.25-5.32-10.34-10.28-12.28c-3.22-1.26-10.86-0.5-9.27-5.52c1.1-3.47,4.26-1.68,5.21-2.78c0.77-0.89,0.84-4.53,1.22-5.86c2.57-9.1,13.34-17.77,23.07-16.24c3.79,0.6,3.65,5.76,0.37,6.51C56.57,103.75,53.67,103.17,49.32,107.24z" />
                  <path d="M108.57,84.83c2.5,2.48,5.06,2.23,7.94,2.9c4.23,0.99,3.9,6.48,0.13,7c-7.15,0.98-13.89-4.58-16.77-10.69c-0.46-0.99-0.43-2.54-1.17-3.26c-0.97-0.94-3.21-0.88-4.41-1.34c-3.45-1.33-11.59-5.31-9.51-9.94c2.23-4.94,8.07,1.82,10.74,2.96c8.54,3.64,18.91-1,21.88-9.7c1.03-3.01-0.07-8.16,3.67-8.72c8.41-1.28,2.06,14.23-0.51,17.63c-1.97,2.6-5.38,5.33-8.35,6.68c-1.1,0.5-5.5,1.72-5.79,2.18C105.92,81.31,107.94,84.2,108.57,84.83z" />
                  <path d="M113.13,105.92c3.85,3.89,5.95,10.01,6.54,15.35c0.55,0.81,2.71,0.05,4.04,0.83c1.65,0.96,2.02,3.81,0.83,5.31c-1.6,2.02-3.72,1.04-5.7,1.38c-5.85,1.01-11.59,6.53-12.96,12.25c-0.57,2.41,0.07,8.04-4.11,7.45c-5.6-0.8-2.6-9.95-1.03-13.47c1.84-4.13,4.77-7.14,8.42-9.72c1.89-1.33,3.83-0.69,3.65-3.77c-0.37-6.49-6.25-13.91-12.7-15.2c-2.28-0.45-6.28,0.68-7.05-2.66c-1.83-7.89,11.29-3.61,14.85-1.6C109.29,102.84,112.06,104.83,113.13,105.92z" />
                </g>
              </g>
            </svg>
          </div>
        ),
        accentColor: "bg-[#62BB46]",
      };
    }
    return {
      logo: (
        <div className="w-12 h-12 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center shadow-lg">
          <span className="font-sans font-black text-lg text-purple-400 tracking-tight">
            {name.substring(0, 2).toUpperCase()}
          </span>
        </div>
      ),
      accentColor: "bg-purple-500",
    };
  };

  // Dynamic grid with custom balance logic to support auto-adaptation and row-balancing
  const toolsList = skillsData.creativeTools;

  const getGridSpanClass = (idx: number, total: number) => {
    // Desktop (4 columns, base span = 3)
    const remLg = total % 4;
    const isLastRowLg = remLg > 0 && idx >= total - remLg;
    let lgSpan = "lg:col-span-3";
    if (isLastRowLg) {
      if (remLg === 1) lgSpan = "lg:col-span-12";
      if (remLg === 2) lgSpan = "lg:col-span-6";
      if (remLg === 3) lgSpan = "lg:col-span-4";
    }

    // Tablet (3 columns, base span = 4)
    const remMd = total % 3;
    const isLastRowMd = remMd > 0 && idx >= total - remMd;
    let mdSpan = "md:col-span-4";
    if (isLastRowMd) {
      if (remMd === 1) mdSpan = "md:col-span-12";
      if (remMd === 2) mdSpan = "md:col-span-6";
    }

    // Mobile (2 columns, base span = 6)
    const remSm = total % 2;
    const isLastRowSm = remSm > 0 && idx >= total - remSm;
    let smSpan = "col-span-6";
    if (isLastRowSm) {
      if (remSm === 1) smSpan = "col-span-12";
    }

    return `${smSpan} ${mdSpan} ${lgSpan}`;
  };

  return (
    <section ref={sectionRef} id="skills" className="py-24 bg-[#030303] relative overflow-hidden">
      {/* Decorative Blur elements */}
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-purple-950/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Title */}
        <div className="flex flex-col items-start mb-16 text-left">
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-white tracking-tight">
            Craftsmanship & <br />
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Technical Expertise
            </span>
          </h2>
          <div className="w-12 h-[2px] bg-purple-500 mt-4" />
        </div>

        {/* Competencies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Core Competencies */}
          <div className="lg:col-span-5 p-6 rounded-2xl bg-[#07070a]/80 border border-white/[0.04] backdrop-blur-sm">
            <h3 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-300 mb-6 flex items-center">
              CORE COMPETENCIES 
              <span className="text-purple-500 ml-1.5">•</span>
            </h3>
            
            <motion.div 
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
            >
              {skillsData.coreCompetencies.map((comp, idx) => (
                <motion.div
                  key={idx}
                  variants={cardVariants}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#0c0c12]/60 border border-white/[0.03] hover:border-purple-500/30 hover:bg-[#0c0c16] transition-colors duration-300 group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-purple-500/20 transition-all duration-300">
                      {getCompetencyIcon(comp)}
                    </div>
                    <span className="font-display text-sm text-zinc-200 font-medium group-hover:text-white transition-colors duration-300">
                      {comp}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all duration-300" />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Creative Tools */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl bg-[#07070a]/80 border border-white/[0.04] backdrop-blur-sm text-left">
              <h3 className="font-display font-bold text-xs uppercase tracking-widest text-zinc-300 mb-8 flex items-center">
                CREATIVE TOOLS & SOFTWARE PROFICIENCY
                <span className="text-purple-500 ml-1.5">•</span>
              </h3>

              <div className="grid grid-cols-12 gap-4">
                {toolsList.map((tool, idx) => {
                  const branding = getToolBranding(tool.name);
                  const spanClass = getGridSpanClass(idx, toolsList.length);
                  return (
                    <div
                      key={idx}
                      className={`${spanClass} flex flex-col items-center justify-between p-5 pt-6 pb-5 rounded-2xl bg-[#0c0c12]/60 border border-white/[0.03] hover:border-purple-500/30 hover:bg-[#0c0c16] hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/[0.02] transition-all duration-300 text-center group cursor-pointer`}
                    >
                      <div className="mb-3 transform group-hover:scale-105 transition-transform duration-300">
                        {branding.logo}
                      </div>
                      <div className="space-y-3 mb-3 w-full">
                        <span className={TOOL_TEXT.name}>
                          {tool.name.replace("Adobe ", "")}
                        </span>
                        <span className={TOOL_TEXT.percentage}>
                          {tool.level}%
                        </span>
                      </div>
                      {/* Compact Progress Bar */}
                      <div className="h-[6px] w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/[0.03]">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: isInViewport ? `${tool.level}%` : "0%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom: Visual Artistry Principle Information Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/20 to-[#07070a]/60 border border-purple-500/15 text-left flex gap-4 items-start shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/[0.02]">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <span className="font-display font-bold text-xs text-purple-400 uppercase tracking-widest block mb-2">
                  VISUAL ARTISTRY PRINCIPLE
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Rashed integrates modern generative AI tooling directly into standard Adobe production pipelines, accelerating iteration times by up to 40% while preserving absolute pre-press layout precision.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
