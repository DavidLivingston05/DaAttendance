import React, { useState, useEffect } from "react";
import { Check, Calendar, Notebook, RefreshCw, UserCheck, Shield, Users, Smile, HelpCircle, ThumbsUp, Trash2, ChevronLeft, ChevronRight, User as UserIcon } from "lucide-react";
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

interface Teacher {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  classIds: string[];
}

interface Volunteer {
  id: string;
  name: string;
  locationId: string;
  role?: "Volunteer" | "Director";
}

interface AttendanceModuleProps {
  currentUser: User;
}

const SUNDAYS_2026 = (() => {
  const sundays = [];
  const date = new Date(2026, 0, 1); // Jan 1, 2026
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }
  while (date.getFullYear() === 2026) {
    sundays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return sundays.map(d => {
    const yyyy = d.getFullYear();
    const mIndex = d.getMonth(); // 0-11
    const dNum = d.getDate(); // 1-31
    const mm = String(mIndex + 1).padStart(2, '0');
    const dd = String(dNum).padStart(2, '0');
    const value = `${yyyy}-${mm}-${dd}`;
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    return { value, label, monthIndex: mIndex, dayNum: dNum };
  });
})();

const getClosestSundayOf2026 = () => {
  const today = new Date();
  const year = today.getFullYear();
  if (year !== 2026) {
    return "2026-05-24";
  }
  
  let closest = SUNDAYS_2026[0].value;
  let minDiff = Infinity;
  const todayMs = today.getTime();
  
  for (const s of SUNDAYS_2026) {
    const sDate = new Date(s.value);
    const diff = Math.abs(sDate.getTime() - todayMs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s.value;
    }
  }
  return closest;
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AttendanceModule({ currentUser }: AttendanceModuleProps) {
  // Navigation tabs of attendance
  const [activeFlow, setActiveFlow] = useState<"student" | "volunteer">("student");

  // Databases Loaded
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  
  // Historical check-ins state
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [volunteerRecords, setVolunteerRecords] = useState<any[]>([]);

  // Selection states
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getClosestSundayOf2026());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => {
    const parts = getClosestSundayOf2026().split("-");
    if (parts.length === 3) {
      return parseInt(parts[1], 10) - 1;
    }
    return 4; // Default to May
  });

  // Checked in entities IDs
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);
  const [checkedVolunteerIds, setCheckedVolunteerIds] = useState<string[]>([]);
  
  const [notes, setNotes] = useState("");
  const [expandedStudentAbsences, setExpandedStudentAbsences] = useState<Record<string, boolean>>({});
  const [expandedPersonnelAbsences, setExpandedPersonnelAbsences] = useState<Record<string, boolean>>({});
  const [deleteStuConfirm, setDeleteStuConfirm] = useState(false);
  const [deleteVolConfirm, setDeleteVolConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bootstrap?_t=${Date.now()}`);
      if (!res.ok) {
        throw new Error("Could not pull directory values. Please reload.");
      }

      const data = await res.json();
      const locs: Location[] = data.locations;
      const clss: ClassSession[] = data.classes;
      
      setLocations(locs);
      setClasses(clss);
      setTeachers(data.teachers);
      setStudents(data.members);
      setVolunteers(data.volunteers);
      setStudentRecords(data.attendance);
      setVolunteerRecords(data.volunteerAttendance);

      // Set default location choice
      if (locs.length > 0) {
        setSelectedLocationId(locs[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sync Class options based on location selection
  useEffect(() => {
    if (selectedLocationId) {
      const filtered = classes.filter(c => c.locationId === selectedLocationId);
      if (filtered.length > 0 && !filtered.some(c => c.id === selectedClassId)) {
        setSelectedClassId(filtered[0].id);
      } else if (filtered.length === 0) {
        setSelectedClassId("");
      }
    }
  }, [selectedLocationId, classes]);

  // Sync Checked status for Student List based on Class & Date choice
  useEffect(() => {
    if (selectedClassId && selectedDate) {
      const match = studentRecords.find(r => r.classId === selectedClassId && r.date === selectedDate);
      if (match) {
        setCheckedStudentIds(match.checkedInMemberIds || []);
        setNotes(match.notes || "");
      } else {
        setCheckedStudentIds([]);
        setNotes("");
      }
      setDeleteStuConfirm(false);
    }
  }, [selectedClassId, selectedDate, studentRecords]);

  // Sync Checked status for Volunteer List based on Location & Date choice
  useEffect(() => {
    if (selectedLocationId && selectedDate) {
      const match = volunteerRecords.find(r => r.locationId === selectedLocationId && r.date === selectedDate);
      if (match) {
        setCheckedVolunteerIds(match.checkedInPersonnelIds || []);
        setNotes(match.notes || "");
      } else {
        setCheckedVolunteerIds([]);
        setNotes("");
      }
      setDeleteVolConfirm(false);
    }
  }, [selectedLocationId, selectedDate, volunteerRecords]);

  // Keep calendarMonth synced when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const monthNum = parseInt(parts[1], 10) - 1; // 0-based
        setCalendarMonth(monthNum);
      }
    }
  }, [selectedDate]);

  // UI callbacks
  const handleToggleStudent = (id: string) => {
    setCheckedStudentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleVolunteer = (id: string) => {
    setCheckedVolunteerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleStudentSelectAll = (ids: string[]) => {
    setCheckedStudentIds(ids);
  };

  const handleVolunteerSelectAll = (ids: string[]) => {
    setCheckedVolunteerIds(ids);
  };

  // Submissions
  const handleSubmitStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      setError("Please select a physical class first");
      return;
    }
    setError(null);
    setSuccess(null);

    const payload = {
      classId: selectedClassId,
      date: selectedDate,
      checkedInMemberIds: checkedStudentIds,
      notes,
      recordedBy: currentUser.id
    };

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save operation failed.");

      setSuccess("Sunday student roll saved successfully!");
      setStudentRecords(prev => {
        const filtered = prev.filter(a => !(a.classId === selectedClassId && a.date === selectedDate));
        return [...filtered, data];
      });
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitVolunteers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId) {
      setError("Please select a location first");
      return;
    }
    setError(null);
    setSuccess(null);

    const payload = {
      locationId: selectedLocationId,
      date: selectedDate,
      checkedInPersonnelIds: checkedVolunteerIds,
      notes,
    };

    try {
      const res = await fetch("/api/volunteer-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save operations failed.");

      setSuccess("Staff and volunteer attendance logs updated!");
      setVolunteerRecords(prev => {
        const filtered = prev.filter(a => !(a.locationId === selectedLocationId && a.date === selectedDate));
        return [...filtered, data];
      });
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteStudentAttendance = async () => {
    if (!selectedClassId || !selectedDate) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/attendance?classId=${selectedClassId}&date=${selectedDate}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete record.");

      setSuccess("Student attendance for this date has been completely deleted/removed!");
      setCheckedStudentIds([]);
      setNotes("");
      setStudentRecords(prev => prev.filter(a => !(a.classId === selectedClassId && a.date === selectedDate)));
      setDeleteStuConfirm(false);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePersonnelAttendance = async () => {
    if (!selectedLocationId || !selectedDate) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/volunteer-attendance?locationId=${selectedLocationId}&date=${selectedDate}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete record.");

      setSuccess("Personnel attendance for this date has been completely deleted/removed!");
      setCheckedVolunteerIds([]);
      setNotes("");
      setVolunteerRecords(prev => prev.filter(a => !(a.locationId === selectedLocationId && a.date === selectedDate)));
      setDeleteVolConfirm(false);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Calculations & Filters
  const filteredClasses = classes.filter(c => c.locationId === selectedLocationId);
  const selectedClassObj = classes.find(c => c.id === selectedClassId);
  
  // Find Teachers Assigned
  const assignedTeachers = selectedClassObj && selectedClassObj.assignedTeacherId
    ? teachers.filter(t => selectedClassObj.assignedTeacherId.split(",").map(id => id.trim()).includes(t.id))
    : [];

  // Students belonging to class (deduplicated by normalized name)
  const classRoster = (() => {
    const list: Student[] = [];
    const seenNames = new Set<string>();
    students
      .filter(s => s.classIds && s.classIds.includes(selectedClassId))
      .forEach(s => {
        const key = s.name.toLowerCase().trim();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          list.push(s);
        }
      });
    return list;
  })();
  
  // Teachers belonging to location
  const locationTeachers = teachers.filter(t => t.locationId === selectedLocationId);
  const locationVolunteers = volunteers.filter(v => v.locationId === selectedLocationId);

  // Set of student names to prevent student cards leaking into personnel list
  const studentNamesSet = new Set(students.map(s => s.name.toLowerCase().trim()));

  // Filter out any teacher or volunteer records that are actually students or have "student" in role
  const filteredTeachers = locationTeachers.filter(t => !studentNamesSet.has(t.name.toLowerCase().trim()));

  const filteredVolunteers = locationVolunteers.filter(v => {
    const roleLower = (v.role || "").toLowerCase();
    if (roleLower.includes("student")) return false;
    if (studentNamesSet.has(v.name.toLowerCase().trim())) return false;
    return true;
  });

  // Unified list of leaders and staff (deduplicated by normalized name)
  const activePersonnel = (() => {
    const list: Array<{
      id: string;
      name: string;
      role: "Teacher" | "Director" | "Volunteer";
      color: "emerald" | "indigo" | "sky";
    }> = [];
    const seenNames = new Set<string>();

    filteredTeachers.forEach(t => {
      const key = t.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        list.push({
          id: t.id,
          name: t.name,
          role: "Teacher",
          color: "emerald"
        });
      }
    });

    filteredVolunteers.forEach(v => {
      const key = v.name.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        const isDir = v.role === "Director" || (v.role === undefined && /director|charge|coordinator|leader|pastor/i.test(v.name));
        list.push({
          id: v.id,
          name: v.name,
          role: isDir ? "Director" : "Volunteer",
          color: isDir ? "indigo" : "sky"
        });
      }
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  })();

  const studentRecordExists = studentRecords.some(r => r.classId === selectedClassId && r.date === selectedDate);
  const personnelRecordExists = volunteerRecords.some(r => r.locationId === selectedLocationId && r.date === selectedDate);

  return (
    <div className="space-y-6 font-sans relative">
      
      {/* Attendance Flow Selectors */}
      <div className="bg-white dark:bg-[#191433]/80 dark:backdrop-blur-md border border-slate-200/60 dark:border-purple-500/20 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm relative z-10">
        <div>
          <h2 className="text-xl font-display font-black text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">Active Attendance Desk</h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setActiveFlow("student"); setError(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeFlow === "student"
                ? "bg-gradient-to-r from-[#FF007A] to-[#BC00DD] text-white shadow-[0_4px_12px_rgba(255,0,122,0.2)] dark:shadow-[0_0_15px_rgba(255,0,122,0.4)]"
                : "bg-slate-50 border border-slate-200/60 text-slate-600 hover:bg-slate-100 dark:bg-[#191433] dark:border-purple-500/20 dark:text-purple-200/70 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 text-pink-500" />
            <span>Students Attendance List</span>
          </button>
          
          <button
            onClick={() => { setActiveFlow("volunteer"); setError(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeFlow === "volunteer"
                ? "bg-gradient-to-r from-[#FF007A] to-[#BC00DD] text-white shadow-[0_4px_12px_rgba(255,0,122,0.2)] dark:shadow-[0_0_15px_rgba(255,0,122,0.4)]"
                : "bg-slate-50 border border-slate-200/60 text-slate-600 hover:bg-slate-100 dark:bg-[#191433] dark:border-purple-500/20 dark:text-purple-200/70 dark:hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4 text-[#00E5FF]" />
            <span>Teachers, Volunteers & Directors Log</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#191433]/80 p-16 text-center border border-slate-200 dark:border-purple-500/20 rounded-2xl text-slate-500 dark:text-purple-200/60 text-sm font-semibold relative z-10 backdrop-blur-md">
          Synchronizing directories & attendance history...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          
          {/* Left panel: dynamic filters */}
          <div className="lg:col-span-4 bg-white dark:bg-[#191433]/85 p-5 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl h-fit space-y-4 shadow-sm backdrop-blur-md">
            
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-purple-200/70">Attendance settings</h3>

            {/* Location Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">1. Choose Location</label>
              <select
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                }}
                className="w-full px-3 py-2 border border-slate-200/60 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              >
                <option value="">-- Choose Church Location --</option>
                {locations.map(loc => (
                  <option className="dark:bg-[#130F26]" key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            {/* If Student Flow, Class Select is shown */}
            {activeFlow === "student" && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">2. Select Class name</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={!selectedLocationId}
                  className="w-full px-3 py-2 border border-slate-200/60 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 disabled:opacity-55"
                >
                  <option value="">-- Choose Class Group --</option>
                  {filteredClasses.map(c => (
                    <option className="dark:bg-[#130F26]" key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Professional Grid-Based 2026 Sunday School Calendar & Date Picker */}
            <div className="bg-slate-50 dark:bg-[#130F26]/60 p-4 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 dark:text-purple-200/70 uppercase tracking-wider block font-display">
                  School Calendar (2026)
                </span>
                
                {(() => {
                  const conducted = SUNDAYS_2026.filter(sun => {
                    if (activeFlow === "student") {
                      return studentRecords.some(r => r.classId === selectedClassId && r.date === sun.value);
                    } else {
                      return volunteerRecords.some(r => r.locationId === selectedLocationId && r.date === sun.value);
                    }
                  }).length;
                  return (
                    <span className="text-[9px] font-extrabold text-white bg-gradient-to-r from-[#FF007A] to-[#BC00DD] px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(255,0,122,0.5)] border border-pink-500/30">
                      {conducted}/52 Conducted
                    </span>
                  );
                })()}
              </div>

              {/* Month Selector header with Chevrons and Quick Select Dropdown */}
              <div className="flex items-center justify-between bg-white dark:bg-[#191433] px-3 py-1.5 border border-slate-200/60 dark:border-purple-500/20 rounded-xl shadow-sm">
                <button
                  type="button"
                  onClick={() => setCalendarMonth(prev => Math.max(0, prev - 1))}
                  disabled={calendarMonth === 0}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="relative flex items-center justify-center">
                  <select
                    value={calendarMonth}
                    onChange={(e) => setCalendarMonth(parseInt(e.target.value, 10))}
                    className="pr-4 py-0.5 text-xs font-bold text-center text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer border-none rounded"
                  >
                    {MONTHS_FULL.map((m, idx) => (
                      <option className="dark:bg-[#191433]" key={idx} value={idx}>{m} 2026</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setCalendarMonth(prev => Math.min(11, prev + 1))}
                  disabled={calendarMonth === 11}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Grid-based Date Picker View */}
              <div className="bg-white dark:bg-[#191433]/50 p-3.5 border border-slate-200/60 dark:border-purple-500/10 rounded-xl">
                {/* Check warning status */}
                {activeFlow === "student" && !selectedClassId && (
                  <div className="mb-2.5 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-105 text-center rounded-lg text-[10px] text-yellow-700 dark:text-yellow-400 font-semibold leading-relaxed">
                    ⚠️ Choose Class group first to show live conduction indicators.
                  </div>
                )}
                {activeFlow === "volunteer" && !selectedLocationId && (
                  <div className="mb-2.5 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-105 text-center rounded-lg text-[10px] text-yellow-700 dark:text-yellow-400 font-semibold leading-relaxed">
                    ⚠️ Choose Location first to show live conduction indicators.
                  </div>
                )}

                {/* Weekdays Labels */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {(() => {
                    const year = 2026;
                    const firstDayOfWeek = new Date(year, calendarMonth, 1).getDay(); // 0 is Sunday
                    const totalDays = new Date(year, calendarMonth + 1, 0).getDate();

                    const cells = [];
                    // Padding before the first day
                    for (let i = 0; i < firstDayOfWeek; i++) {
                      cells.push(
                        <div key={`pad-${i}`} className="aspect-square" />
                      );
                    }

                    // Calendar days
                    for (let d = 1; d <= totalDays; d++) {
                      const mmStr = String(calendarMonth + 1).padStart(2, '0');
                      const ddStr = String(d).padStart(2, '0');
                      const dateString = `${year}-${mmStr}-${ddStr}`;
                      const isSunday = new Date(year, calendarMonth, d).getDay() === 0;
                      const isSelected = selectedDate === dateString;
                      
                      let conducted = false;
                      if (activeFlow === "student") {
                        conducted = !!selectedClassId && studentRecords.some(r => r.classId === selectedClassId && r.date === dateString);
                      } else {
                        conducted = !!selectedLocationId && volunteerRecords.some(r => r.locationId === selectedLocationId && r.date === dateString);
                      }

                      if (isSunday) {
                        cells.push(
                          <button
                            key={`sun-${d}`}
                            type="button"
                            onClick={() => setSelectedDate(dateString)}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center p-0.5 transition border relative group ${
                              isSelected
                                ? "bg-gradient-to-r from-[#FF007A] to-[#BC00DD] border-transparent text-white font-black shadow-md shadow-[#FF007A]/20"
                                : conducted
                                  ? "bg-violet-50 hover:bg-violet-100 text-violet-850 border-violet-200 dark:bg-[#1C1645] dark:text-[#00E5FF] dark:border-purple-500/30 font-semibold"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-[#241B46]/40 dark:text-purple-200/50 border-slate-200/60 dark:border-purple-500/20 font-normal"
                            }`}
                            title={`Sunday, ${MONTHS_SHORT[calendarMonth]} ${d}, 2026 - ${conducted ? "Conducted" : "No record"}`}
                          >
                            <span className="text-xs font-mono">{d}</span>
                            {/* Status circle badge inside the active Sunday cell */}
                            <span className={`w-1 h-1 rounded-full mt-0.5 ${
                              isSelected 
                                ? "bg-white" 
                                : conducted 
                                  ? "bg-[#00E5FF]" 
                                  : "bg-slate-300 dark:bg-purple-500/35"
                            }`} />
                          </button>
                        );
                      } else {
                        // Non-Sunday cell is inert
                        cells.push(
                          <div
                            key={`day-${d}`}
                            className="aspect-square flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-705 font-medium cursor-default select-none"
                          >
                            {d}
                          </div>
                        );
                      }
                    }
                    return cells;
                  })()}
                </div>
              </div>

              {/* Status Visual Legend & Quick selection feedback */}
              <div className="bg-white dark:bg-[#191433]/30 p-3 border border-slate-200/60 dark:border-purple-500/10 rounded-xl text-[10px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500 dark:text-purple-200/70">Selected Date:</span>
                  {(() => {
                    const foundSun = SUNDAYS_2026.find(s => s.value === selectedDate);
                    const label = foundSun ? foundSun.label.replace(", 2026", "") : selectedDate;
                    
                    let conducted = false;
                    if (activeFlow === "student") {
                      conducted = studentRecords.some(r => r.classId === selectedClassId && r.date === selectedDate);
                    } else {
                      conducted = volunteerRecords.some(r => r.locationId === selectedLocationId && r.date === selectedDate);
                    }

                    return (
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        {label} {conducted && (
                          <span className="text-violet-600 dark:text-[#00E5FF] font-bold bg-violet-50 dark:bg-[#130F26] px-1.5 py-0.5 rounded-md border border-violet-100 dark:border-[#00E5FF]/20">
                            Conducted
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 dark:border-purple-500/10 pt-2 text-[9px] text-slate-500 dark:text-purple-200/50 font-medium">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-500 dark:bg-[#00E5FF]" />
                    <span>Conducted</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-[#241B46]" />
                    <span>Off / No Record</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" />
                    <span>Active Selection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Teacher Assignment display (Visible for Student Flow) */}
            {activeFlow === "student" && selectedClassObj && (
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest block font-display">Teacher In-Charge</span>
                {assignedTeachers.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 flex items-center justify-center text-xs font-bold leading-none">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-400">
                        (Unassigned)
                      </h5>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignedTeachers.map(teacher => (
                      <div key={teacher.id} className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold leading-none">
                          <UserIcon className="w-4 h-4" />
                        </span>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                            {teacher.name}
                          </h5>
                          <p className="text-[9px] text-slate-500 font-medium font-mono">Class In-charge</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right panel: list and checkboxes */}
          <div className="lg:col-span-8 space-y-4">
            
            {activeFlow === "student" ? (
              <form onSubmit={handleSubmitStudents} className="space-y-4">
                         {/* Students check list card */}
                <div className="bg-white dark:bg-[#191433]/85 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl p-5 shadow-lg">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-purple-500/10 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">Sunday School Student Roll</h3>
                      <p className="text-xs text-slate-500 dark:text-purple-200/50 italic">Select present students for {selectedClassObj ? selectedClassObj.name : "..."}</p>
                    </div>
                    {classRoster.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleStudentSelectAll(classRoster.map(s => s.id))}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-[#241B46] dark:hover:bg-[#31255F] text-slate-700 dark:text-purple-200 border border-slate-200/60 dark:border-purple-500/30 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckedStudentIds([])}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-[#241B46] dark:hover:bg-[#31255F] text-slate-700 dark:text-purple-200 border border-slate-200/60 dark:border-purple-500/30 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {!selectedClassId ? (
                    <div className="text-center py-12 text-xs font-semibold text-slate-500 italic">
                      Please select a location and class from the settings panel.
                    </div>
                  ) : classRoster.length === 0 ? (
                    <div className="text-center py-12 text-xs font-semibold text-slate-500 italic">
                      No active junior records found linked to this class. Register students on "Registry Setup" tab.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {classRoster.map((stud) => {
                        const isChecked = checkedStudentIds.includes(stud.id);

                        return (
                          <div
                            key={stud.id}
                            onClick={() => handleToggleStudent(stud.id)}
                            className={`flex items-center justify-between p-4 border rounded-xl select-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                              isChecked
                                ? "bg-pink-50/20 border-[#FF007A]/40 dark:bg-[#2E183E]/50 dark:border-[#FF007A] dark:shadow-[0_0_15px_rgba(255,0,122,0.25)]"
                                : "bg-white dark:bg-[#191433]/80 border-slate-200/60 dark:border-purple-500/20 shadow-sm"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className={`text-xs font-bold truncate ${isChecked ? "text-pink-950 dark:text-[#00E5FF]" : "text-slate-700 dark:text-purple-200"}`}>
                                {stud.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500 dark:text-purple-200/50">Class student</span>
                                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded transition ${
                                  isChecked
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                }`}>
                                  {isChecked ? "✅ Present" : "❌ Absent"}
                                </span>
                              </div>
                            </div>

                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                              isChecked 
                                ? "bg-gradient-to-r from-[#FF007A] to-[#BC00DD] text-white shadow-md shadow-[#FF007A]/30 scale-105" 
                                : "bg-slate-50 dark:bg-[#191433]/50 border border-slate-200/60 dark:border-purple-500/20 text-slate-300"
                            }`}>
                              {isChecked ? <Check className="w-5 h-5 stroke-[3]" /> : <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submitting student forms */}
                <div className="flex justify-between items-center bg-slate-100 dark:bg-[#130F26] p-3 rounded-2xl border dark:border-purple-500/10">
                  <div>
                    {error && <span className="text-xs text-red-600 font-bold">{error}</span>}
                    {success && (
                      <span className="text-xs text-teal-500 font-bold flex items-center gap-1.5">
                        <ThumbsUp className="w-4 h-4 animate-bounce" />
                        <span>{success}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {studentRecordExists && (
                      <button
                        type="button"
                        onClick={() => {
                          if (deleteStuConfirm) {
                            handleDeleteStudentAttendance();
                          } else {
                            setDeleteStuConfirm(true);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          deleteStuConfirm
                            ? "bg-red-600 hover:bg-red-500 text-white"
                            : "bg-red-50 dark:bg-red-950/40 hover:bg-red-105 text-red-650 dark:text-[#FF3366] border border-red-200 dark:border-red-900/50"
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{deleteStuConfirm ? "Confirm Delete?" : "Delete Session"}</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!selectedClassId || classRoster.length === 0}
                      className="px-5 py-2.5 bg-[#FF3366] hover:bg-[#FF1A53] text-white text-xs font-bold rounded-xl shadow-[0_0_20px_rgba(255,51,102,0.4)] transition-all duration-300 disabled:opacity-45 disabled:shadow-none disabled:pointer-events-none"
                    >
                      Save Student Attendance
                    </button>
                  </div>
                </div>

              </form>
            ) : (
              <form onSubmit={handleSubmitVolunteers} className="space-y-4">
                
                {/* Volunteer/Directors check list card */}
                <div className="bg-white dark:bg-[#191433]/85 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl p-5 shadow-lg">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-purple-500/10 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]">Teachers, Volunteers & Directors Attendance</h3>
                      <p className="text-xs text-slate-500 dark:text-purple-200/50 italic">Select present leaders, staff, and active personnel on the selected date</p>
                    </div>
                    {activePersonnel.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleVolunteerSelectAll(activePersonnel.map(p => p.id))}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-[#241B46] dark:hover:bg-[#31255F] text-slate-700 dark:text-purple-200 border border-slate-200/60 dark:border-purple-500/30 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckedVolunteerIds([])}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-[#241B46] dark:hover:bg-[#31255F] text-slate-700 dark:text-purple-200 border border-slate-200/60 dark:border-purple-500/30 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {!selectedLocationId ? (
                    <div className="text-center py-12 text-xs font-semibold text-slate-500 italic">
                      Please select a location on the left sidebar context.
                    </div>
                  ) : activePersonnel.length === 0 ? (
                    <div className="text-center py-12 text-xs font-semibold text-slate-500 italic">
                      No registered teachers, volunteers, or directors found linked to this campus. Configure them under "Registry Setup".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activePersonnel.map((person) => {
                        const isChecked = checkedVolunteerIds.includes(person.id);

                        return (
                          <div
                            key={person.id}
                            onClick={() => handleToggleVolunteer(person.id)}
                            className={`flex items-center justify-between p-4 border rounded-xl select-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                              isChecked
                                ? "bg-pink-50/20 border-[#FF007A]/40 dark:bg-[#2E183E]/50 dark:border-[#FF007A] dark:shadow-[0_0_15px_rgba(255,0,122,0.25)]"
                                : "bg-white dark:bg-[#191433]/80 border-slate-200/60 dark:border-purple-500/20 shadow-sm"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className={`text-xs font-bold truncate ${
                                isChecked
                                  ? "text-[#FF007A] dark:text-[#00E5FF]"
                                  : "text-slate-700 dark:text-purple-200"
                              }`}>
                                {person.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                  person.role === "Teacher"
                                    ? "bg-violet-100/70 text-violet-700 dark:bg-purple-950 dark:text-[#00E5FF]"
                                    : person.role === "Director"
                                    ? "bg-pink-100/70 text-pink-700 dark:bg-fuchsia-950 dark:text-[#FF007A]"
                                    : "bg-cyan-100/70 text-cyan-700 dark:bg-cyan-950 dark:text-[#00E5FF]"
                                }`}>
                                  {person.role}
                                </span>
                                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded transition ${
                                  isChecked
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                }`}>
                                  {isChecked ? "✅ Present" : "❌ Absent"}
                                </span>
                              </div>
                            </div>

                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                              isChecked 
                                ? "bg-gradient-to-r from-[#FF007A] to-[#BC00DD] text-white shadow-md shadow-[#FF007A]/30 scale-105"
                                : "bg-slate-50 dark:bg-[#191433]/50 border border-slate-200/60 dark:border-purple-500/20 text-slate-300"
                            }`}>
                              {isChecked ? <Check className="w-5 h-5 stroke-[3]" /> : <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notes box */}
                <div className="bg-white dark:bg-[#191433]/85 p-4 border border-slate-200 dark:border-purple-500/20 rounded-2xl shadow-lg">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1.5">Leader & Personnel Log Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Conducted volunteer pre-meeting. Discussed lessons and logistics."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/30 dark:bg-[#130F26] dark:text-white rounded-lg text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                 {/* Submit button layout */}
                <div className="flex justify-between items-center bg-slate-100 dark:bg-[#130F26] p-3 rounded-2xl border dark:border-purple-500/10 animate-fade-in">
                  <div>
                    {error && <span className="text-xs text-red-600 font-bold">{error}</span>}
                    {success && (
                      <span className="text-xs text-teal-400 font-bold flex items-center gap-1.5">
                        <ThumbsUp className="w-4 h-4 animate-bounce text-purple-400" />
                        <span>{success}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {personnelRecordExists && (
                      <button
                        type="button"
                        onClick={() => {
                          if (deleteVolConfirm) {
                            handleDeletePersonnelAttendance();
                          } else {
                            setDeleteVolConfirm(true);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          deleteVolConfirm
                            ? "bg-red-600 hover:bg-red-500 text-white"
                            : "bg-red-50 dark:bg-red-950/40 hover:bg-red-105 text-red-650 dark:text-[#FF3366] border border-red-200 dark:border-red-900/50"
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{deleteVolConfirm ? "Confirm Delete?" : "Delete Session"}</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!selectedLocationId || activePersonnel.length === 0}
                      className="px-5 py-2.5 bg-[#FF3366] hover:bg-[#FF1A53] text-white text-xs font-bold rounded-xl shadow-[0_0_20px_rgba(255,51,102,0.4)] transition-all duration-300 disabled:opacity-45 disabled:pointer-events-none disabled:shadow-none"
                    >
                      Save Personnel Attendance
                    </button>
                  </div>
                </div>

              </form>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
