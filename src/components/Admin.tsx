import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
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
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          await fetchUserRole(currentSession.user.id, currentSession.user.email);
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
          setSession(newSession);
          if (newSession?.user) {
            await fetchUserRole(newSession.user.id, newSession.user.email);
          } else {
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

    // Auto-promote the owner to admin role
    if (email === "rashedpervej2011@gmail.com" || email === "admin@portfolio.com") {
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

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", userId)
        .single();

      if (data && !error) {
        setUserRole(data.role as "admin" | "editor");
      } else {
        // If no explicit role in user_roles table, default to editor
        setUserRole("editor");
      }
    } catch (err) {
      console.warn("Failed to fetch user role from table. Defaulting to Editor.", err);
      setUserRole("editor");
    }
  };

  const handleLoginSuccess = (newSession: any) => {
    setSession(newSession);
    if (newSession?.user) {
      fetchUserRole(newSession.user.id, newSession.user.email);
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
      <div className="min-h-screen flex items-center justify-center bg-[#070708] text-zinc-300">
        <div className="flex flex-col items-center gap-4">
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
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AdminDashboard user={activeUser} onLogout={handleLogout} />
  );
}
