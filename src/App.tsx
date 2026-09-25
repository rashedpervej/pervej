import React, { useState, useEffect, useLayoutEffect, Suspense, lazy } from "react";
import { PortfolioProvider, usePortfolio } from "./context/PortfolioContext";
import ErrorBoundary from "./components/ErrorBoundary";
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
import DynamicBackground from "./components/DynamicBackground";

// Resilient lazy-load for route-level components with automatic retry on chunk loading errors
const Admin = lazy(() =>
  import("./components/Admin").catch((err) => {
    console.error("Failed to load Admin module chunk, retrying once...", err);
    return new Promise<{ default: React.ComponentType<any> }>((resolve) =>
      setTimeout(resolve, 500)
    ).then(() => import("./components/Admin"));
  })
);
const InvoiceMaker = lazy(() => import("./components/InvoiceMaker"));
const AIChatBot = lazy(() => import("./components/AIChatBot"));
const DynamicSection = lazy(() => import("./components/DynamicSection"));

class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  override state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Admin portal render error caught:", error, info);
  }
  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#070708] text-white p-6">
          <div className="max-w-md w-full p-8 rounded-2xl bg-[#121214] border border-red-500/30 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/30 mx-auto flex items-center justify-center text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Admin Portal Recovery</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred while loading the Admin module."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Reload Admin
              </button>
              <a
                href="/"
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Return to Site
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Elegant lightweight route loading fallback
function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090a0f] text-zinc-300">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        <span className="text-xs font-mono tracking-widest uppercase text-zinc-500">Loading module...</span>
      </div>
    </div>
  );
}

function safeScrollToTop() {
  try {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  } catch (_) {
    try {
      window.scrollTo(0, 0);
    } catch (_) {}
  }
}

function ScrollToTop({ currentPath }: { currentPath: string }) {
  useEffect(() => {
    // Disable default browser scroll restoration on route navigation
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch (_) {}
  }, []);

  useLayoutEffect(() => {
    // Reset scroll safely when path changes
    safeScrollToTop();
  }, [currentPath]);

  useEffect(() => {
    // Secondary frame check to guarantee top scroll position after layout renders
    const frame = requestAnimationFrame(() => {
      safeScrollToTop();
    });
    return () => cancelAnimationFrame(frame);
  }, [currentPath]);

  return null;
}

function MainPortfolio() {
  const { getSectionOrder, isSectionVisible, getSectionRecord, siteSettings, theme } = usePortfolio();
  const orderedSections = getSectionOrder();
  const isLight = theme === "light";

  const isChatbotEnabled = siteSettings.enableChatbot !== false && (siteSettings.enableChatbot as any) !== "false";

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-purple-600 selection:text-white relative overflow-x-clip ${
        isLight ? "portfolio-canvas bg-[#f0f3fa] text-zinc-900" : "bg-[#090a0f] text-zinc-100"
      }`}
    >
      {/* Dynamic Custom CSS from Site Settings */}
      {siteSettings.customCss && (
        <style id="portfolio-custom-css" dangerouslySetInnerHTML={{ __html: siteSettings.customCss }} />
      )}

      {/* Responsive Dynamic Atmospheric Background Stage */}
      <DynamicBackground />

      <Header />
      <main className="flex-grow relative z-10">
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
            case "educationCertifications":
            case "education_certifications":
              return null;
            default: {
              const record = getSectionRecord(key);
              if (record) {
                return (
                  <Suspense key={key} fallback={null}>
                    <DynamicSection section={record} />
                  </Suspense>
                );
              }
              return null;
            }
          }
        })}
      </main>
      <Footer />
      {isChatbotEnabled && (
        <Suspense fallback={null}>
          <AIChatBot />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);

    // Patch history pushState and replaceState safely bound to history instance
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    if (typeof originalPushState === "function") {
      window.history.pushState = function (...args) {
        try {
          originalPushState.apply(window.history, args);
        } catch (_) {}
        handleLocationChange();
      };
    }

    if (typeof originalReplaceState === "function") {
      window.history.replaceState = function (...args) {
        try {
          originalReplaceState.apply(window.history, args);
        } catch (_) {}
        handleLocationChange();
      };
    }

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      if (typeof originalPushState === "function") {
        window.history.pushState = originalPushState;
      }
      if (typeof originalReplaceState === "function") {
        window.history.replaceState = originalReplaceState;
      }
    };
  }, []);

  const normalizedPath = currentPath.toLowerCase().replace(/\/+$/, "") || "/";
  const isAdminRoute = normalizedPath === "/admin";
  const isInvoiceRoute = normalizedPath === "/invoice-maker";

  return (
    <ErrorBoundary>
      <PortfolioProvider>
        <ScrollToTop currentPath={currentPath} />
        {isAdminRoute ? (
          <AdminErrorBoundary>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Admin />
            </Suspense>
          </AdminErrorBoundary>
        ) : isInvoiceRoute ? (
          <Suspense fallback={<RouteLoadingFallback />}>
            <InvoiceMaker />
          </Suspense>
        ) : (
          <MainPortfolio />
        )}
      </PortfolioProvider>
    </ErrorBoundary>
  );
}

