import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Award, Calendar, TrendingUp, CheckCircle, XCircle, X, Check, Users,
  ChevronRight, Eye, MapPin, Activity, FileText, ArrowLeft, Loader2, ShieldAlert,
  ChevronDown, ChevronUp, FileSpreadsheet
} from "lucide-react";
import { User } from "../types";
import { exportAttendanceMatrixToExcel } from "../utils/excelMatrixExporter";

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
  phone?: string;
  status: "active" | "inactive";
  joinedDate?: string;
  classIds: string[];
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
  role?: string;
}

interface StudentAttendanceRecord {
  id: string;
  classId: string;
  date: string;
  checkedInMemberIds: string[];
  notes?: string;
}

interface VolunteerAttendanceRecord {
  id: string;
  locationId: string;
  date: string;
  checkedInPersonnelIds: string[];
  notes?: string;
}

export default function ReportsModule({ currentUser }: { currentUser?: User | null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw Database Tables
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([]);
  const [volunteerRecords, setPersonnelRecords] = useState<VolunteerAttendanceRecord[]>([]);

  // Search and Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher" | "volunteer">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [atRiskFilter, setAtRiskFilter] = useState(false);

  // Collapsible logs toggle
  const [showLogs, setShowLogs] = useState(false);

  // Detailed Individual View Selection
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
  
  const filterGroupRef = useRef<HTMLDivElement>(null);

  // Load all necessary databases for computing stats
  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bootstrap?_t=${Date.now()}`);
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

    const seenIds = new Set<string>();

    // Add students
    students.forEach(s => {
      if (seenIds.has(`student-${s.id}`)) return;
      seenIds.add(`student-${s.id}`);

      // Find class details
      const studentClasses = classes.filter(c => s.classIds && s.classIds.includes(c.id));
      const classNames = studentClasses.map(c => c.name);
      
      // Location / Cohort Name is based on assigned class
      let locationName = classNames.length > 0 ? classNames.join(", ") : "Unassigned Class";
      let locationId = "";
      if (studentClasses.length > 0) {
        locationId = studentClasses[0].locationId;
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
      if (seenIds.has(`personnel-${t.id}`)) return;
      seenIds.add(`personnel-${t.id}`);

      const assignedClassNames = classes
        .filter(c => c.assignedTeacherId && c.assignedTeacherId.split(",").map(id => id.trim()).includes(t.id))
        .map(c => c.name);

      const locationName = assignedClassNames.length > 0 ? assignedClassNames.join(", ") : "Unassigned Class";
      
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
      if (seenIds.has(`personnel-${v.id}`)) return;
      seenIds.add(`personnel-${v.id}`);

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
    const attendanceRate = totalConducted > 0 ? Math.round((daysPresent / totalConducted) * 100) : 0;

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

    return {
      totalConducted,
      daysPresent,
      daysAbsent,
      attendanceRate,
      currentStreak,
      activeStreak,
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

  // Auto-scroll to filter group when user scrolls past roster cards
  useEffect(() => {
    const trigger = document.getElementById("end-of-section-trigger");
    const filterGroup = filterGroupRef.current;

    if (!trigger || !filterGroup) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              filterGroup.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 300);
          }
        });
      },
      { root: null, threshold: 1.0 }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6 font-sans relative">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-6 rounded-2xl border border-slate-200/60 dark:border-purple-500/20 shadow-xs relative z-10 print:hidden">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Award className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-xl font-display font-black text-slate-800 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] leading-tight">
              Academy Reports
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportAttendanceMatrixToExcel({
              locations,
              classes,
              students,
              teachers,
              volunteers,
              studentRecords,
              volunteerRecords,
              targetLocationId: locationFilter
            })}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600/90 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            title="Download multi-tab Excel matrix spreadsheet for selected/all campuses"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Matrix Excel</span>
          </button>

          {selectedPerson && (
            <button 
              onClick={() => { setSelectedPerson(null); setShowLogs(false); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#0B0813] dark:hover:bg-[#130F26] text-slate-700 dark:text-purple-200/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-purple-500/20 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to List
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-[#191433]/40 border border-slate-200/60 dark:border-purple-500/10 rounded-2xl">
          <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
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
          
          {/* Filters Bar */}
          <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md p-5 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl shadow-xs space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Search bar input */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-purple-200/40" />
                <input
                  type="text"
                  placeholder="Query student, teacher, director by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 hover:border-slate-350 dark:bg-[#0B0813] dark:border-purple-500/15 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-semibold text-slate-800 dark:text-white transition"
                />
              </div>

              {/* Role Filter Selector */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 dark:bg-[#0B0813] dark:border-purple-500/15 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-850 dark:text-purple-200/80 transition"
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 dark:bg-[#0B0813] dark:border-purple-500/15 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-850 dark:text-purple-200/80 transition"
                >
                  <option value="all">📍 All Campuses</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Quick Helper Sub-Filter: Class Selection (only shown for student/teacher relevant choices) */}
            <div id="filter-group-section" ref={filterGroupRef} className="pt-2 border-t border-slate-100 dark:border-purple-500/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-purple-200/40 tracking-wider block">Filter Group:</span>
              <div className="filter-group-wrapper">
                <button
                  onClick={() => setClassFilter("all")}
                  className={`filter-btn ${classFilter === "all" ? "active" : ""}`}
                >
                  All Ministry Groups
                </button>
                {classes
                  .filter(c => locationFilter === "all" || c.locationId === locationFilter)
                  .map(c => (
                    <button
                      key={c.id}
                      onClick={() => setClassFilter(c.id)}
                      className={`filter-btn ${classFilter === c.id ? "active" : ""}`}
                    >
                      {c.name}
                    </button>
                  ))
                }
                <div className="w-px bg-slate-300 dark:bg-purple-500/20 mx-1 self-stretch" />
                <button
                  onClick={() => setAtRiskFilter(!atRiskFilter)}
                  className={`filter-btn ${atRiskFilter ? "active" : ""}`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 inline-block -mt-0.5 mr-1" />
                  <span>At-Risk (3+ Consecutive Absences)</span>
                  {atRiskStudentIds.size > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${atRiskFilter ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-slate-200 dark:bg-purple-500/15 text-slate-500 dark:text-purple-300"}`}>
                      {atRiskStudentIds.size}
                    </span>
                  )}
                </button>
              </div>
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
                className="mt-3 text-xs text-indigo-600 hover:underline font-bold"
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
                
                const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
                
                let badgeClass = "badge-student";
                if (person.role === "Teacher") {
                  badgeClass = "badge-teacher";
                } else if (person.role === "Director") {
                  badgeClass = "badge-director";
                } else if (person.role === "Volunteer") {
                  badgeClass = "badge-volunteer";
                }

                return (
                  <div
                    key={`${person.type}-${person.id}`}
                    className="attendance-card flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top Label & Role Badge */}
                      <div className="flex justify-between items-start gap-2">
                        <span className={badgeClass}>
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
                        <span className={`card-attendance-percentage text-[13px] font-bold font-mono tracking-tight ${
                          rate >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {rate}% <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({presentCount}/{totalCount})</span>
                        </span>
                      </div>
                      
                      <button
                        onClick={() => { setSelectedPerson(person); setShowLogs(false); }}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-[#0B0813] hover:bg-indigo-100 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-semibold transition flex items-center gap-1"
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
          {/* Scroll-spy trigger: auto-snaps filter bar into view when scrolled past */}
          <div id="end-of-section-trigger" className="h-1" />
        </div>
      ) : (
        // COMPREHENSIVE INDIVIDUAL DETAIL VIEW
        <div className="space-y-6">
          {selectedPerson && personMetrics && (
            <>
              {/* Profile Card Header */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-[#191433]/90 dark:to-[#130F26]/90 text-white p-6 sm:p-7 rounded-3xl relative overflow-hidden border border-slate-200/20 dark:border-purple-500/20 shadow-lg">
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left segment info */}
                  <div className="flex items-center gap-4.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-md ring-4 ring-white/10 shrink-0">
                      {selectedPerson.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                          {selectedPerson.role}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-display font-black text-white mt-1 leading-tight">
                        {selectedPerson.name}
                      </h2>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-300">
                        <span className="flex items-center gap-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                          {selectedPerson.locationName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions segment right */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setSelectedPerson(null); setShowLogs(false); }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Directory</span>
                    </button>
                  </div>
                </div>

                {/* Sub-header labels */}
                {selectedPerson.classNames.length > 0 && (
                  <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Class Enrolment:</span>
                    {selectedPerson.classNames.map(cn => (
                      <span key={cn} className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-[10px] font-bold">
                        {cn}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bento Row: Attendance Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Card 1: Attendance Rate */}
                <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ATTENDANCE RATE</span>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="py-2">
                    <span className={`text-4xl font-display font-black tracking-tight ${
                      personMetrics.attendanceRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : personMetrics.attendanceRate >= 75 ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {personMetrics.attendanceRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-purple-950/40 h-2 rounded-full overflow-hidden border border-transparent dark:border-purple-500/10">
                    <div 
                      className={`h-full rounded-full ${
                        personMetrics.attendanceRate >= 90 ? "bg-emerald-500" : personMetrics.attendanceRate >= 75 ? "bg-indigo-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${personMetrics.attendanceRate}%` }}
                    />
                  </div>
                </div>

                {/* Card 2: Services Attended */}
                <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SERVICES ATTENDED</span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="py-2">
                    <span className="text-4xl font-display font-black text-slate-800 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] font-mono">
                      {personMetrics.daysPresent}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-purple-200/50 font-medium">
                    {personMetrics.daysPresent} / {personMetrics.totalConducted} Sessions Attended
                  </span>
                </div>

                {/* Card 3: Consecutive Weeks Attended */}
                <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/80 dark:border-purple-550/20 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">CONSECUTIVE WEEKS</span>
                    <Calendar className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="py-2">
                    <span className="text-4xl font-display font-black text-slate-800 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] font-mono">
                      {personMetrics.activeStreak}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-purple-200/50 font-medium">
                    {personMetrics.activeStreak === 1 ? '1 Week Streak' : `${personMetrics.activeStreak} Weeks Streak`}
                  </span>
                </div>

              </div>

              {/* Collapsible Attendance Timeline Records */}
              <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/80 dark:border-purple-500/20 rounded-2xl shadow-xs">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span>Attendance History Logs</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-purple-200/50 mt-0.5">
                        {personMetrics.totalConducted} recorded {personMetrics.totalConducted === 1 ? 'Sunday session' : 'Sunday sessions'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3.5 py-1.5 rounded-xl border border-indigo-200/50 dark:border-indigo-500/20 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/40 transition flex items-center gap-1.5">
                      <span>{showLogs ? "Hide Logs" : "View Logs"}</span>
                      {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </div>
                </button>

                {showLogs && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-purple-500/10 space-y-3.5">
                    {personMetrics.history.length === 0 ? (
                      <div className="p-8 border border-dashed border-slate-150 dark:border-purple-500/10 rounded-2xl text-center text-slate-400 dark:text-purple-200/35">
                        <Calendar className="w-8 h-8 mx-auto text-slate-250 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wider">No historic markings compiled yet</p>
                        <p className="text-[10px] mt-1 text-slate-400">Attendance records will appear here after marking attendance under "Attendance Desk".</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 select-text">
                        {personMetrics.history.map((h, i) => {
                          const dateObj = new Date(h.date);
                          const formattedDate = isNaN(dateObj.getTime()) 
                            ? h.date 
                            : dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

                          return (
                            <div
                              key={`${h.date}-${i}`}
                              className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition duration-150 ${
                                h.present
                                  ? "bg-emerald-500/4 border-emerald-500/15 dark:bg-[#0E2F2E]/30 dark:border-[#00E5FF]/20"
                                  : "bg-pink-500/4 border-pink-500/15 dark:bg-[#340F22]/20 dark:border-indigo-500/20"
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
                                  : "bg-pink-50/50 text-pink-700 dark:bg-pink-950/20 dark:text-indigo-400 dark:border-indigo-500/30"
                              }`}>
                                {h.present ? "Present ✔" : "Absent ✕"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
