import React, { useState, useEffect } from "react";
import { 
  Building, BookOpen, Users, BarChart3, Clock, Calendar, 
  MapPin, UserCheck, LogOut, Lock, Sun, Moon, Sparkles, Award, Layers, Settings,
  Cloud, CloudOff, RefreshCw, CheckCircle2, Download
} from "lucide-react";
import { getOfflineQueue, syncOfflineQueue } from "./offlineSync";
import { User, DashboardStats } from "./types";
import AuthScreen from "./components/AuthScreen";
import AdminRegistry from "./components/AdminRegistry";
import AttendanceModule from "./components/AttendanceModule";
import ReportsModule from "./components/ReportsModule";
import DashboardMetrics from "./components/DashboardMetrics";
import Logo from "./components/Logo";

const CosmicStarfield = React.memo(function CosmicStarfield({ theme }: { theme: "light" | "dark" }) {
  const [stars, setStars] = useState<{ id: number; top: number; left: number; size: number; delay: string; duration: string }[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    
    const starCount = window.innerWidth < 768 ? 22 : 65;
    const generatedStars = Array.from({ length: starCount }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * (window.innerWidth < 768 ? 1.0 : 2.0) + 0.8,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 4}s`
    }));
    setStars(generatedStars);

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (theme !== "dark") return null;

  return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Drifting space gas nebulae elements */}
        <div className="absolute top-[-20%] left-[-15%] w-[80%] h-[75%] rounded-full bg-[#FF007A]/8 blur-[140px] pointer-events-none animate-nebula-slow" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#BC00DD]/12 blur-[150px] pointer-events-none animate-nebula-slow" style={{ animationDelay: '5s' }} />
        <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full bg-pink-600/10 blur-[160px] pointer-events-none animate-nebula-slow" style={{ animationDelay: '10s' }} />
        <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-purple-900/15 blur-[120px] pointer-events-none animate-nebula-slow" style={{ animationDelay: '15s' }} />
        
        {stars.map((star) => (
          <div
            key={star.id}
            className={`absolute rounded-full ${star.id % 5 === 0 ? 'bg-pink-300' : 'bg-white'} opacity-90`}
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animation: `twinkle ${star.duration} infinite ease-in-out ${star.delay}`,
              boxShadow: star.size > 1.8 && !isMobile ? (star.id % 5 === 0 ? '0 0 8px rgba(236, 72, 153, 0.8)' : '0 0 8px rgba(255, 255, 255, 0.9)') : 'none'
            }}
          />
        ))}
    </div>
  );
});

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("roll_token"));
  const [currentUser, setCurrentUser] = useState<User | null>(
    localStorage.getItem("roll_user") ? JSON.parse(localStorage.getItem("roll_user")!) : null
  );

  // Default tab based on role: Teacher bypasses dashboard to go straight to active Student Roll Call
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedUserStr = localStorage.getItem("roll_user");
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser.role === "teacher") {
          return "attendance";
        }
      } catch (e) {
        // ignore
      }
    }
    return "dashboard";
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Theme state for Light/Night Mode
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("roll_theme") as "light" | "dark") || "light"
  );

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app is already running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("roll_theme", nextTheme);
  };

  // PWA Offline Synchronization & Network Management States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check enqueued actions count on startup
    setPendingCount(getOfflineQueue().length);

    // 2. Network connectivity listeners
    const handleOnline = () => {
      setIsOnline(true);
      triggerOnlineSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    // 3. Listen to local offline actions enqueued or synced
    const handleQueueUpdate = () => {
      setPendingCount(getOfflineQueue().length);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("da_attendance_sync_update", handleQueueUpdate);

    // 4. Background Sync Poller - retries queue synchronization every 12 seconds when network is available
    const syncInterval = setInterval(() => {
      if (navigator.onLine && getOfflineQueue().length > 0 && !isSyncing) {
        triggerOnlineSync();
      }
    }, 12000);

    // Immediately trigger synchronization if enqueued actions are waiting online
    if (navigator.onLine && getOfflineQueue().length > 0) {
      triggerOnlineSync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("da_attendance_sync_update", handleQueueUpdate);
      clearInterval(syncInterval);
    };
  }, [isSyncing]);

  const triggerOnlineSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue(window.fetch);
      if (result.success && result.count > 0) {
        setSyncSuccessMessage(`Synchronized ${result.count} offline attendance records successfully!`);
        setTimeout(() => setSyncSuccessMessage(null), 4000);
        // Force refresh all tables and dashboard metrics across active screens
        fetchDashboardStats();
      }
    } catch (e) {
      console.error("Failed to sync enqueued offline actions", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Forcibly sanitize admin display name to "Admin" on startup to clean up cache
  useEffect(() => {
    if (currentUser && currentUser.role === "admin" && currentUser.name !== "Admin") {
      const sanitized = { ...currentUser, name: "Admin" };
      setCurrentUser(sanitized);
      localStorage.setItem("roll_user", JSON.stringify(sanitized));
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardStats();
    }
  }, [currentUser, activeTab]);

  // Automatic local storage to MongoDB migration sync trigger
  useEffect(() => {
    const LOCAL_STORAGE_KEY = 'da_attendance_db';
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const localDb = JSON.parse(raw);
        fetch('/api/migration/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localDb)
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log("Successfully migrated local data to cloud MongoDB:", data);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.setItem('da_attendance_db_migrated', 'true');
            // Force reload to fetch new database stats
            window.location.reload();
          }
        })
        .catch(err => console.error("Migration sync error:", err));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load metrics summary", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLoginSuccess = (user: User, userToken: string) => {
    localStorage.setItem("roll_token", userToken);
    localStorage.setItem("roll_user", JSON.stringify(user));
    setToken(userToken);
    setCurrentUser(user);
    if (user.role === "teacher") {
      setActiveTab("attendance");
    } else {
      setActiveTab("dashboard");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("roll_token");
    localStorage.removeItem("roll_user");
    setToken(null);
    setCurrentUser(null);
    setActiveTab("dashboard");
  };

  if (!token || !currentUser) {
    return (
      <div 
        id="app-root-container" 
        className={`min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 transition-all duration-300 relative overflow-hidden ${
          theme === "dark" ? "dark bg-gradient-to-br from-[#0B0813] via-[#130F26] to-[#1A1230] text-zinc-100" : ""
        }`}
      >
        <CosmicStarfield theme={theme} />
        <div className="absolute top-4 right-4 z-50">
          <button
            id="btn-auth-theme-toggle"
            onClick={toggleTheme}
            className="flex items-center justify-center p-2.5 border border-slate-200 bg-white dark:bg-zinc-900 rounded-xl shadow-xs transition-all text-slate-600 hover:text-indigo-500 dark:text-zinc-300 dark:hover:text-indigo-400 hover:border-indigo-300 dark:border-zinc-800"
            title={theme === "light" ? "Switch to Night Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
          </button>
        </div>
        <div className="relative z-10 w-full flex-1 flex flex-col justify-center">
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  // Define tabs based on role
  const isAdmin = currentUser.role === "admin";

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, roles: ["admin", "teacher", "visitor"] },
    { id: "attendance", label: "Attendance Desk", icon: UserCheck, roles: ["admin", "teacher"] },
    { id: "setup", label: "Setup", icon: Settings, roles: ["admin"] },
    { id: "reports", label: "Reports & Profiles", icon: Award, roles: ["admin", "teacher", "visitor"] },
  ];

  const visibleTabs = tabs.filter(t => t.roles.includes(currentUser.role));

  // Dynamically greeting base on hour of the day
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div 
      id="app-root-container" 
      className={`min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 transition-all duration-300 relative overflow-x-hidden ${
        theme === "dark" ? "dark bg-gradient-to-br from-[#0B0813] via-[#130F26] to-[#1A1230] text-zinc-100" : ""
      }`}
    >
      <CosmicStarfield theme={theme} />
      
      {/* Top Header Bar (Non-Sticky / Moves with Scroll) */}
      <header className="bg-white dark:bg-[#191433]/80 border-b border-slate-200/80 dark:border-purple-500/20 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 lg:h-24 items-center">
            
            {/* Logo / Title */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Logo className="h-9 sm:h-12 lg:h-16 xl:h-24 w-auto" />
                
                {/* PWA Offline Synchronization Status Pill */}
                <div className="flex items-center">
                  {isSyncing ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-purple-600 dark:from-purple-500/25 dark:to-pink-500/25 dark:text-[#D946EF] border border-purple-500/30 dark:border-[#D946EF]/20 shadow-[0_0_10px_rgba(168,85,247,0.15)] select-none">
                      <RefreshCw className="w-3 h-3 animate-spin text-purple-500 dark:text-[#D946EF]" />
                      <span>Syncing...</span>
                    </span>
                  ) : !isOnline ? (
                    <span 
                      onClick={triggerOnlineSync}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 dark:from-amber-500/20 dark:to-orange-500/20 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/20 cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.1)] hover:brightness-110 transition-all select-none animate-pulse"
                      title={pendingCount > 0 ? `${pendingCount} offline rolls waiting to sync` : "Device is offline"}
                    >
                      <CloudOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Offline {pendingCount > 0 && `(${pendingCount})`}</span>
                    </span>
                  ) : pendingCount > 0 ? (
                    <span 
                      onClick={triggerOnlineSync}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#FF7BE5]/15 to-[#D946EF]/15 text-[#9D16BD] dark:from-[#FF7BE5]/20 dark:to-[#D946EF]/20 dark:text-[#FF7BE5] border border-[#D946EF]/30 dark:border-[#FF7BE5]/20 cursor-pointer shadow-[0_0_10px_rgba(217,70,239,0.15)] hover:brightness-110 transition-all select-none"
                      title="Online but has enqueued edits. Click to synchronize."
                    >
                      <RefreshCw className="w-3 h-3 text-[#D946EF] dark:text-[#FF7BE5] animate-spin" />
                      <span>Sync Pending ({pendingCount})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#9D16BD]/20 to-[#D946EF]/20 text-[#D946EF] dark:from-[#9D16BD]/30 dark:to-[#D946EF]/30 dark:text-[#FF7BE5] border border-[#D946EF]/30 dark:border-[#FF7BE5]/20 shadow-[0_0_10px_rgba(217,70,239,0.15)] select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D946EF] dark:bg-[#FF7BE5] animate-ping absolute" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D946EF] dark:bg-[#FF7BE5] relative" />
                      <span>Online</span>
                    </span>
                  )}
                </div>
              </div>

            {/* Profile widget and logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block text-[9px] mb-0.5">Logged in as</span>
                <span className="font-bold text-sm text-slate-900 dark:text-purple-100">{currentUser.name}</span>
                <span className={`inline-flex items-center px-2 py-0.2 rounded ml-2 text-[9px] font-black uppercase tracking-wider ${
                  isAdmin 
                    ? "bg-indigo-50 border border-indigo-100/50 text-indigo-700 dark:bg-indigo-950/45 dark:border-indigo-900/50 dark:text-[#00E5FF]" 
                    : currentUser.role === "visitor"
                    ? "bg-amber-50 border border-amber-100/50 text-amber-800 dark:bg-[#1A140B] dark:border-amber-500/30 dark:text-amber-400"
                    : "bg-pink-50 border border-pink-100/50 text-pink-850 dark:bg-[#191433]/80 dark:border-purple-500/30 dark:text-[#00E5FF]"
                }`}>
                  {currentUser.role === 'admin' ? "👑 Admin Profile" : currentUser.role === 'visitor' ? "🔍 Guest Visitor" : "Sunday School Teacher"}
                </span>
              </div>

              {/* Light/Night Theme Toggle */}
              <button
                id="btn-theme-toggle"
                onClick={toggleTheme}
                className="flex items-center justify-center p-2 border border-slate-200 dark:border-purple-500/20 text-slate-600 hover:text-indigo-500 bg-slate-50 hover:bg-indigo-50/20 rounded-xl transition-all dark:bg-[#191433] dark:text-zinc-300"
                title={theme === "light" ? "Switch to Night Mode" : "Switch to Light Mode"}
              >
                {theme === "light" ? (
                  <Moon className="w-4.5 h-4.5 text-slate-600" />
                ) : (
                  <Sun className="w-4.5 h-4.5 text-amber-500" />
                )}
              </button>

              <button
                id="btn-logout-trigger"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-purple-500/20 text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50/20 dark:bg-[#191433] dark:text-zinc-300 dark:hover:text-red-400 rounded-xl text-xs font-semibold transition"
                title="Log out of staff panel"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <div className="flex-1 max-w-full w-full mx-auto px-6 sm:px-8 lg:px-10 xl:px-12 py-8 flex flex-col gap-8 relative">
        
        {/* Radial Nebula Glow Behind active roster and dashboard */}
        {theme === "dark" && (
          <div className="absolute right-10 top-1/3 pointer-events-none w-[400px] h-[400px] bg-[#FF007A]/10 blur-[150px] rounded-full z-0" />
        )}
        
        {/* Navigation Tabs bar */}
        <div className="bg-white dark:bg-[#191433]/80 p-2 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl flex flex-wrap gap-1 shadow-sm relative z-10 backdrop-blur-md">
          {visibleTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] dark:bg-gradient-to-r dark:from-pink-500 dark:to-purple-600 dark:shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                    : "text-slate-600 dark:text-purple-200/70 hover:bg-slate-100 dark:hover:bg-[#191433]/50 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <IconComponent className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Display Content view */}
        <div className="flex-1">
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Profile banner info greeting with Quick-Action Attendance button */}
              <div className="bg-gradient-to-r from-pink-600 to-pink-800 dark:from-pink-700/90 dark:to-purple-800/90 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 border border-pink-400/30 dark:border-pink-500/30">
                <div className="relative z-10 max-w-2xl">
                  <span className="text-pink-200 dark:text-pink-300 font-bold text-xs uppercase tracking-widest block mb-2">
                    Welcome Back {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'visitor' ? 'Visitor' : 'Teacher'}
                  </span>
                  <h2 className="text-3xl font-display font-black text-white animate-fade-in">
                    {currentUser.name}
                  </h2>
                  <p className="text-pink-100/90 dark:text-pink-200/80 text-base mt-2 font-semibold">
                    Welcome Back to Children's Ministry (SUNDAY SCHOOL) - DaAttendance
                  </p>
                </div>
                <div className="relative z-10 shrink-0">
                  {currentUser.role !== "visitor" ? (
                    <button
                      id="btn-take-attendance-now"
                      onClick={() => setActiveTab("attendance")}
                      className="w-full sm:w-auto px-6 py-4 bg-white text-pink-700 font-black text-base rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-md active:scale-[0.98]"
                    >
                      <UserCheck className="w-6 h-6" />
                      <span>Take Today's Attendance</span>
                    </button>
                  ) : (
                    <button
                      id="btn-view-star-reports-now"
                      onClick={() => setActiveTab("reports")}
                      className="w-full sm:w-auto px-6 py-4 bg-white text-pink-700 font-black text-base rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-md active:scale-[0.98]"
                    >
                      <Award className="w-6 h-6" />
                      <span>Browse Star Reports</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bento statistics grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
                
                {/* Branch Locations counts */}
                <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-6 sm:p-7 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-purple-200/70 tracking-wider">Campuses</span>
                    <Building className="w-5 h-5 text-indigo-500 dark:text-purple-400" />
                  </div>
                  <div className="text-3xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                    {statsLoading ? "..." : stats?.locationsCount || 0}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-purple-200/50 mt-1 block">Total physical facilities</span>
                </div>

                {/* Class Programs counts */}
                <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-6 sm:p-7 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-purple-200/70 tracking-wider">Ministry Groups</span>
                    <BookOpen className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                  </div>
                  <div className="text-3xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                    {statsLoading ? "..." : stats?.classesCount || 0}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-purple-200/50 mt-1 block">Active class cohorts</span>
                </div>

                {/* Registered Teachers counts */}
                <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-6 sm:p-7 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-purple-200/70 tracking-wider">Teachers & Leaders</span>
                    <Users className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="text-3xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                    {statsLoading ? "..." : stats?.teachersCount || 1}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-purple-200/50 mt-1 block">Enregistered leaders</span>
                </div>

                {/* Active Members count */}
                <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-6 sm:p-7 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-purple-200/70 tracking-wider">Enrolled Students</span>
                    <Users className="w-5 h-5 text-purple-500 dark:text-purple-300" />
                  </div>
                  <div className="text-3xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                    {statsLoading ? "..." : stats?.membersCount || 0}
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-purple-200/50 mt-1 block">Total enrolled students</span>
                </div>

              </div>

              {/* Operational metric cards */}
              <DashboardMetrics />

            </div>
          )}

          {activeTab === "attendance" && (
            <div className="animate-fade-in">
              <AttendanceModule currentUser={currentUser} />
            </div>
          )}

          {activeTab === "setup" && isAdmin && (
            <div className="animate-fade-in">
              <AdminRegistry />
            </div>
          )}

          {activeTab === "reports" && (
            <div className="animate-fade-in">
              <ReportsModule currentUser={currentUser} />
            </div>
          )}
        </div>

      </div>

      {/* Floating PWA Offline Sync Success Notification Toast */}
      {syncSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-500 dark:bg-emerald-600 text-white font-semibold text-sm rounded-2xl shadow-xl border border-emerald-400/20 animate-fade-in select-none">
          <CheckCircle2 className="w-4.5 h-4.5 text-white animate-bounce" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* Footer System Margin Cleaner */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-slate-200/60 dark:border-zinc-800 py-5 mt-auto">
        <div className="max-w-full mx-auto px-6 sm:px-8 lg:px-10 xl:px-12 text-center text-xs text-slate-400 dark:text-purple-300/40">
          DaAttendance &copy; 2026
        </div>
      </footer>

    </div>
  );
}
