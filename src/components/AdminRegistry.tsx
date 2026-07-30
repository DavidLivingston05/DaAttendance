import React, { useState, useEffect } from "react";
import { 
  Plus, Trash2, Edit2, X, Building, BookOpen, Users, 
  UserCheck, RefreshCw, MapPin, Smile, Award, RotateCcw 
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  address?: string;
}

interface ClassObj {
  id: string;
  name: string;
  locationId: string;
  assignedTeacherId?: string;
  schedule?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  locationId?: string;
}

interface Volunteer {
  id: string;
  name: string;
  locationId: string;
  role?: "Volunteer" | "Director";
}

interface Student {
  id: string;
  name: string;
  classIds: string[];
}

export default function AdminRegistry() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [classes, setClasses] = useState<ClassObj[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"location" | "class" | "volunteer" | "teacher" | "student">("location");
  
  // Custom alerts state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit State
  const [editId, setEditId] = useState<string | null>(null);

  // Form selections and raw names
  const [locName, setLocName] = useState("");
  
  const [selectedLocId, setSelectedLocId] = useState("");
  const [classNameInput, setClassNameInput] = useState("");
  
  const [selectedLocIdVol, setSelectedLocIdVol] = useState("");
  const [volNameInput, setVolNameInput] = useState("");
  const [volRoleInput, setVolRoleInput] = useState<"Volunteer" | "Director">("Volunteer");
  
  const [selectedLocIdTeach, setSelectedLocIdTeach] = useState("");
  const [selectedClassIdTeach, setSelectedClassIdTeach] = useState("");
  const [teacherNameInput, setTeacherNameInput] = useState("");
  
  const [selectedLocIdStud, setSelectedLocIdStud] = useState("");
  const [selectedClassIdStud, setSelectedClassIdStud] = useState("");
  const [studentNameInput, setStudentNameInput] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bootstrap?_t=${Date.now()}`);
      if (!res.ok) {
        throw new Error("Failed to load registries. Please refresh.");
      }
      
      const data = await res.json();
      setLocations(data.locations);
      setClasses(data.classes);
      setTeachers(data.teachers);
      setVolunteers(data.volunteers);
      setStudents(data.members);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const notifySuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const clearForm = () => {
    setEditId(null);
    setLocName("");
    setSelectedLocId("");
    setClassNameInput("");
    setSelectedLocIdVol("");
    setVolNameInput("");
    setVolRoleInput("Volunteer");
    setSelectedLocIdTeach("");
    setSelectedClassIdTeach("");
    setTeacherNameInput("");
    setSelectedLocIdStud("");
    setSelectedClassIdStud("");
    setStudentNameInput("");
    setError(null);
  };

  const handleEditItem = (type: "location" | "class" | "volunteer" | "teacher" | "student", item: any) => {
    setEditId(item.id);
    setError(null);
    
    if (type === "location") {
      setLocName(item.name);
    } else if (type === "class") {
      setClassNameInput(item.name);
      setSelectedLocId(item.locationId);
    } else if (type === "volunteer") {
      setVolNameInput(item.name);
      setSelectedLocIdVol(item.locationId);
      setVolRoleInput(item.role === "Director" ? "Director" : "Volunteer");
    } else if (type === "teacher") {
      setTeacherNameInput(item.name);
      setSelectedLocIdTeach(item.locationId || "");
      // Look for class where they are assigned
      const assignedClass = classes.find(c => c.assignedTeacherId === item.id);
      setSelectedClassIdTeach(assignedClass ? assignedClass.id : "");
    } else if (type === "student") {
      setStudentNameInput(item.name);
      const studentClassId = item.classIds?.[0] || "";
      setSelectedClassIdStud(studentClassId);
      const studentClass = classes.find(c => c.id === studentClassId);
      setSelectedLocIdStud(studentClass ? studentClass.locationId : "");
    }
  };

  // 1. ADD / EDIT LOCATION
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName.trim()) return;

    try {
      const endpoint = editId ? `/api/locations/${editId}` : "/api/locations";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: locName.trim(), 
          address: "Main Sanctuary Hub" 
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Could not save location");
      }

      notifySuccess(editId ? `Location successfully updated.` : `Location "${locName}" added successfully.`);
      clearForm();
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 2. ADD / EDIT CLASS
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocId || !classNameInput.trim()) {
      setError("Please select a location and input a class name");
      return;
    }

    try {
      const endpoint = editId ? `/api/classes/${editId}` : "/api/classes";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: classNameInput.trim(),
          locationId: selectedLocId,
          assignedTeacherId: editId ? classes.find(c => c.id === editId)?.assignedTeacherId || "usr_admin" : "usr_admin",
          schedule: "Sunday 10:00 AM"
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Could not save Class");
      }

      notifySuccess(editId ? "Class details updated." : `Class "${classNameInput}" added.`);
      clearForm();
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 3. ADD / EDIT VOLUNTEER/DIRECTOR
  const handleAddVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocIdVol || !volNameInput.trim()) {
      setError("Please select a location and input volunteer name");
      return;
    }

    try {
      const endpoint = editId ? `/api/volunteers/${editId}` : "/api/volunteers";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: volNameInput.trim(),
          locationId: selectedLocIdVol,
          role: volRoleInput
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Could not save volunteer");
      }

      notifySuccess(editId ? `Volunteer properties updated.` : `Volunteer "${volNameInput}" added.`);
      clearForm();
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 4. ADD / EDIT TEACHER
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocIdTeach || !selectedClassIdTeach || !teacherNameInput.trim()) {
      setError("Please select Location, Class, and provide a Teacher Name");
      return;
    }

    try {
      if (editId) {
        // A. Update teacher info on backend
        const editRes = await fetch(`/api/teachers/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: teacherNameInput.trim(),
            locationId: selectedLocIdTeach
          })
        });

        if (!editRes.ok) {
          const d = await editRes.json();
          throw new Error(d.error || "Could not update Teacher profile");
        }

        // B. Reassign classes: clear teacher from any classes they were assigned to
        await Promise.all(
          classes
            .filter(c => c.assignedTeacherId && c.assignedTeacherId.split(",").map(id => id.trim()).includes(editId))
            .map(c => {
              const cleanedList = c.assignedTeacherId!.split(",").map(id => id.trim()).filter(id => id !== editId).join(",");
              return fetch(`/api/classes/${c.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...c, assignedTeacherId: cleanedList || "usr_admin" })
              });
            })
        );

        // C. Assign this teacher to the newly selected class
        const targetClass = classes.find(c => c.id === selectedClassIdTeach);
        if (targetClass) {
          const currentList = targetClass.assignedTeacherId ? targetClass.assignedTeacherId.split(",").map(id => id.trim()).filter(Boolean) : [];
          if (!currentList.includes(editId)) {
            currentList.push(editId);
          }
          const updatedId = currentList.join(",");
          await fetch(`/api/classes/${selectedClassIdTeach}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...targetClass, assignedTeacherId: updatedId })
          });
        }

        notifySuccess(`Teacher "${teacherNameInput}" properties modified successfully.`);
      } else {
        // Step A: Create new Teacher account
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: teacherNameInput.trim(),
            email: `teacher.${Date.now()}@grace.org`,
            role: "teacher",
            password: "password",
            locationId: selectedLocIdTeach
          })
        });

        if (!regRes.ok) {
          const d = await regRes.json();
          throw new Error(d.error || "Could not save Teacher");
        }

        const registeredUser = await regRes.json();
        const teacherId = registeredUser.user.id;

        // Step B: Update select class to assign teacher
        const classObj = classes.find(c => c.id === selectedClassIdTeach);
        if (classObj) {
          const currentList = classObj.assignedTeacherId ? classObj.assignedTeacherId.split(",").map(id => id.trim()).filter(Boolean) : [];
          if (!currentList.includes(teacherId)) {
            currentList.push(teacherId);
          }
          const updatedId = currentList.join(",");
          const updateRes = await fetch(`/api/classes/${selectedClassIdTeach}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...classObj,
              assignedTeacherId: updatedId
            })
          });
          if (!updateRes.ok) {
            throw new Error("Teacher registered, but could not link to the class list.");
          }
        }

        notifySuccess(`Teacher "${teacherNameInput}" registered and assigned.`);
      }

      clearForm();
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 5. ADD / EDIT STUDENT
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocIdStud || !selectedClassIdStud || !studentNameInput.trim()) {
      setError("Please select Location, Class, and provide student's name");
      return;
    }

    try {
      if (editId) {
        // Edit existing student details
        const endpoint = `/api/members/${editId}`;
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: studentNameInput.trim(),
            status: "active",
            classIds: [selectedClassIdStud]
          })
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Could not save student");
        }

        notifySuccess(`Student details modified successfully.`);
      } else {
        // Add single or bulk student profiles
        const rawInput = studentNameInput.trim();
        const names = rawInput
          .split(/[\n,]+/)
          .map(n => n.trim())
          .filter(n => n.length > 0);

        if (names.length === 0) {
          setError("Please provide at least one valid student name.");
          return;
        }

        // Parallel insertion of each user
        const results = await Promise.all(
          names.map(async (name) => {
            const res = await fetch("/api/members", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                email: `student.${Date.now()}.${Math.floor(Math.random() * 10000)}@graceroll.org`,
                status: "active",
                classIds: [selectedClassIdStud]
              })
            });
            return { name, ok: res.ok };
          })
        );

        const failed = results.filter(r => !r.ok);
        if (failed.length > 0) {
          throw new Error(`Failed to create profiles for: ${failed.map(f => f.name).join(", ")}`);
        }

        notifySuccess(
          names.length === 1 
            ? `Student "${names[0]}" added successfully.` 
            : `Success! Created individual profiles for ${names.length} students.`
        );
      }

      clearForm();
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // DELETION ROOT ACTIONS
  const handleDeleteItem = async (type: "location" | "class" | "volunteer" | "teacher" | "student", id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    setError(null);
    try {
      let endpoint = "";
      if (type === "location") endpoint = `/api/locations/${id}`;
      else if (type === "class") endpoint = `/api/classes/${id}`;
      else if (type === "volunteer") endpoint = `/api/volunteers/${id}`;
      else if (type === "student") endpoint = `/api/members/${id}`;
      else if (type === "teacher") endpoint = `/api/teachers/${id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Could not remove this ${type}`);
      }

      notifySuccess(`Successfully deleted ${name}`);
      if (editId === id) {
        clearForm();
      }
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveAllStudents = async () => {
    if (!window.confirm("Are you sure you want to remove ALL registered students from the database? This action cannot be undone.")) return;
    setError(null);
    try {
      const res = await fetch("/api/members", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not remove all students");
      }
      notifySuccess("Successfully removed all student names");
      clearForm();
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveAllTeachers = async () => {
    if (!window.confirm("Are you sure you want to remove ALL teachers from the database? This action cannot be undone.")) return;
    setError(null);
    try {
      const res = await fetch("/api/teachers", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not remove all teachers");
      }
      notifySuccess("Successfully removed all teachers");
      clearForm();
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("CRITICAL WARNING: Are you sure you want to reset the ENTIRE database? All locations, classes, students, teachers, volunteers, and attendance records will be permanently deleted. Only your Admin account will remain.")) return;
    setError(null);
    try {
      const res = await fetch("/api/admin/reset-database", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Database reset failed");
      }
      notifySuccess("Database completely reset to fresh start!");
      clearForm();
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Visual Subtabs & Reset Database Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 dark:bg-[#191433]/90 border dark:border-purple-500/20 backdrop-blur-md rounded-2xl max-w-fit shadow-inner">
          <button
            onClick={() => { setActiveSubTab("location"); clearForm(); }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              activeSubTab === "location"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white text-slate-700 dark:text-purple-200/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            1. Location Setup
          </button>
          <button
            onClick={() => { setActiveSubTab("class"); clearForm(); }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              activeSubTab === "class"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white text-slate-700 dark:text-purple-200/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            2. Classes / Groups
          </button>
          <button
            onClick={() => { setActiveSubTab("volunteer"); clearForm(); }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              activeSubTab === "volunteer"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white text-slate-700 dark:text-purple-200/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            3. Volunteers & Directors
          </button>
          <button
            onClick={() => { setActiveSubTab("teacher"); clearForm(); }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              activeSubTab === "teacher"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white text-slate-700 dark:text-purple-200/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            4. Teachers
          </button>
          <button
            onClick={() => { setActiveSubTab("student"); clearForm(); }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              activeSubTab === "student"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-white text-slate-700 dark:text-purple-200/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            5. Students
          </button>
        </div>

        <button
          onClick={handleResetDatabase}
          className="px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          title="Reset entire database from scratch"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Database</span>
        </button>
      </div>

      {/* Global alert feedback */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-4 py-3 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-semibold animate-shake">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{success}</span>
        </div>
      )}

      {/* Primary Setup Panel Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Form Addition or Update */}
        <div className="lg:col-span-4 bg-white dark:bg-[#191433]/80 p-5 border border-slate-200 dark:border-purple-500/20 rounded-2xl h-fit shadow-xl">
          
          {activeSubTab === "location" && (
            <form onSubmit={handleAddLocation} className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {editId ? "Modify Location" : "Add Location"}
                </h3>
                {editId && (
                  <button 
                    type="button" 
                    onClick={clearForm}
                    className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded font-bold"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel Edit</span>
                  </button>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Location Name</label>
                <input
                  id="simple-loc-name"
                  type="text"
                  required
                  placeholder="e.g. Grace Central"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                />
              </div>

              <button
                id="simple-loc-submit"
                type="submit"
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/30 transition-all duration-350 transform active:scale-[0.98]"
              >
                {editId ? "Update Location Properties" : "Add the Location"}
              </button>
            </form>
          )}

          {activeSubTab === "class" && (
            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {editId ? "Modify Class / Group" : "Add Class"}
                </h3>
                {editId && (
                  <button 
                    type="button" 
                    onClick={clearForm}
                    className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded font-bold"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel Edit</span>
                  </button>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Select Location</label>
                <select
                  required
                  value={selectedLocId}
                  onChange={(e) => setSelectedLocId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                >
                  <option value="">-- Choose Church Location --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunday School Kids"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/30 transition-all duration-350 transform active:scale-[0.98]"
              >
                {editId ? "Update Class Details" : "Add the Class"}
              </button>
            </form>
          )}

          {activeSubTab === "volunteer" && (
            <form onSubmit={handleAddVolunteer} className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {editId ? "Modify Volunteer/Director" : "Add Volunteer / Director"}
                </h3>
                {editId && (
                  <button 
                    type="button" 
                    onClick={clearForm}
                    className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded font-bold"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel Edit</span>
                  </button>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Select Location</label>
                <select
                  required
                  value={selectedLocIdVol}
                  onChange={(e) => setSelectedLocIdVol(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                >
                  <option value="">-- Choose Church Location --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Volunteer or Director Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mark Stevenson"
                  value={volNameInput}
                  onChange={(e) => setVolNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Select Role Category</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVolRoleInput("Volunteer")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all duration-200 ${
                      volRoleInput === "Volunteer"
                        ? "bg-cyan-500/10 text-cyan-600 dark:text-[#00E5FF] border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.15)] font-black"
                        : "bg-slate-50 dark:bg-[#130F26] border-slate-200 dark:border-purple-500/10 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Volunteer
                  </button>
                  <button
                    type="button"
                    onClick={() => setVolRoleInput("Director")}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all duration-200 ${
                      volRoleInput === "Director"
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.15)] font-black"
                        : "bg-slate-50 dark:bg-[#130F26] border-slate-200 dark:border-purple-500/10 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Director
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/30 transition-all duration-350 transform active:scale-[0.98]"
              >
                {editId ? "Update Personnel Profile" : "Register Personnel"}
              </button>
            </form>
          )}

          {activeSubTab === "teacher" && (
            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {editId ? "Modify Class Teacher" : "Add Class Teacher"}
                </h3>
                {editId && (
                  <button 
                    type="button" 
                    onClick={clearForm}
                    className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded font-bold"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel Edit</span>
                  </button>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Select Location/Campus</label>
                <select
                  required
                  value={selectedLocIdTeach}
                  onChange={(e) => {
                    setSelectedLocIdTeach(e.target.value);
                    setSelectedClassIdTeach("");
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                >
                  <option value="">-- Choose Church Location --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Select Class To Lead</label>
                <select
                  required
                  value={selectedClassIdTeach}
                  onChange={(e) => setSelectedClassIdTeach(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                >
                  <option value="">-- Choose Sunday Class --</option>
                  {classes
                    .filter(c => c.locationId === selectedLocIdTeach)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Teacher Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brother Thomas"
                  value={teacherNameInput}
                  onChange={(e) => setTeacherNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/30 transition-all duration-350 transform active:scale-[0.98]"
              >
                {editId ? "Update Teacher Details" : "Add Teacher"}
              </button>
            </form>
          )}

          {activeSubTab === "student" && (
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {editId ? "Modify Student Details" : "Add Student"}
                </h3>
                {editId && (
                  <button 
                    type="button" 
                    onClick={clearForm}
                    className="flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded font-bold"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel Edit</span>
                  </button>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Select Location</label>
                <select
                  required
                  value={selectedLocIdStud}
                  onChange={(e) => {
                    setSelectedLocIdStud(e.target.value);
                    setSelectedClassIdStud("");
                  }}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                >
                  <option value="">-- Choose Church Location --</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">Select Class / Sunday school</label>
                <select
                  required
                  value={selectedClassIdStud}
                  onChange={(e) => setSelectedClassIdStud(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                >
                  <option value="">-- Choose Sunday Class --</option>
                  {classes
                    .filter(c => c.locationId === selectedLocIdStud)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-purple-200/70 mb-1">
                  {editId ? "Student Name" : "Student Name(s) (Bulk Add Welcome)"}
                </label>
                {editId ? (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel Green"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
                  />
                ) : (
                  <textarea
                    required
                    rows={4}
                    placeholder="Paste or enter names (e.g. Angel, Mithran, Melvin Sam, Dharshan (UKG), Ruma)"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner placeholder:text-slate-400 dark:placeholder:text-purple-300/35"
                  />
                )}
                {!editId && (
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Tip: Enter names separated by commas or line breaks. We will split them and build distinct student profiles for each automatically.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-indigo-500/30 transition-all duration-350 transform active:scale-[0.98]"
              >
                {editId ? "Update Student Profile" : "Add Student(s)"}
              </button>
            </form>
          )}

        </div>

        {/* Right Side: Simple Lists overview */}
        <div className="lg:col-span-8 bg-white dark:bg-[#191433]/85 border border-slate-200 dark:border-purple-500/20 rounded-2xl p-5 shadow-xl">
          
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-purple-500/10 mb-4 bg-slate-100 dark:bg-[#130F26] px-3 py-2 rounded-xl border dark:border-purple-500/10">
            <div>
              <h4 className="text-xs uppercase font-bold text-[#020617] dark:text-slate-200 tracking-wider">
                {activeSubTab === "location" && `Locations List (${locations.length})`}
                {activeSubTab === "class" && `Classes / Groups List (${classes.length})`}
                {activeSubTab === "volunteer" && `Volunteers & Directors Directory (${volunteers.length})`}
                {activeSubTab === "teacher" && `Teachers Assigned (${teachers.length})`}
                {activeSubTab === "student" && `Registered Students List (${students.length})`}
              </h4>
            </div>
            {activeSubTab === "student" && students.length > 0 && (
              <button
                onClick={handleRemoveAllStudents}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Remove all registered students"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove All Students</span>
              </button>
            )}
            {activeSubTab === "teacher" && teachers.length > 0 && (
              <button
                onClick={handleRemoveAllTeachers}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Remove all assigned teachers"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove All Teachers</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[420px]">
            {loading ? (
              <div className="text-center py-12 text-xs font-semibold text-slate-400">Loading directory registries...</div>
            ) : (
              <>
                 {activeSubTab === "location" && (
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 admin-table">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[9px] uppercase font-bold">
                      <tr>
                        <th className="px-3 py-2.5">Campus Name</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc) => (
                        <tr key={loc.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/25 ${editId === loc.id ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                          <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{loc.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right"><div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditItem("location", loc)}
                              className="p-1 text-slate-400 hover:text-amber-500 rounded transition"
                              title="Edit Location"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem("location", loc.id, loc.name)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                              title="Delete Location"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div></td>
                        </tr>
                      ))}
                      {locations.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-xs text-slate-400 italic">No locations configured yet. Use the form to build your first campus!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeSubTab === "class" && (
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 admin-table">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[9px] uppercase font-bold">
                      <tr>
                        <th className="px-3 py-2.5">Class / Group Title</th>
                        <th className="px-3 py-2.5">Location Campus</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((c) => {
                        const loc = locations.find(l => l.id === c.locationId);
                        return (
                          <tr key={c.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/25 ${editId === c.id ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                            <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-white">
                              <div className="flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{c.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-500">{loc ? loc.name : "Unlinked"}</td>
                            <td className="px-3 py-2.5 text-right"><div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditItem("class", c)}
                                className="p-1 text-slate-400 hover:text-amber-500 rounded transition"
                                title="Edit Class"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem("class", c.id, c.name)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                title="Delete Class"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div></td>
                          </tr>
                        );
                      })}
                      {classes.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-xs text-slate-400 italic">No classes configured yet. Fill out the form as desired.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeSubTab === "volunteer" && (
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 admin-table">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[9px] uppercase font-bold">
                      <tr>
                        <th className="px-3 py-2.5">Volunteer / Director Name</th>
                        <th className="px-3 py-2.5">Assigned Campus</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volunteers.map((v) => {
                        const loc = locations.find(l => l.id === v.locationId);
                        const roleChosen = v.role || (/director|charge|coordinator|leader|pastor/i.test(v.name) ? "Director" : "Volunteer");
                        return (
                          <tr key={v.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/25 ${editId === v.id ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                            <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-white">
                              <div className="flex items-center gap-2">
                                <UserCheck className={`w-3.5 h-3.5 shrink-0 ${roleChosen === "Director" ? "text-indigo-500" : "text-cyan-500"}`} />
                                <span className="font-bold">{v.name}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                  roleChosen === "Director"
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                    : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                                }`}>
                                  {roleChosen}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-500">{loc ? loc.name : "Unlinked"}</td>
                            <td className="px-3 py-2.5 text-right"><div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditItem("volunteer", v)}
                                className="p-1 text-slate-400 hover:text-amber-500 rounded transition"
                                title="Edit Volunteer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem("volunteer", v.id, v.name)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                title="Delete Volunteer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div></td>
                          </tr>
                        );
                      })}
                      {volunteers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-xs text-slate-400 italic">No volunteers registered yet. Add volunteers to track director presence.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeSubTab === "teacher" && (
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 admin-table">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[9px] uppercase font-bold">
                      <tr>
                        <th className="px-3 py-2.5">Teacher Name</th>
                        <th className="px-3 py-2.5">Active Class Assigned</th>
                        <th className="px-3 py-2.5">Campus</th>
                        <th className="px-3 py-2.5 text-right animate-pulse">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...teachers].sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
                        const assignedClasses = classes.filter(c => c.assignedTeacherId && c.assignedTeacherId.split(",").map(id => id.trim()).includes(t.id));
                        const classNames = assignedClasses.map(c => c.name).join(", ") || "No active class";
                        const loc = locations.find(l => l.id === t.locationId);
                        return (
                          <tr key={t.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/25 ${editId === t.id ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                            <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-white">
                              <div className="flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <span>{t.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{classNames}</td>
                            <td className="px-3 py-2.5 text-slate-500 font-semibold">{loc ? loc.name : "Global Campus"}</td>
                            <td className="px-3 py-2.5 text-right"><div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditItem("teacher", t)}
                                className="p-1 text-slate-400 hover:text-amber-500 rounded transition"
                                title="Edit Teacher"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem("teacher", t.id, t.name)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                title="Delete/Unassign Teacher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div></td>
                          </tr>
                        );
                      })}
                      {teachers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-xs text-slate-400 italic">No teachers setup in DB yet. Add class teachers to log session lists!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {activeSubTab === "student" && (
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 admin-table">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 text-[9px] uppercase font-bold">
                      <tr>
                        <th className="px-3 py-2.5">Student Name</th>
                        <th className="px-3 py-2.5">Sunday Group Enrolled</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...students].sort((a, b) => a.name.localeCompare(b.name)).map((s) => {
                        const classObj = classes.find(c => s.classIds && s.classIds.includes(c.id));
                        return (
                          <tr key={s.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/25 ${editId === s.id ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                            <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-white">
                              <div className="flex items-center gap-1.5">
                                <Smile className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>{s.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-500">{classObj ? classObj.name : "Independent / Unlinked"}</td>
                            <td className="px-3 py-2.5 text-right"><div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEditItem("student", s)}
                                className="p-1 text-slate-400 hover:text-amber-500 rounded transition"
                                title="Edit Student Name/Class"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem("student", s.id, s.name)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                title="Delete Student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div></td>
                          </tr>
                        );
                      })}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-xs text-slate-400 italic">No students registered yet. Populate your student lists dynamically using the form!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

              </>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
