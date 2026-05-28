import React, { useState, useEffect } from "react";
import { 
  Building, BookOpen, Users, BarChart3, Clock, Calendar, 
  MapPin, UserCheck, LogOut, Lock, Sun, Moon, Sparkles, Award, Layers, Settings
} from "lucide-react";
import { User, DashboardStats } from "./types";
import AuthScreen from "./components/AuthScreen";
import AdminRegistry from "./components/AdminRegistry";
import AttendanceModule from "./components/AttendanceModule";
import ReportsModule from "./components/ReportsModule";

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
      <div className="absolute top-[-20%] left-[-15%] w-[80%] h-[75%] rounded-full bg-indigo-600/10 dark:bg-[#BC00DD]/12 blur-[140px] pointer-events-none animate-nebula-slow" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#FF007A]/12 dark:bg-[#FF007A]/15 blur-[150px] pointer-events-none animate-nebula-slow" style={{ animationDelay: '6s' }} />
      <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] rounded-full bg-purple-600/8 dark:bg-purple-900/15 blur-[120px] pointer-events-none animate-nebula-slow" style={{ animationDelay: '12s' }} />
      
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white opacity-90"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle ${star.duration} infinite ease-in-out ${star.delay}`,
            boxShadow: star.size > 1.8 && !isMobile ? '0 0 8px rgba(255, 255, 255, 0.9)' : 'none'
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
            className="flex items-center justify-center p-2.5 border border-slate-200 bg-white dark:bg-zinc-900 rounded-xl shadow-xs transition-all text-slate-600 hover:text-[#FF3366] dark:text-zinc-300 dark:hover:text-amber-500 hover:border-[#FF3366] dark:border-zinc-800"
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
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo / Title */}
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-9 h-9 bg-gradient-to-r from-[#FF007A] to-[#BC00DD] rounded-xl text-white shadow-sm ring-2 ring-purple-500/10 dark:ring-purple-500/20">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-display font-black tracking-tight text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] leading-none">
                  DaAttendance
                </h1>
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
                className="flex items-center justify-center p-2 border border-slate-200 dark:border-purple-500/20 text-slate-600 hover:text-[#FF007A] hover:bg-pink-50/20 rounded-xl transition-all dark:bg-[#191433] dark:text-zinc-300"
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
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-purple-500/20 text-slate-600 hover:text-red-700 hover:bg-red-50/20 dark:bg-[#191433] dark:text-zinc-300 dark:hover:text-[#FF3366] rounded-xl text-xs font-semibold transition"
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
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 relative">
        
        {/* Radial Nebula Glow Behind active roster and dashboard */}
        {theme === "dark" && (
          <div className="absolute right-10 top-1/3 pointer-events-none w-[350px] h-[350px] bg-purple-600/10 blur-[130px] rounded-full z-0" />
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
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                  isActive
                    ? "bg-gradient-to-r from-[#FF007A] to-[#BC00DD] text-white shadow-[0_4px_12px_rgba(255,0,122,0.2)] dark:shadow-[0_0_15px_rgba(255,0,122,0.4)]"
                    : "text-slate-600 dark:text-purple-200/70 hover:bg-slate-50 dark:hover:bg-[#191433]/50 hover:text-slate-900 dark:hover:text-white"
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
              <div className="bg-slate-900 dark:bg-gradient-to-r dark:from-[#191433]/90 dark:to-[#22103d]/90 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800 dark:border-purple-500/30">
                <div className="absolute right-0 top-0 opacity-10 translate-y-[-10px] translate-x-[30px] pointer-events-none">
                  <Sparkles className="w-64 h-64 text-purple-400" />
                </div>
                <div className="relative z-10 max-w-2xl">
                  <span className="text-pink-500 dark:text-[#00E5FF] font-bold text-xs uppercase tracking-widest block mb-2">
                    Welcome Back {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'visitor' ? 'Visitor' : 'Teacher'}
                  </span>
                  <h2 className="text-3xl font-display font-black text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] animate-fade-in">
                    {currentUser.name}
                  </h2>
                  <p className="text-slate-300 dark:text-purple-200/70 text-base mt-2 font-semibold">
                    Welcome Back to Children's Ministry (SUNDAY SCHOOL) - DaAttendance
                  </p>
                </div>
                <div className="relative z-10 shrink-0">
                  {currentUser.role !== "visitor" ? (
                    <button
                      id="btn-take-attendance-now"
                      onClick={() => setActiveTab("attendance")}
                      className="w-full sm:w-auto px-6 py-4 bg-[#FF3366] hover:bg-[#FF1A53] text-white text-base font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_0_20px_rgba(255,51,102,0.4)] active:scale-[0.98]"
                    >
                      <UserCheck className="w-6 h-6 animate-pulse" />
                      <span>Take Today's Attendance</span>
                    </button>
                  ) : (
                    <button
                      id="btn-view-star-reports-now"
                      onClick={() => setActiveTab("reports")}
                      className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-[#FF007A] to-[#BC00DD] hover:from-[#FF1A53] hover:to-[#A300C4] text-white text-base font-bold rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_0_20px_rgba(255,0,122,0.3)] active:scale-[0.98]"
                    >
                      <Award className="w-6 h-6 animate-pulse" />
                      <span>Browse Star Reports</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bento statistics grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                
                {/* Branch Locations counts */}
                <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-purple-200/70 tracking-wider">Campuses</span>
                    <Building className="w-5 h-5 text-indigo-500 dark:text-purple-400" />
                  </div>
                  <div className="text-2xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                    {statsLoading ? "..." : stats?.locationsCount || 0}
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-purple-200/50">Total physical facilities</span>
                </div>

                {/* Class Programs counts */}
                <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-550 dark:text-purple-200/70 tracking-wider">Ministry Groups</span>
                    <BookOpen className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                  </div>
                  <div className="text-2xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                    {statsLoading ? "..." : stats?.classesCount || 0}
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-purple-200/50">Active class cohorts</span>
                </div>

                {/* Registered Coaces counts */}
                <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-550 dark:text-purple-200/70 tracking-wider">Teachers & Leaders</span>
                    <Users className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="text-2xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                    {statsLoading ? "..." : stats?.teachersCount || 1}
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-purple-200/50">Enregistered leaders</span>
                </div>

                {/* Active Members count */}
                <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-550 dark:text-purple-200/70 tracking-wider">Enrolled Students</span>
                    <Users className="w-5 h-5 text-purple-500 dark:text-purple-300" />
                  </div>
                  <div className="text-2xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">
                    {statsLoading ? "..." : stats?.membersCount || 0}
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-purple-200/50">Total enrolled students</span>
                </div>

              </div>


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

      {/* Footer System Margin Cleaner */}
      <footer className="bg-white dark:bg-zinc-900 border-t border-slate-200/60 dark:border-zinc-800 py-4 mt-auto text-center text-xs text-slate-400 dark:text-purple-300/40">
        <div className="max-w-7xl mx-auto px-4 text-center">
          DaAttendance &copy; 2026
        </div>
      </footer>

    </div>
  );
}
