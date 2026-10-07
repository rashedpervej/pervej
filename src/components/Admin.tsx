import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import DynamicBackground from "./DynamicBackground";
import { usePortfolio } from "../context/PortfolioContext";

export interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "editor";
}

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<"admin" | "editor">("editor");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { refreshData } = usePortfolio();

  // Check current session on mount
  useEffect(() => {
    async function checkAuth() {
      if (!isSupabaseConfigured || !supabase) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Supabase session check error:", error);
        }
        const currentSession = data?.session || null;
        if (currentSession?.user) {
          if (currentSession.user.email !== "rashedpervej2011@gmail.com") {
            console.warn("Unauthorized user attempted admin access. Terminating session.");
            await supabase.auth.signOut();
            setSession(null);
            setUserRole("editor");
          } else {
            setSession(currentSession);
            await fetchUserRole(currentSession.user.id, currentSession.user.email);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error("Error checking auth status:", err);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();

    // Set up auth state change listener
    let authListener: any = null;
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          if (newSession?.user) {
            if (newSession.user.email !== "rashedpervej2011@gmail.com") {
              console.warn("Unauthorized user authenticated. Revoking session.");
              await supabase.auth.signOut();
              setSession(null);
              setUserRole("editor");
            } else {
              setSession(newSession);
              await fetchUserRole(newSession.user.id, newSession.user.email);
            }
          } else {
            setSession(null);
            setUserRole("editor");
          }
        }
      );
      authListener = subscription;
    }

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const fetchUserRole = async (userId: string, email?: string) => {
    if (!supabase) return;

    // Strict single admin validation
    if (email === "rashedpervej2011@gmail.com") {
      setUserRole("admin");
      try {
        await supabase
          .from("user_roles")
          .upsert({ id: userId, role: "admin" });
      } catch (e) {
        console.warn("Could not upsert admin role to database, fallback to memory", e);
      }
      return;
    }

    // Any other user is unauthorized
    setUserRole("editor");
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleLoginSuccess = async (newSession: any) => {
    if (newSession?.user?.email !== "rashedpervej2011@gmail.com") {
      if (supabase) await supabase.auth.signOut();
      setSession(null);
      alert("Access Denied: Only the authorized portfolio administrator can access this panel.");
      return;
    }
    setSession(newSession);
    if (newSession?.user) {
      await fetchUserRole(newSession.user.id, newSession.user.email);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUserRole("editor");
    // Trigger data refresh on logout
    refreshData();
  };

  if (isCheckingAuth) {
    return (
      <div id="admin-portal" data-admin-portal="true" className="dark min-h-screen flex items-center justify-center bg-[#070708] text-zinc-300 relative overflow-hidden" style={{ colorScheme: "dark" }}>
        <DynamicBackground />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm font-mono text-zinc-500">Establishing Secure Session...</p>
        </div>
      </div>
    );
  }

  const activeUser: AdminUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email || "user@portfolio.com",
        role: userRole,
      }
    : null;

  if (!activeUser) {
    return (
      <div id="admin-portal" data-admin-portal="true" className="dark relative min-h-screen overflow-hidden bg-[#070708] text-zinc-100" style={{ colorScheme: "dark" }}>
        <DynamicBackground />
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div id="admin-portal" data-admin-portal="true" className="dark relative h-screen w-full overflow-hidden bg-[#070708] text-zinc-100" style={{ colorScheme: "dark" }}>
      <DynamicBackground />
      <AdminDashboard user={activeUser} onLogout={handleLogout} />
    </div>
  );
}
