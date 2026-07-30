import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, BookOpen, Calendar, User, Search, RefreshCw, X } from "lucide-react";
import { ClassSession, Location, User as TeacherType } from "../types";

export default function AdminClasses() {
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [teachers, setTeachers] = useState<TeacherType[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [assignedTeacherId, setAssignedTeacherId] = useState("");
  const [schedule, setSchedule] = useState("");
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [classesRes, locRes, teachRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/locations"),
        fetch("/api/teachers")
      ]);

      if (!classesRes.ok || !locRes.ok || !teachRes.ok) {
        throw new Error("Failed to load classes or foundational data");
      }

      const [classesData, locData, teachData] = await Promise.all([
        classesRes.json(),
        locRes.json(),
        teachRes.json()
      ]);

      setClasses(classesData);
      setLocations(locData);
      setTeachers(teachData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cls: ClassSession) => {
    setEditId(cls.id);
    setName(cls.name);
    setLocationId(cls.locationId);
    setAssignedTeacherId(cls.assignedTeacherId);
    setSchedule(cls.schedule);
  };

  const clearForm = () => {
    setEditId(null);
    setName("");
    setLocationId("");
    setAssignedTeacherId("");
    setSchedule("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !locationId || !assignedTeacherId || !schedule) {
      setError("All fields are required to register a session class");
      return;
    }

    try {
      const endpoint = editId ? `/api/classes/${editId}` : "/api/classes";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, locationId, assignedTeacherId, schedule }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save operation failed");

      setSuccess(editId ? "Class session updated!" : "Class session created successfully!");
      clearForm();
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete "${label}"? This will clean up any membership linkages.`)) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete class session");

      setSuccess("Class session successfully removed!");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Compute location name & teacher name map for quick tables render
  const locationMap = locations.reduce<Record<string, string>>((acc, loc) => {
    acc[loc.id] = loc.name;
    return acc;
  }, {});

  const teacherMap = teachers.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {});

  // Filters calculation
  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cls.schedule.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLoc = filterLocation === "" || cls.locationId === filterLocation;
    const matchesTeacher = filterTeacher === "" || 
                           (cls.assignedTeacherId && cls.assignedTeacherId.split(",").map(id => id.trim()).includes(filterTeacher));
    return matchesSearch && matchesLoc && matchesTeacher;
  });

  const selectedTeacherIds = assignedTeacherId 
    ? assignedTeacherId.split(",").map(id => id.trim()).filter(Boolean)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* class form Column */}
      <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl h-fit shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            {editId ? "Modify Class / Group" : "Create New Study Group / Class"}
          </h3>
          {editId && (
            <button
              id="clear-class-edit"
              onClick={clearForm}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {locations.length === 0 ? (
          <div className="text-xs bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800">
            <p className="font-semibold mb-1">Founder Warning:</p>
            Please create at least one Church Campus under Campuses before registering a Sunday School class or Youth study group.
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-xs bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800">
            <p className="font-semibold mb-1">Founder Warning:</p>
            No active Sunday School Teachers are registered yet. Please register a teacher profile at the login screen first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Group / Class Name
              </label>
              <input
                id="cls-name-field"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunday School Kids (Ages 6-8)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Assigned Campus / Parish
              </label>
              <select
                id="cls-loc-field"
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#130F26] dark:text-white border border-slate-200 dark:border-purple-500/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              >
                <option className="dark:bg-[#130F26]" value="">-- Choose Campus --</option>
                {locations.map(l => (
                  <option className="dark:bg-[#130F26]" key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Assigned Sunday School Teacher(s)
              </label>
              
              <div id="cls-teachers-checklist" className="max-h-48 overflow-y-auto border border-slate-200 dark:border-purple-500/20 rounded-lg p-2.5 bg-slate-50 dark:bg-[#130F26] space-y-2.5">
                {teachers.length === 0 ? (
                  <p className="text-xs text-slate-400">No teachers found</p>
                ) : (
                  [...teachers].sort((a, b) => a.name.localeCompare(b.name)).map(t => {
                    const isChecked = selectedTeacherIds.includes(t.id);
                    return (
                      <label 
                        key={t.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition border text-xs select-none ${
                          isChecked 
                            ? "bg-pink-500/10 border-pink-500/30 text-slate-800 dark:text-white" 
                            : "bg-white dark:bg-[#0B0813] border-slate-100 dark:border-purple-500/5 text-slate-600 dark:text-purple-200 hover:bg-slate-100"
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let updated: string[];
                            if (isChecked) {
                              updated = selectedTeacherIds.filter(id => id !== t.id);
                            } else {
                              updated = [...selectedTeacherIds, t.id];
                            }
                            setAssignedTeacherId(updated.join(","));
                          }}
                          className="mt-0.5 w-3.5 h-3.5 accent-[#FF3366] rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{t.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-purple-300/60 truncate">{t.email}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                You can toggle and assign multiple teachers to work together (currently chosen: {selectedTeacherIds.length}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Schedule Summary
              </label>
              <input
                id="cls-schedule-field"
                type="text"
                required
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="e.g. Sunday 09:30 AM"
                className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Will be visible during attendance roll</p>
            </div>

            {error && <p className="text-xs font-medium text-red-650 bg-red-50 p-2.5 rounded-lg">{error}</p>}
            {success && <p className="text-xs font-medium text-pink-600 bg-pink-50 dark:bg-[#130F26] p-2.5 rounded-lg border border-pink-100 dark:border-pink-500/20">{success}</p>}

            <button
              id="cls-save-btn"
              type="submit"
              className="w-full py-2 bg-[#FF3366] hover:bg-[#FF1A53] text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-[#FF3366]/30 transition-all transform active:scale-[0.98]"
            >
              {editId ? "Update Group Properties" : "Register Ministry Class"}
            </button>
          </form>
        )}
      </div>

      {/* Classes list Grid */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Filters Panel */}
        <div className="bg-white dark:bg-[#191433]/80 p-4 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl space-y-3 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-purple-500/10">
            <div>
              <h3 className="text-base font-display font-semibold text-slate-800 dark:text-white">Ministry Group Manager</h3>
              <p className="text-xs text-slate-500 dark:text-purple-200/60">Add classes, link Campuses, and coordinate Sunday school teachers</p>
            </div>
            <button
              id="cls-refresh-btn"
              onClick={fetchData}
              className="p-1.5 border border-slate-200 dark:border-purple-500/20 rounded-lg hover:bg-slate-50 dark:hover:bg-[#130F26] text-slate-500 dark:text-purple-200 transition"
              title="Refresh lists"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="cls-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search class or day..."
                className="w-full pl-10 pr-3 py-1.5 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            {/* Location filter */}
            <select
              id="cls-filter-loc"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#130F26] dark:text-white border border-slate-200 dark:border-purple-500/20 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            >
              <option className="dark:bg-[#130F26]" value="">All Church Campuses</option>
              {locations.map(l => (
                <option className="dark:bg-[#130F26]" key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            {/* Teacher filter */}
            <select
              id="cls-filter-teach"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#130F26] dark:text-white border border-slate-200 dark:border-purple-500/20 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            >
              <option className="dark:bg-[#130F26]" value="">All Teachers</option>
              {[...teachers].sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                <option className="dark:bg-[#130F26]" key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Classes grid display */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-sm text-slate-500">
            Refreshing Class sessions list...
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-sm text-slate-500">
            No session classes found matching search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClasses.map((cls) => (
              <div 
                key={cls.id} 
                id={`class-card-${cls.id}`}
                className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl hover:border-[#FF007A]/55 hover:shadow-[0_0_15px_rgba(255,0,122,0.15)] transition-all shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-[#130F26] text-violet-850 dark:text-[#00E5FF] font-semibold text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wide border dark:border-purple-500/10">
                    <BookOpen className="w-3 h-3 text-[#FF007A] dark:text-[#00E5FF]" />
                    <span>{locationMap[cls.locationId] || "Unknown Location"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-cls-${cls.id}`}
                      onClick={() => handleEdit(cls)}
                      className="p-1 text-slate-500 hover:text-[#FF1A53] hover:bg-slate-100 dark:hover:bg-[#130F26] rounded transition"
                      title="Edit class"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-cls-${cls.id}`}
                      onClick={() => handleDelete(cls.id, cls.name)}
                      className="p-1 text-slate-400 hover:text-red-700 hover:bg-slate-100 dark:hover:bg-[#130F26] rounded transition"
                      title="Delete class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-display font-bold text-slate-800 text-base mt-2">{cls.name}</h4>
                
                <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-2.5">
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{cls.schedule}</span>
                  </p>
                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="leading-tight">
                      Teachers: <strong className="text-slate-700 font-bold">
                        {cls.assignedTeacherId
                          ? cls.assignedTeacherId.split(",").map(id => teacherMap[id.trim()] || "Unknown Teacher").join(", ")
                          : "Unassigned"}
                      </strong>
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
