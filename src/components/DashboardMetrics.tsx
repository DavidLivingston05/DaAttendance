import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, CheckCircle, XCircle, BookOpen, Loader2 } from "lucide-react";

interface StudentAttendanceRecord {
  id: string;
  classId: string;
  date: string;
  checkedInMemberIds: string[];
}

interface Student {
  id: string;
  classIds: string[];
}

interface ClassSession {
  id: string;
  name: string;
}

export default function DashboardMetrics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/bootstrap?_t=${Date.now()}`);
        if (!res.ok) throw new Error("Failed to load metrics");
        const data = await res.json();
        if (!cancelled) {
          setStudents(data.members || []);
          setClasses(data.classes || []);
          setStudentRecords(data.attendance || []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const metrics = useMemo(() => {
    const activeClasses = classes.length;
    const totalPresent = studentRecords.reduce(
      (sum, rec) => sum + (rec.checkedInMemberIds?.length || 0), 0
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
      (sum, rec) => sum + (rec.checkedInMemberIds?.length || 0), 0
    );
    let todayPossible = 0;
    todayRecords.forEach(rec => {
      const studentsInClass = students.filter(s => s.classIds?.includes(rec.classId));
      todayPossible += studentsInClass.length;
    });
    const todayRate = todayPossible > 0 ? Math.round((todayPresent / todayPossible) * 100) : 0;
    const prevRecords = previousDate ? studentRecords.filter(r => r.date === previousDate) : [];
    const prevPresent = prevRecords.reduce(
      (sum, rec) => sum + (rec.checkedInMemberIds?.length || 0), 0
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#191433]/40 border border-slate-200/60 dark:border-purple-500/10 rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#191433]/40 border border-slate-200/60 dark:border-purple-500/10 rounded-2xl p-6 text-center">
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="metric-card metric-accent">
        <div className="flex justify-between items-center">
          <span className="metric-title">Today's Attendance</span>
          <TrendingUp className="w-4 h-4" style={{color: 'var(--accent-primary)'}} />
        </div>
        <div className="metric-value">
          <span className={`${metrics.todayRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : metrics.todayRate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
            {metrics.todayRate}%
          </span>
        </div>
        <div className="mt-2">
          <span className="metric-subtext">
            <span className={`font-semibold ${metrics.rateChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {metrics.rateChange >= 0 ? "+" : ""}{metrics.rateChange}%
            </span>
            from last session
          </span>
        </div>
      </div>

      <div className="metric-card metric-accent-green">
        <div className="flex justify-between items-center">
          <span className="metric-title">Total Present</span>
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="metric-value text-emerald-700 dark:text-emerald-300">
          {metrics.totalPresent}
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 mt-2 w-fit">
          Checked in
        </span>
      </div>

      <div className="metric-card metric-accent-rose">
        <div className="flex justify-between items-center">
          <span className="metric-title">Total Absent</span>
          <XCircle className="w-4 h-4 text-rose-500" />
        </div>
        <div className="metric-value text-rose-700 dark:text-rose-300">
          {metrics.totalAbsent}
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 mt-2 w-fit">
          Missed sessions
        </span>
      </div>

      <div className="metric-card metric-accent-purple">
        <div className="flex justify-between items-center">
          <span className="metric-title">Active Classes</span>
          <BookOpen className="w-4 h-4 text-purple-500" />
        </div>
        <div className="metric-value text-purple-700 dark:text-purple-300">
          {metrics.activeClasses}
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 mt-2 w-fit">
          Ministry groups
        </span>
      </div>
    </div>
  );
}
