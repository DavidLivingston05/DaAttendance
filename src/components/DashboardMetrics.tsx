import React, { useState, useEffect, useMemo } from "react";
import { TrendingUp, Calendar, Users, BookOpen, Loader2 } from "lucide-react";

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
    const dates = [...new Set(studentRecords.map(r => r.date))].sort();
    const totalSessions = dates.length;
    
    const totalPresent = studentRecords.reduce(
      (sum, rec) => sum + (rec.checkedInMemberIds?.length || 0), 0
    );
    const avgCheckins = totalSessions > 0 ? Math.round(totalPresent / totalSessions) : 0;

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
    return { todayRate, totalSessions, avgCheckins, activeClasses, rateChange };
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
          <span className="metric-title">Latest Attendance Rate</span>
          <TrendingUp className="w-4 h-4" style={{color: 'var(--accent-primary)'}} />
        </div>
        <div className="metric-value">
          <span className={`${metrics.todayRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : metrics.todayRate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
            {metrics.todayRate}%
          </span>
        </div>
        <div className="mt-2">
          <span className="metric-subtext">
            {metrics.totalSessions > 0 ? (
              <>
                <span className={`font-semibold ${metrics.rateChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {metrics.rateChange >= 0 ? "+" : ""}{metrics.rateChange}%
                </span>
                {" "}from prev session
              </>
            ) : (
              "No roll call sessions logged yet"
            )}
          </span>
        </div>
      </div>

      <div className="metric-card metric-accent-green">
        <div className="flex justify-between items-center">
          <span className="metric-title">Recorded Sessions</span>
          <Calendar className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="metric-value text-emerald-700 dark:text-emerald-300">
          {metrics.totalSessions}
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 mt-2 w-fit">
          Sunday Logs
        </span>
      </div>

      <div className="metric-card metric-accent-cyan">
        <div className="flex justify-between items-center">
          <span className="metric-title">Average Attendance</span>
          <Users className="w-4 h-4 text-cyan-500" />
        </div>
        <div className="metric-value text-cyan-700 dark:text-cyan-300">
          {metrics.avgCheckins}
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 mt-2 w-fit">
          Per Session Avg
        </span>
      </div>

      <div className="metric-card metric-accent-purple">
        <div className="flex justify-between items-center">
          <span className="metric-title">Configured Groups</span>
          <BookOpen className="w-4 h-4 text-purple-500" />
        </div>
        <div className="metric-value text-purple-700 dark:text-purple-300">
          {metrics.activeClasses}
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 mt-2 w-fit">
          Active Cohorts
        </span>
      </div>
    </div>
  );
}
