import React, { useState, useEffect, useLayoutEffect } from "react";
import { PortfolioProvider, usePortfolio } from "./context/PortfolioContext";
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
import Admin from "./components/Admin";
import InvoiceMaker from "./components/InvoiceMaker";
import DynamicSection from "./components/DynamicSection";

function ScrollToTop({ currentPath }: { currentPath: string }) {
  useEffect(() => {
    // Disable default browser scroll restoration on route navigation
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    // Reset scroll immediately when path changes
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentPath]);

  useEffect(() => {
    // Secondary frame check to guarantee top scroll position after layout renders
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [currentPath]);

  return null;
}

function MainPortfolio() {
  const { getSectionOrder, isSectionVisible, getSectionRecord, siteSettings } = usePortfolio();
  const orderedSections = getSectionOrder();

  const isChatbotEnabled = siteSettings.enableChatbot !== false && (siteSettings.enableChatbot as any) !== "false";

  return (
    <div className="bg-[#030303] text-zinc-100 min-h-screen flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      <Header />
      <main className="flex-grow">
        {orderedSections.map((key) => {
          if (!isSectionVisible(key)) return null;

          switch (key) {
            case "hero":
              return <Hero key={key} />;
            case "about":
              return <About key={key} />;
            case "experience":
              return <Experience key={key} />;
            case "projects":
              return <Projects key={key} />;
            case "brands":
              return <Brands key={key} />;
            case "skills":
              return <Skills key={key} />;
            case "services":
              return <Services key={key} />;
            case "testimonials":
              return <Testimonials key={key} />;
            case "contact":
              return <Contact key={key} />;
            default: {
              const record = getSectionRecord(key);
              if (record) {
                return <DynamicSection key={key} section={record} />;
              }
              return null;
            }
          }
        })}
      </main>
      <Footer />
      {isChatbotEnabled && <AIChatBot />}
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);

    // Patch history pushState and replaceState to catch all internal route navigations
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  return (
    <PortfolioProvider>
      <ScrollToTop currentPath={currentPath} />
      {currentPath === "/admin" ? (
        <Admin />
      ) : currentPath === "/invoice-maker" ? (
        <InvoiceMaker />
      ) : (
        <MainPortfolio />
      )}
    </PortfolioProvider>
  );
}

