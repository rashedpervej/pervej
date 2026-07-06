import React, { useEffect, useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/About";
import Experience from "./components/Experience";
import Projects from "./components/Projects";
import Brands from "./components/Brands";
import Skills from "./components/Skills";
import Services from "./components/Services";
import Testimonials from "./components/Testimonials";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import AIChatBot from "./components/AIChatBot";

export default function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Dynamic light spotlight coords
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove as any);
    return () => window.removeEventListener("mousemove", handleMouseMove as any);
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 overflow-x-hidden relative selection:bg-purple-600/80 selection:text-white">
      {/* Subtle Mouse Spotlight Interactive overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 opacity-25"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.08), transparent 80%)`
        }}
      />

      {/* Decorative Global Background Noise/Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] z-50" />

      {/* Structured Single View Sections */}
      <Header />
      
      <main className="relative">
        <Hero />
        <About />
        <Experience />
        <Projects />
        <Brands />
        <Skills />
        <Services />
        <Testimonials />
        <Contact />
      </main>

      <Footer />

      {/* Floating AI Agent Assistant */}
      <AIChatBot />
    </div>
  );
}
