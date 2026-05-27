import React, { useState } from "react";
import { Shield, Eye, Lock, ArrowLeft, Loader2, Sparkles } from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"choose" | "admin_login">("choose");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVisitorEnter = () => {
    // Immediate, bypass-free guest visitor entry
    onLoginSuccess(
      {
        id: "visitor",
        email: "visitor@daattendance.org",
        name: "Guest Visitor",
        role: "visitor"
      },
      "token-visitor-guest-session"
    );
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@gmail.com",
          password: password
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect password entered");
      }
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-root" className="min-h-[80vh] flex flex-col justify-center items-center px-4 sm:px-6">
      
      {/* Logo & Headline */}
      <div className="text-center mb-8 max-w-md">
        <span className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-[#FF007A] to-[#BC00DD] text-white rounded-2xl mx-auto shadow-md">
          <Sparkles className="w-6.5 h-6.5 animate-pulse" />
        </span>
        <h2 className="mt-4 text-3xl font-display font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          DaAttendance
        </h2>
        <p className="text-xs font-bold text-slate-550 uppercase tracking-widest mt-1.5 dark:text-purple-300/40">
          Sunday School Attendance Hub
        </p>
      </div>

      <div className="w-full max-w-lg">
        {mode === "choose" ? (
          <div className="space-y-6">
            
            {/* Header prompt with high-contrast text */}
            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-purple-100 tracking-tight">
                Choose Access Profile Group To Proceed
              </h3>
              <p className="text-sm font-semibold text-slate-650 mt-2 dark:text-purple-300/60 max-w-md mx-auto">
                Please select your credentials group below to access the Sunday School roll call desk.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Admin Selector Card - Redesigned for High Contrast */}
              <button
                id="btn-select-admin-role"
                onClick={() => {
                  setError(null);
                  setMode("admin_login");
                }}
                className="group flex flex-col items-center justify-between p-6 bg-white dark:bg-[#191433]/85 border-2 border-slate-350 hover:border-indigo-600 dark:border-purple-500/25 dark:hover:border-[#00E5FF] rounded-3xl transition-all duration-300 hover:-translate-y-1 text-center shadow-md shadow-slate-100/90 dark:shadow-none hover:shadow-xl hover:shadow-indigo-100/50 cursor-pointer min-h-[260px]"
              >
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-150/40 dark:bg-purple-950/45 dark:border-purple-500/30 text-indigo-600 dark:text-[#00E5FF] flex items-center justify-center mb-4 transition duration-300 group-hover:scale-110 shadow-xs">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-[#00E5FF] transition">
                    Admin Entrance
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-purple-200/65 mt-2 font-bold leading-relaxed px-2">
                    Enter credentials to record attendance, manage rosters, and register campus facilities.
                  </p>
                </div>
                
                <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-indigo-600 group-hover:translate-x-1 transition duration-200 dark:text-[#00E5FF]">
                  Access Panel &rarr;
                </span>
              </button>

              {/* Visitor Selector Card - Redesigned for High Contrast */}
              <button
                id="btn-select-visitor-role"
                onClick={handleVisitorEnter}
                className="group flex flex-col items-center justify-between p-6 bg-white dark:bg-[#191433]/85 border-2 border-slate-350 hover:border-[#BC00DD] dark:border-purple-500/25 dark:hover:border-[#BC00DD] rounded-3xl transition-all duration-300 hover:-translate-y-1 text-center shadow-md shadow-slate-100/90 dark:shadow-none hover:shadow-xl hover:shadow-pink-100/50 cursor-pointer min-h-[260px]"
              >
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-150/40 dark:bg-purple-950/45 dark:border-purple-500/30 text-pink-600 dark:text-[#FF007A] flex items-center justify-center mb-4 transition duration-300 group-hover:scale-110 shadow-xs">
                    <Eye className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900 group-hover:text-[#BC00DD] dark:text-white dark:group-hover:text-[#FF007A] transition">
                    Visitor Entrance
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-purple-200/65 mt-2 font-bold leading-relaxed px-2">
                    Instant view-only access to browse dashboards, inspect active rosters, and review Star Reports.
                  </p>
                </div>

                <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-pink-600 group-hover:translate-x-1 transition duration-200 dark:text-[#FF007A]">
                  Enter Instantly &rarr;
                </span>
              </button>

            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/60 dark:border-purple-500/20 shadow-sm relative z-10 animate-fade-in max-w-md mx-auto">
            
            {/* Back Button */}
            <button
              id="btn-back-to-mode-choice"
              onClick={() => {
                setPassword("");
                setError(null);
                setMode("choose");
              }}
              className="mb-4 pr-3 py-1.5 text-xs font-bold text-slate-400 hover:text-[#FF007A] flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Change Profile Group
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#FF007A]" />
                <span>Admin security lock</span>
              </h3>
            </div>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/25 p-3 rounded-xl text-xs text-red-650 dark:text-rose-400 font-bold">
                🔒 Security Alert: {error}
              </div>
            )}

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Enter Password
                </label>
                <input
                  id="auth-admin-password-input"
                  type="password"
                  required
                  autoFocus
                  placeholder="e.g. admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:bg-[#0B0813] dark:border-purple-500/15 focus:border-[#FF007A] rounded-xl text-sm font-semibold transition"
                />
              </div>

              <button
                id="btn-admin-login-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex justify-center items-center py-3 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#FF007A] to-[#BC00DD] hover:from-[#FF1A53] hover:to-[#A300C4] transition-all duration-300 disabled:opacity-50 shadow-md shadow-[#FF007A]/15 uppercase tracking-widest"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  "Log In as Admin"
                )}
              </button>
            </form>

          </div>
        )}
      </div>

    </div>
  );
}
