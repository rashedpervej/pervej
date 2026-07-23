import React, { useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { Lock, Mail, ArrowRight, Terminal, AlertCircle } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (session: any) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data?.session) {
        onLoginSuccess(data.session);
      } else {
        setError("Login succeeded but no active session was returned.");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Invalid credentials or authentication error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070708] px-4 py-12 relative selection:bg-purple-600/80 selection:text-white overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

      <div className="w-full max-w-md" id="login-container">
        {/* Portal Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-950/50 border border-purple-500/20 text-purple-400 mb-4 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-white">
            CMS Portal
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-950/40 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-300 text-xs leading-relaxed animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm outline-none transition-all duration-200"
                  placeholder="admin@portfolio.com"
                  id="email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-zinc-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm outline-none transition-all duration-200"
                  placeholder="••••••••"
                  id="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20"
              id="submit-login-btn"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Authenticate
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>


        </div>

        {/* System info */}
        <div className="text-center mt-6 text-[10px] text-zinc-600 font-mono space-y-2">
          <div>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, "", "/");
                window.dispatchEvent(new Event("popstate"));
              }}
              className="inline-flex items-center text-zinc-500 hover:text-purple-400 hover:underline transition-all cursor-pointer font-sans text-xs"
              id="back-to-site-link"
            >
              ← Back to Portfolio Site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
