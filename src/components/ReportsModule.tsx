import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Award, Calendar, TrendingUp, CheckCircle, XCircle, X, Check, Users,
  Printer, Sparkles, ChevronRight, Eye, BookOpen, MapPin, 
  Activity, FileText, ArrowLeft, Loader2, Trophy, Flame, ShieldAlert, BadgeCheck
} from "lucide-react";
import { User } from "../types";

interface Location {
  id: string;
  name: string;
}

interface ClassSession {
  id: string;
  name: string;
  locationId: string;
  assignedTeacherId: string;
  schedule: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  classIds: string[];
  status: string;
  joinedDate: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  locationId?: string;
  role: string;
}

interface Volunteer {
  id: string;
  name: string;
  locationId: string;
  role?: "Volunteer" | "Director";
}

interface StudentAttendanceRecord {
  id: string;
  classId: string;
  date: string;
  checkedInMemberIds: string[];
  notes?: string;
  recordedBy?: string;
  recordedAt?: string;
}

interface PersonnelAttendanceRecord {
  id: string;
  locationId: string;
  date: string;
  checkedInPersonnelIds: string[];
  notes?: string;
  recordedAt?: string;
}

interface ReportsModuleProps {
  currentUser: User;
}

export default function ReportsModule({ currentUser }: ReportsModuleProps) {
  // DB States
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([]);
  const [volunteerRecords, setPersonnelRecords] = useState<PersonnelAttendanceRecord[]>([]);

  // Local state controls
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher" | "volunteer">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [atRiskFilter, setAtRiskFilter] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<{
    id: string;
    name: string;
    role: "Student" | "Teacher" | "Director" | "Volunteer";
    type: "student" | "personnel";
    email?: string;
    phone?: string;
    joinedDate?: string;
    classNames: string[];
    locationName: string;
    locationId: string;
  } | null>(null);
  
  const [showCertificate, setShowCertificate] = useState(false);
  const [celebrations, setCelebrations] = useState<{ id: number; left: number; emoji: string; delay: number }[]>([]);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Load all necessary databases for computing stats
  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bootstrap");
      if (!res.ok) {
        throw new Error("Could not download galaxy directories. Please refresh the page.");
      }

      const data = await res.json();
      setLocations(data.locations);
      setClasses(data.classes);
      setStudents(data.members);
      setTeachers(data.teachers);
      setVolunteers(data.volunteers);
      setStudentRecords(data.attendance);
      setPersonnelRecords(data.volunteerAttendance);
    } catch (err: any) {
      setError(err.message || "Failed to load reports metadata.");
    } finally {
      setLoading(false);
    }
  };

  // Build a unified roster of absolutely everyone
  const unifiedRoster = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      role: "Student" | "Teacher" | "Director" | "Volunteer";
      type: "student" | "personnel";
      email?: string;
      phone?: string;
      joinedDate?: string;
      classNames: string[];
      locationName: string;
      locationId: string;
    }> = [];

    // Add students
    students.forEach(s => {
      // Find class details
      const studentClasses = classes.filter(c => s.classIds && s.classIds.includes(c.id));
      const classNames = studentClasses.map(c => c.name);
      
      // Location Name is based on the first class's location
      let locationName = "Unknown Campus";
      let locationId = "";
      if (studentClasses.length > 0) {
        const loc = locations.find(l => l.id === studentClasses[0].locationId);
        if (loc) {
          locationName = loc.name;
          locationId = loc.id;
        }
      }

      list.push({
        id: s.id,
        name: s.name,
        role: "Student",
        type: "student",
        email: s.email,
        phone: s.phone,
        joinedDate: s.joinedDate,
        classNames,
        locationName,
        locationId
      });
    });

    // Add teachers
    teachers.forEach(t => {
      const assignedClassNames = classes
        .filter(c => c.assignedTeacherId && c.assignedTeacherId.split(",").includes(t.id))
        .map(c => c.name);

      const loc = locations.find(l => l.id === t.locationId);
      const locationName = loc ? loc.name : "Unassigned";
      
      list.push({
        id: t.id,
        name: t.name,
        role: "Teacher",
        type: "personnel",
        email: t.email,
        phone: t.phone,
        classNames: assignedClassNames,
        locationName,
        locationId: t.locationId || ""
      });
    });

    // Add volunteers/directors
    volunteers.forEach(v => {
      const isDir = v.role === "Director" || (v.role === undefined && /director|charge|coordinator|leader|pastor/i.test(v.name));
      const roleStr = isDir ? ("Director" as const) : ("Volunteer" as const);
      
      const loc = locations.find(l => l.id === v.locationId);
      const locationName = loc ? loc.name : "Unassigned";

      list.push({
        id: v.id,
        name: v.name,
        role: roleStr,
        type: "personnel",
        classNames: [],
        locationName,
        locationId: v.locationId
      });
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, teachers, volunteers, classes, locations]);

  // Compute metrics for active person
  const personMetrics = useMemo(() => {
    if (!selectedPerson) return null;

    const { id, type, role, locationId } = selectedPerson;

    let totalConducted = 0;
    let daysPresent = 0;
    const history: Array<{
      date: string;
      present: boolean;
      notes: string;
      category: string;
    }> = [];

    if (type === "student") {
      // Find all classes this student belongs to
      const studentClassIds = students.find(s => s.id === id)?.classIds || [];
      
      // All attendance records for student's classes
      const matchingRecords = studentRecords
        .filter(r => studentClassIds.includes(r.classId))
        .sort((a, b) => b.date.localeCompare(a.date)); // newest first

      totalConducted = matchingRecords.length;
      
      matchingRecords.forEach(rec => {
        const isPresent = rec.checkedInMemberIds && rec.checkedInMemberIds.includes(id);
        if (isPresent) daysPresent++;

        const cls = classes.find(c => c.id === rec.classId);
        history.push({
          date: rec.date,
          present: isPresent,
          notes: rec.notes || "No standard roll remarks",
          category: cls ? cls.name : "Category Class"
        });
      });
    } else {
      // Personnel helper calculation
      // Personnel is present if in 'checkedInPersonnelIds' of 'volunteerAttendance' (volunteerRecords)
      const matchingRecords = volunteerRecords
        .filter(r => r.locationId === locationId)
        .sort((a, b) => b.date.localeCompare(a.date));

      totalConducted = matchingRecords.length;

      matchingRecords.forEach(rec => {
        const isPresent = rec.checkedInPersonnelIds && rec.checkedInPersonnelIds.includes(id);
        if (isPresent) daysPresent++;

        history.push({
          date: rec.date,
          present: isPresent,
          notes: rec.notes || "No team assembly remarks",
          category: role
        });
      });
    }

    const daysAbsent = totalConducted - daysPresent;
    const attendanceRate = totalConducted > 0 ? Math.round((daysPresent / totalConducted) * 100) : 100;

    // Calculate Consecutive Streak in weeks
    let currentStreak = 0;
    // History sorted newest first
    const chronoHistory = [...history].sort((a, b) => a.date.localeCompare(b.date)); // oldest to newest
    let tempStreak = 0;
    for (let i = 0; i < chronoHistory.length; i++) {
      if (chronoHistory[i].present) {
        tempStreak++;
        currentStreak = Math.max(currentStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    // Also compute current streak (backwards from most recent check-in date)
    let activeStreak = 0;
    const reverseChrono = [...history].sort((a, b) => b.date.localeCompare(a.date)); // newest to oldest
    for (const record of reverseChrono) {
      if (record.present) {
        activeStreak++;
      } else {
        break; // streak broken
      }
    }

    // Determine Rank based on criteria matching kid space academy theme
    let rankTitle = "👾 Cosmic Hide-and-Seek Expert";
    let rankBadge = "text-amber-500 bg-amber-500/10 border-amber-500/30";
    let rankDesc = "You are excellent at hiding behind the stars! We miss your big smile in Sunday class. Come out and join our next space picnic! 🧺";
    
    if (totalConducted > 0) {
      if (attendanceRate === 100) {
        rankTitle = "🚀 Holy Rocket Champion";
        rankBadge = "text-emerald-500 bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.35)] animate-pulse";
        rankDesc = "You are traveling at the speed of light straight to heaven! You have perfect attendance, and even the angels are asking you for autographs! 😇";
      } else if (attendanceRate >= 90) {
        rankTitle = "🛸 Sunday Spaceship Co-Pilot";
        rankBadge = "text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]";
        rankDesc = "You missed a launch or two, but your cockpit is glowing! You know your Bible stories better than the aliens! 👽";
      } else if (attendanceRate >= 75) {
        rankTitle = "🧑‍🚀 Starry Bible Cadet";
        rankBadge = "text-purple-500 bg-purple-500/10 border-purple-500/30";
        rankDesc = "You're hopping along the stars! Bring your friends next Sunday to help fuel up your rocket engines! 🌟";
      } else if (attendanceRate >= 50) {
        rankTitle = "🪐 Sleepy Nebula Explorer";
        rankBadge = "text-pink-500 bg-pink-500/10 border-pink-500/30";
        rankDesc = "Sometimes Sunday morning blankets are too cozy, but you are still a bright star in the sky! Wake up your alarm clock next Sunday! ⏰";
      }
    }

    return {
      totalConducted,
      daysPresent,
      daysAbsent,
      attendanceRate,
      currentStreak,
      activeStreak,
      rankTitle,
      rankBadge,
      rankDesc,
      history
    };
  }, [selectedPerson, studentRecords, volunteerRecords, students, classes]);

  // Compute dashboard-level metrics for the top cards
  const dashboardMetrics = useMemo(() => {
    const activeClasses = classes.length;

    const totalPresent = studentRecords.reduce(
      (sum, rec) => sum + (rec.checkedInMemberIds?.length || 0),
      0
    );

    let totalPossible = 0;
    studentRecords.forEach(rec => {
      const studentsInClass = students.filter(s => s.classIds?.includes(rec.classId));
      totalPossible += studentsInClass.length;
    });
    const totalAbsent = totalPossible - totalPresent;

    const dates = [...new Set(studentRecords.map(r => r.date))].sort();
    const latestDate = dates[dates.length - 1];
    const previousDate = dates.length > 1 ? dates[dates.length - 2] : null;

    const todayRecords = studentRecords.filter(r => r.date === latestDate);
    const todayPresent = todayRecords.reduce(
      (sum, rec) => sum + (rec.checkedInMemberIds?.length || 0),
      0
    );
    let todayPossible = 0;
    todayRecords.forEach(rec => {
      const studentsInClass = students.filter(s => s.classIds?.includes(rec.classId));
      todayPossible += studentsInClass.length;
    });
    const todayRate = todayPossible > 0 ? Math.round((todayPresent / todayPossible) * 100) : 0;

    const prevRecords = previousDate ? studentRecords.filter(r => r.date === previousDate) : [];
    const prevPresent = prevRecords.reduce(
      (sum, rec) => sum + (rec.checkedInMemberIds?.length || 0),
      0
    );
    let prevPossible = 0;
    prevRecords.forEach(rec => {
      const studentsInClass = students.filter(s => s.classIds?.includes(rec.classId));
      prevPossible += studentsInClass.length;
    });
    const prevRate = prevPossible > 0 ? Math.round((prevPresent / prevPossible) * 100) : 0;
    const rateChange = todayRate - prevRate;

    return { todayRate, totalPresent, totalAbsent, activeClasses, rateChange };
  }, [studentRecords, students, classes]);

  // Compute at-risk student IDs (3+ consecutive absences)
  const atRiskStudentIds = useMemo(() => {
    const atRiskIds = new Set<string>();

    students.forEach(student => {
      const studentClassIds = student.classIds || [];
      const records = studentRecords
        .filter(r => studentClassIds.includes(r.classId))
        .sort((a, b) => a.date.localeCompare(b.date));

      let consecutiveAbsences = 0;
      for (const rec of records) {
        const isPresent = rec.checkedInMemberIds?.includes(student.id);
        if (isPresent) {
          consecutiveAbsences = 0;
        } else {
          consecutiveAbsences++;
          if (consecutiveAbsences >= 3) {
            atRiskIds.add(student.id);
            break;
          }
        }
      }
    });

    return atRiskIds;
  }, [students, studentRecords]);

  // Filter roster based on searches & filters
  const filteredRoster = useMemo(() => {
    return unifiedRoster.filter(p => {
      // Name Search
      const nameMatch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Role Filter helper
      let roleMatch = true;
      if (roleFilter !== "all") {
        if (roleFilter === "student" && p.role !== "Student") roleMatch = false;
        if (roleFilter === "teacher" && p.role !== "Teacher") roleMatch = false;
        if (roleFilter === "volunteer" && p.role !== "Volunteer" && p.role !== "Director") roleMatch = false;
      }

      // Location match
      let locationMatch = true;
      if (locationFilter !== "all" && p.locationId !== locationFilter) {
        locationMatch = false;
      }

      // Class match (applies to students & teachers mostly)
      let classMatch = true;
      if (classFilter !== "all") {
        const studentObj = students.find(s => s.id === p.id);
        if (studentObj) {
          const enrollMatch = studentObj.classIds && studentObj.classIds.includes(classFilter);
          if (!enrollMatch) classMatch = false;
        } else if (p.role === "Teacher") {
          const teacherClassIds = classes
            .filter(c => c.assignedTeacherId && c.assignedTeacherId.split(",").includes(p.id))
            .map(c => c.id);
          if (!teacherClassIds.includes(classFilter)) classMatch = false;
        } else {
          // directors or volunteers not assigned directly to a class
          classMatch = false;
        }
      }

      // At-risk filter
      let atRiskMatch = true;
      if (atRiskFilter) {
        if (p.type !== "student" || !atRiskStudentIds.has(p.id)) {
          atRiskMatch = false;
        }
      }

      return nameMatch && roleMatch && locationMatch && classMatch && atRiskMatch;
    });
  }, [unifiedRoster, searchQuery, roleFilter, locationFilter, classFilter, atRiskFilter, atRiskStudentIds, students, classes]);

  const handlePrintCertificate = () => {
    window.print();
  };

  const triggerCelebration = () => {
    const emojis = ["🚀", "✨", "⭐", "🎉", "😇", "🦖", "🛸", "🦄", "🌈", "🍕", "🎈", "👾"];
    const newCelebrations = Array.from({ length: 35 }).map((_, i) => ({
      id: Date.now() + i,
      left: 5 + Math.random() * 90,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      delay: Math.random() * 1.2
    }));
    setCelebrations(newCelebrations);
    setTimeout(() => {
      setCelebrations([]);
    }, 4500);
  };

  return (
    <div className="space-y-6 font-sans relative">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 dark:border-purple-500/20 shadow-xs relative z-10 print:hidden">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 bg-[#FF007A]/10 text-[#FF007A] rounded-xl">
            <Award className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl font-display font-black text-slate-800 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] leading-tight">
              Academy Reports
            </h2>
          </div>
        </div>
        {selectedPerson && (
          <button 
            onClick={() => setSelectedPerson(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0B0813] dark:hover:bg-[#130F26] text-slate-700 dark:text-purple-200/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-purple-500/20 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-[#191433]/40 border border-slate-200/60 dark:border-purple-500/10 rounded-2xl">
          <Loader2 className="w-10 h-10 text-[#FF007A] animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-500 dark:text-purple-200/70">Scanning celestial databases...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/35 text-red-650 dark:text-rose-400 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">System Interruption</h4>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      ) : !selectedPerson ? (
        <div className="space-y-6">
          
          {/* Smart Dashboard Metrics */}
          {dashboardMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Card 1: Today's Attendance Rate */}
              <div className="bg-slate-800/50 backdrop-blur-md p-5 border border-slate-600/20 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today's Attendance</span>
                  <TrendingUp className="w-4 h-4 text-[#00E5FF]" />
                </div>
                <div className="py-2 flex items-baseline gap-1.5">
                  <span className={`text-4xl font-display font-black tracking-tight ${dashboardMetrics.todayRate >= 90 ? "text-[#00E5FF]" : dashboardMetrics.todayRate >= 50 ? "text-amber-400" : "text-[#FF007A]"}`}>
                    {dashboardMetrics.todayRate}%
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] mt-1">
                  <span className={`font-bold ${dashboardMetrics.rateChange >= 0 ? "text-emerald-400" : "text-[#FF007A]"}`}>
                    {dashboardMetrics.rateChange >= 0 ? "+" : ""}{dashboardMetrics.rateChange}%
                  </span>
                  <span className="text-slate-500">from last session</span>
                </div>
              </div>

              {/* Card 2: Total Present */}
              <div className="bg-slate-800/50 backdrop-blur-md p-5 border border-slate-600/20 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Present</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="py-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-display font-black text-white font-mono">
                    {dashboardMetrics.totalPresent}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Checked in
                </span>
              </div>

              {/* Card 3: Total Absent */}
              <div className="bg-slate-800/50 backdrop-blur-md p-5 border border-slate-600/20 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Absent</span>
                  <XCircle className="w-4 h-4 text-[#FF007A]" />
                </div>
                <div className="py-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-display font-black text-white font-mono">
                    {dashboardMetrics.totalAbsent}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF007A]/10 text-[#FF007A] border border-[#FF007A]/20">
                  Missed sessions
                </span>
              </div>

              {/* Card 4: Active Classes */}
              <div className="bg-slate-800/50 backdrop-blur-md p-5 border border-slate-600/20 rounded-2xl shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Classes</span>
                  <BookOpen className="w-4 h-4 text-purple-400" />
                </div>
                <div className="py-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-display font-black text-white font-mono">
                    {dashboardMetrics.activeClasses}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Ministry groups
                </span>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-5 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl shadow-xs space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Search bar input */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 dark:text-purple-200/40" />
                <input
                  type="text"
                  placeholder="Query student, teacher, director by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 hover:border-slate-350 dark:bg-[#0B0813] dark:border-purple-500/15 focus:border-[#FF007A] focus:ring-1 focus:ring-[#FF007A] rounded-xl text-xs font-semibold text-slate-800 dark:text-white transition"
                />
              </div>

              {/* Role Filter Selector */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 dark:bg-[#0B0813] dark:border-purple-500/15 focus:border-[#FF007A] rounded-xl text-xs font-semibold text-slate-850 dark:text-purple-200/80 transition"
                >
                  <option value="all">🛡️ All Ranks (Everyone)</option>
                  <option value="student">👧 Students (Members)</option>
                  <option value="teacher">🍎 Teachers (Instructors)</option>
                  <option value="volunteer">🛰️ Directors & Volunteers</option>
                </select>
              </div>

              {/* Location Select Option */}
              <div>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 dark:bg-[#0B0813] dark:border-purple-500/15 focus:border-[#FF007A] rounded-xl text-xs font-semibold text-slate-850 dark:text-purple-200/80 transition"
                >
                  <option value="all">📍 All Campuses</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Quick Helper Sub-Filter: Class Selection (only shown for student/teacher relevant choices) */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-purple-500/10">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-purple-200/40 tracking-wider">Filter Group:</span>
              <button
                onClick={() => setClassFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center ${
                  classFilter === "all"
                    ? "bg-[#FF007A]/12 border border-[#FF007A]/40 text-[#FF007A]"
                    : "bg-slate-50 dark:bg-[#0B0813] border border-slate-200/60 dark:border-purple-500/15 text-slate-600 dark:text-purple-250 hover:bg-slate-100"
                }`}
              >
                All Ministry Groups
              </button>
              {classes
                .filter(c => locationFilter === "all" || c.locationId === locationFilter)
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => setClassFilter(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center ${
                      classFilter === c.id
                        ? "bg-[#00E5FF]/12 border border-[#00E5FF]/40 text-[#00E5FF]"
                        : "bg-slate-50 dark:bg-[#0B0813] border border-slate-200/60 dark:border-purple-500/15 text-slate-600 dark:text-purple-250 hover:bg-slate-100"
                    }`}
                  >
                    {c.name}
                  </button>
                ))
              }
              <div className="flex-1 min-w-[1px]" />
              <button
                onClick={() => setAtRiskFilter(!atRiskFilter)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 ${
                  atRiskFilter
                    ? "bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.15)]"
                    : "bg-slate-50 dark:bg-[#0B0813] border border-slate-200/60 dark:border-purple-500/15 text-slate-600 dark:text-purple-250 hover:bg-slate-100"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>At-Risk (3+ Consecutive Absences)</span>
                {atRiskStudentIds.size > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black ${atRiskFilter ? "bg-amber-500/20 text-amber-300" : "bg-slate-300 dark:bg-purple-500/20 text-slate-500 dark:text-purple-300"}`}>
                    {atRiskStudentIds.size}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Grid of Roster Cards */}
          {filteredRoster.length === 0 ? (
            <div className="bg-white dark:bg-[#191433]/50 border border-slate-200/60 dark:border-purple-500/10 p-12 text-center rounded-2xl shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-purple-950/40 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-slate-300 dark:text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-purple-200/70">No people found matching index criteria</p>
              <button 
                onClick={() => { setSearchQuery(""); setRoleFilter("all"); setLocationFilter("all"); setClassFilter("all"); }}
                className="mt-3 text-xs text-[#FF007A] hover:underline font-bold"
              >
                Clear all filters and search again
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRoster.map(person => {
                // Precompile metrics values for the preview snippet
                // We do a lightweight calculation for list components
                let presentCount = 0;
                let totalCount = 0;
                
                if (person.type === "student") {
                  const studentClassIds = students.find(s => s.id === person.id)?.classIds || [];
                  const recs = studentRecords.filter(r => studentClassIds.includes(r.classId));
                  totalCount = recs.length;
                  presentCount = recs.filter(r => r.checkedInMemberIds && r.checkedInMemberIds.includes(person.id)).length;
                } else {
                  const recs = volunteerRecords.filter(r => r.locationId === person.locationId);
                  totalCount = recs.length;
                  presentCount = recs.filter(r => r.checkedInPersonnelIds && r.checkedInPersonnelIds.includes(person.id)).length;
                }
                
                const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;
                
                let chipColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                if (person.role === "Teacher") {
                  chipColor = "bg-violet-650/10 text-violet-600 dark:text-[#00E5FF] dark:bg-[#00E5FF]/10 dark:border-[#00E5FF]/20";
                } else if (person.role === "Director") {
                  chipColor = "bg-pink-500/10 text-pink-650 dark:text-[#FF007A] dark:bg-pink-500/10 dark:border-[#FF007A]/20";
                } else if (person.role === "Volunteer") {
                  chipColor = "bg-sky-500/10 text-sky-600 border-sky-500/20";
                }

                return (
                  <div
                    key={person.id}
                    className="bg-white dark:bg-[#191433]/85 p-5 border border-slate-200/80 dark:border-purple-500/15 rounded-2xl hover:border-[#FF007A]/45 hover:-translate-y-0.5 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(255,0,122,0.06)] dark:hover:shadow-[0_0_15px_rgba(255,0,122,0.15)] flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top Label & Role Badge */}
                      <div className="flex justify-between items-start gap-2">
                        <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${chipColor}`}>
                          {person.role}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-purple-200/40">
                          <MapPin className="w-3 h-3 text-slate-300 dark:text-purple-400" />
                          <span className="truncate max-w-[90px]" title={person.locationName}>{person.locationName}</span>
                        </div>
                      </div>

                      {/* Name display */}
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-3 truncate">
                        {person.name}
                      </h3>

                      {/* Cohort Group label list */}
                      {person.classNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 max-h-12 overflow-hidden">
                          {person.classNames.map(cn => (
                            <span key={cn} className="text-[9px] text-slate-400 font-medium dark:text-purple-200/60 inline-flex items-center gap-0.5">
                              ✦ {cn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom stats summary */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-purple-500/10 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 dark:text-purple-200/40 uppercase tracking-widest font-semibold">Attendance</span>
                        <span className={`text-[13px] font-bold font-mono tracking-tight ${
                          rate >= 90 ? "text-[#00E5FF] dark:drop-shadow-[0_0_4px_rgba(0,229,255,0.3)]" : "text-pink-500"
                        }`}>
                          {rate}% <span className="text-[9px] text-slate-400 font-normal">({presentCount}/{totalCount})</span>
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setSelectedPerson(person)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-[#0B0813] hover:bg-pink-500/10 hover:text-[#FF007A] hover:border-pink-550/20 dark:hover:bg-[#130F26] text-slate-600 dark:text-purple-200 border border-slate-200/65 dark:border-purple-500/15 rounded-xl text-[10px] font-extrabold tracking-wide transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile Report</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // COMPREHENSIVE INDIVIDUAL DETAIL VIEW
        <div className="space-y-6">
          {selectedPerson && personMetrics && (
            <>
              {/* Profile Card Header */}
              <div className="bg-slate-900 dark:bg-gradient-to-r dark:from-[#191433]/90 dark:to-[#22103d]/90 text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-slate-800 dark:border-purple-500/30 shadow-md">
                <div className="absolute right-0 top-0 opacity-10 translate-x-[20px] translate-y-[-20px] pointer-events-none">
                  <Sparkles className="w-64 h-64 text-indigo-400" />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left segment info */}
                  <div className="flex items-center gap-4.5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF007A] to-[#BC00DD] flex items-center justify-center text-white text-2xl font-black shadow-lg ring-4 ring-white/10 shrink-0">
                      {selectedPerson.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-white/10 rounded-full border border-white/20">
                          {selectedPerson.role}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-display font-black text-white mt-1.5 dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] leading-tight">
                        {selectedPerson.name}
                      </h2>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-300">
                        <span className="flex items-center gap-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-pink-500 dark:text-[#00E5FF]" />
                          {selectedPerson.locationName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions segment right */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
                    {/* Certificate generator trigger */}
                    {personMetrics.attendanceRate >= 90 && (
                      <button
                        onClick={() => setShowCertificate(true)}
                        className="px-4.5 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition duration-200"
                      >
                        <Trophy className="w-4.5 h-4.5" />
                        <span>Print Honor Certificate</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-header labels */}
                {selectedPerson.classNames.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Class Enrolment:</span>
                    {selectedPerson.classNames.map(cn => (
                      <span key={cn} className="px-2.5 py-1 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 text-[10px] font-bold">
                        {cn}
                      </span>
                    ))}
                  </div>
                )}

                {/* Playful Cosmic Rank Panel & Launch Celebration */}
                <div className="mt-5 pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Current Cosmic Academy Rank:</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider border ${personMetrics.rankBadge}`}>
                        {personMetrics.rankTitle}
                      </span>
                    </div>
                    {selectedPerson.type === "student" && (
                      <p className="text-xs text-purple-200/90 font-medium italic">
                        "{personMetrics.rankDesc}"
                      </p>
                    )}
                  </div>
                  
                  {/* Cosmic celebration trigger */}
                  <button
                    onClick={triggerCelebration}
                    className="w-full md:w-auto px-4.5 py-2.5 bg-gradient-to-r from-[#FF007A] to-[#BC00DD] hover:from-[#FF1A53] hover:to-[#A300C4] text-white text-xs font-black rounded-xl shadow-lg hover:shadow-[#FF007A]/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                    <span>Launch Cosmic Celebration! 🚀</span>
                  </button>
                </div>
              </div>

              {/* Bento Row: Cosmic Numbers and Streaks */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Attendance Gauge */}
                <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {selectedPerson.type === "student" ? "🚀 Rocket Fuel Power" : "Attendance Rate"}
                    </span>
                    <TrendingUp className="w-4 h-4 text-[#00E5FF]" />
                  </div>
                  <div className="py-2 flex items-baseline gap-1.5">
                    <span className={`text-4xl font-display font-black tracking-tight ${
                      personMetrics.attendanceRate >= 90 ? "text-[#00E5FF]" : "text-[#FF007A]"
                    }`}>
                      {personMetrics.attendanceRate}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">fuel</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-purple-950/40 h-2 rounded-full overflow-hidden mt-1.5 border border-transparent dark:border-purple-500/10">
                    <div 
                      className={`h-full rounded-full ${
                        personMetrics.attendanceRate >= 90 ? "bg-gradient-to-r from-[#00E5FF] to-teal-400" : "bg-gradient-to-r from-[#FF007A] to-[#BC00DD]"
                      }`}
                      style={{ width: `${personMetrics.attendanceRate}%` }}
                    />
                  </div>
                </div>

                {/* Total Present Days */}
                <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {selectedPerson.type === "student" ? "🪐 Sunday Space Missions" : "Present Assemblies"}
                    </span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="py-2 flex items-baseline gap-1.5">
                    <span className="text-4xl font-display font-black text-slate-800 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] font-mono">
                      {personMetrics.daysPresent}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{personMetrics.daysPresent === 1 ? 'mission' : 'missions'}</span>
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-purple-200/40">
                    {selectedPerson.type === "student" ? "Space launches completed successfully!" : "Total active roster assemblies"}
                  </span>
                </div>

                {/* Total Absent Days */}
                <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {selectedPerson.type === "student" ? "🛏️ Cozy Blanket Wins" : "Absent Days"}
                    </span>
                    <XCircle className="w-4 h-4 text-pink-500" />
                  </div>
                  <div className="py-2 flex items-baseline gap-1.5">
                    <span className="text-4xl font-display font-black text-slate-800 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] font-mono">
                      {personMetrics.daysAbsent}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{personMetrics.daysAbsent === 1 ? 'win' : 'wins'}</span>
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-purple-200/40">
                    {selectedPerson.type === "student" ? "Cozy blanket snoozes en-route to space!" : "Total unexcused missed assemblies"}
                  </span>
                </div>

                {/* Flame Active Streak */}
                <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/80 dark:border-purple-550/20 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {selectedPerson.type === "student" ? "🔥 Supernova Fire Streak" : "Continuous Streak"}
                    </span>
                    <Flame className={`w-4.5 h-4.5 ${personMetrics.activeStreak > 0 ? "text-[#FF007A] animate-bounce" : "text-slate-300"}`} />
                  </div>
                  <div className="py-2 flex items-baseline gap-1.5">
                    <span className="text-4xl font-display font-black text-slate-800 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] font-mono">
                      {personMetrics.activeStreak}
                    </span>
                    <span className="text-xs font-bold text-slate-400">weeks</span>
                  </div>
                  <span className="text-[10px] text-slate-450 dark:text-purple-200/40 font-semibold text-rose-500">
                    {personMetrics.activeStreak > 0 
                      ? `Double-fired Nova speed active! ⚡` 
                      : `Longest streak was ${personMetrics.currentStreak} weeks!`}
                  </span>
                </div>

              </div>

              {/* Attendance Timeline Records */}
              <div className="bg-white dark:bg-[#191433]/80 p-6 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#FF007A]" />
                    <span>Attendance Performance Logs</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-450 dark:text-purple-200/50">
                    Evaluated over {personMetrics.totalConducted} recorded {personMetrics.totalConducted === 1 ? 'Sunday' : 'Sundays'}
                  </span>
                </div>

                {personMetrics.history.length === 0 ? (
                  <div className="p-10 border border-dashed border-slate-150 dark:border-purple-500/10 rounded-2xl text-center text-slate-400 dark:text-purple-200/35">
                    <Calendar className="w-8 h-8 mx-auto text-slate-250 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">No historic markings compiled yet</p>
                    <p className="text-[10px] mt-1 text-slate-400">Attendance records must be marked under the "Attendance Desk" first.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-2 select-text">
                    {personMetrics.history.map((h, i) => {
                      const dateObj = new Date(h.date);
                      const formattedDate = isNaN(dateObj.getTime()) 
                        ? h.date 
                        : dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

                      return (
                        <div
                          key={`${h.date}-${i}`}
                          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition duration-150 ${
                            h.present
                              ? "bg-emerald-500/4 border-emerald-500/15 dark:bg-[#0E2F2E]/30 dark:border-[#00E5FF]/20 shadow-[0_0_8px_rgba(0,229,255,0.02)]"
                              : "bg-pink-500/4 border-pink-500/15 dark:bg-[#340F22]/20 dark:border-[#FF007A]/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              h.present 
                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950 dark:text-[#00E5FF]" 
                                : "bg-pink-500/10 text-pink-600 dark:bg-pink-950 dark:text-[#FF3366]"
                            }`}>
                              {h.present ? <CheckCircle className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
                            </span>
                            <div>
                              <div className="font-bold text-xs text-slate-700 dark:text-purple-100 flex items-center gap-2">
                                <span>{formattedDate}</span>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-purple-200/40">✦ {h.category}</span>
                              </div>
                              <p className="text-[10px] mt-0.5 text-slate-500 dark:text-purple-200/60 leading-relaxed font-mono">
                                Remarks: <span className="font-sans italic font-medium">"{h.notes}"</span>
                              </p>
                            </div>
                          </div>

                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 md:self-center self-start ${
                            h.present
                              ? "bg-emerald-50/50 text-emerald-700 dark:bg-teal-950/20 dark:text-[#00E5FF] dark:border-[#00E5FF]/30"
                              : "bg-pink-50/50 text-pink-700 dark:bg-pink-950/20 dark:text-[#FF007A] dark:border-pink-500/30"
                          }`}>
                            {h.present ? "Present ✔" : "Absent ✕"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Galaxy Honor Certificate Modal Overlay (Print Friendly) */}
      {showCertificate && selectedPerson && personMetrics && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in print:hidden">
          <div className="bg-white dark:bg-[#130F26] border-2 border-amber-500/30 dark:border-amber-500/50 p-6 sm:p-10 rounded-2xl max-w-4xl w-full shadow-2xl relative select-none">
            
            {/* Close trigger button */}
            <button
              onClick={() => setShowCertificate(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-purple-200 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-purple-900/30 transition"
            >
              <X className="w-6 h-6" />
            </button>

            {/* PRINT-FRIENDLY BOUNDARY WRAPPER */}
            <div id="print-certificate-container" ref={certificateRef} className="border-8 border-double border-amber-500/60 rounded-xl p-8 sm:p-12 text-center bg-radial-gradient from-amber-50/20 to-white dark:from-[#1E1139] dark:to-[#0B0813] text-slate-800 dark:text-white relative overflow-hidden">
              {/* Star trails pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-300 via-pink-300 to-indigo-800" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex justify-center mx-auto mb-2">
                  <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-full flex items-center justify-center text-slate-900 shadow-lg border-2 border-white dark:border-amber-400">
                    <Trophy className="w-10 h-10 animate-bounce" />
                  </div>
                </div>

                <div className="uppercase tracking-[0.2em] text-[#FF007A] font-black text-xs sm:text-sm">
                  🏆 Stellar Sunday Superstar Award 🌟
                </div>
                
                <h1 className="text-3xl sm:text-5xl font-display font-black text-slate-800 dark:text-white tracking-tight italic">
                  DaAttendance Cosmic Academy 🚀
                </h1>
                
                <div className="w-40 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto my-3" />
                
                <p className="text-xs sm:text-sm text-slate-500 dark:text-purple-200/70 max-w-xl mx-auto italic font-medium leading-relaxed">
                  {selectedPerson.type === "student"
                    ? "This ultra-shiny galactic decoration is officially conferred upon this absolute Sunday School Legend who brought massive smiles, asked awesome questions, and completed stellar launches to Church every single week! 🪐"
                    : "This supreme stellar decoration is officially conferred upon this outstanding leader who has demonstrated celestial commitment, persistence, and continuous perfect faith gathering guidance. ✨"
                  }
                </p>

                <div className="py-2">
                  <span className="text-slate-400 dark:text-purple-300 font-bold uppercase text-[11px] tracking-wider block">Presented Outstandingly to:</span>
                  <div className="text-2xl sm:text-4xl font-black font-display text-slate-900 dark:text-[#00E5FF] tracking-tight mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
                    {selectedPerson.name}
                  </div>
                  <div className="inline-flex items-center gap-1 sm:text-xs text-[10px] uppercase font-bold text-slate-400 dark:text-purple-200/40 bg-slate-50 dark:bg-purple-950/20 px-3 py-1 rounded-full border border-slate-200 dark:border-purple-500/10 mt-3">
                    Cadet Rank: <strong className="text-slate-800 dark:text-purple-100">{personMetrics.rankTitle}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto py-3 bg-white/45 dark:bg-purple-950/20 border border-slate-200/45 dark:border-purple-500/10 rounded-xl">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest leading-none mb-1">ROCKET FUEL</span>
                    <span className="text-lg sm:text-xl font-bold font-mono text-[#00E5FF] leading-none">{personMetrics.attendanceRate}%</span>
                  </div>
                  <div className="border-x border-slate-200/55 dark:border-purple-500/10">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest leading-none mb-1">SPACE MISSIONS</span>
                    <span className="text-lg sm:text-xl font-bold font-mono text-emerald-500 leading-none">{personMetrics.daysPresent}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest leading-none mb-1">SUPERNOVA STREAK</span>
                    <span className="text-lg sm:text-xl font-bold font-mono text-[#FF007A] leading-none">✦ {personMetrics.currentStreak} wks</span>
                  </div>
                </div>

                <div className="flex justify-between items-center max-w-sm mx-auto pt-6 border-t border-dashed border-slate-200/60 dark:border-purple-550/15">
                  <div className="text-left">
                    <div className="w-24 h-1 px-1 bg-slate-200 dark:bg-purple-900/60" />
                    <span className="text-[9px] uppercase text-slate-450 font-bold block mt-1">Chief Space Coordinator</span>
                  </div>
                  <div className="relative">
                    {/* Retro Stamp Emblem */}
                    <div className="w-14 h-14 rounded-full border-4 border-[#00E5FF]/45 flex items-center justify-center text-[#00E5FF]/50 rotate-[-12deg] font-black font-display text-[8px] leading-tight select-none pointer-events-none uppercase tracking-wider">
                      Perfect Faith 🌠
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-24 h-1 px-1 bg-slate-200 dark:bg-purple-900/60 align-right" />
                    <span className="text-[9px] uppercase text-slate-450 font-bold block mt-1">Arch-Angel of Roll Call</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Print action trigger button row */}
            <div className="flex justify-between items-center mt-6">
              <span className="text-[10px] font-bold text-slate-450 dark:text-purple-200/40">💡 Tip: Use your browser's Print option to save as PDF or Print!</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCertificate(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-purple-950/40 dark:hover:bg-purple-950/70 text-slate-700 dark:text-purple-200 border border-slate-200 dark:border-purple-500/10 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePrintCertificate}
                  className="px-5 py-2 bg-gradient-to-r from-pink-500 to-indigo-500 text-white text-xs font-black rounded-xl hover:opacity-90 transition flex items-center gap-1.5 shadow-md shadow-pink-500/15"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Certificate Now</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Floating Space Emojis Celebration Layer */}
      {celebrations.map((c) => (
        <span
          key={c.id}
          className="fixed bottom-0 pointer-events-none text-5xl select-none z-50 animate-float-up"
          style={{
            left: `${c.left}vw`,
            animationDelay: `${c.delay}s`,
            animationDuration: '3.5s',
          }}
        >
          {c.emoji}
        </span>
      ))}

    </div>
  );
}
