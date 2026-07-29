import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Users, Search, RefreshCw, X, Calendar, Check, Mail, Phone, Book } from "lucide-react";
import { Member, ClassSession } from "../types";

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [joinedDate, setJoinedDate] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, classesRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/classes")
      ]);

      if (!membersRes.ok || !classesRes.ok) {
        throw new Error("Failed to load members or classes list");
      }

      const [membersData, classesData] = await Promise.all([
        membersRes.json(),
        classesRes.json()
      ]);

      setMembers(membersData);
      setClasses(classesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (mem: Member) => {
    setEditId(mem.id);
    setName(mem.name);
    setEmail(mem.email);
    setPhone(mem.phone || "");
    setStatus(mem.status);
    setJoinedDate(mem.joinedDate);
    setSelectedClassIds(mem.classIds || []);
  };

  const clearForm = () => {
    setEditId(null);
    setName("");
    setEmail("");
    setPhone("");
    setStatus("active");
    setJoinedDate(new Date().toISOString().split('T')[0]);
    setSelectedClassIds([]);
    setError(null);
  };

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId) 
        : [...prev, classId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email) {
      setError("Name and Email parameters are required to enroll a student");
      return;
    }

    const payload = {
      name,
      email,
      phone,
      status,
      joinedDate: joinedDate || new Date().toISOString().split('T')[0],
      classIds: selectedClassIds
    };

    try {
      const endpoint = editId ? `/api/members/${editId}` : "/api/members";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save member request failed");

      setSuccess(editId ? "Student profile information updated!" : "Student enrolled successfully!");
      clearForm();
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete student profile: "${label}"?`)) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove student data");

      setSuccess("Student profile successfully removed!");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveAll = async () => {
    if (!window.confirm("Are you sure you want to remove ALL registered students from the database? This action cannot be undone.")) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/members", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove students");

      setSuccess("All student profiles successfully removed!");
      clearForm();
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Convert classes to quickly search by class list name map
  const classMap = classes.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  // Filters setup
  const filteredMembers = members.filter(mem => {
    const matchesSearch = mem.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          mem.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (mem.phone && mem.phone.includes(searchQuery));
    const matchesClass = filterClassId === "" || (mem.classIds && mem.classIds.includes(filterClassId));
    const matchesStatus = filterStatus === "" || mem.status === filterStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Member input Profile */}
      <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl h-fit shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            {editId ? "Modify Student Profile" : "Enroll New Sunday School Student"}
          </h3>
          {editId && (
            <button
              id="clear-mem-edit"
              onClick={clearForm}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Full Legal Name
            </label>
            <input
              id="mem-name-field"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sandra Bullock"
              className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Parent Email Address
              </label>
              <input
                id="mem-email-field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Parent Phone / Cell
              </label>
              <input
                id="mem-phone-field"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-432-1002"
                className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Enrollment Status
              </label>
              <select
                id="mem-status-field"
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full px-3 py-2 bg-white dark:bg-[#130F26] dark:text-white border border-slate-200 dark:border-purple-500/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              >
                <option value="active">Active (Enrolled)</option>
                <option value="inactive">Inactive (Withdrawn)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Joining Date
              </label>
              <input
                id="mem-date-field"
                type="date"
                value={joinedDate}
                onChange={(e) => setJoinedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Enroll Classes Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Enrolled In Groups / Sunday Classes ({selectedClassIds.length})
            </label>
            {classes.length === 0 ? (
              <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg">No Sunday School classes exist yet. Create some groups first.</p>
            ) : (
              <div className="border border-slate-100 dark:border-purple-500/20 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-slate-50 dark:bg-[#130F26] p-2 space-y-1">
                {classes.map(c => {
                  const checked = selectedClassIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      id={`chk-${c.id}`}
                      type="button"
                      onClick={() => handleToggleClass(c.id)}
                      className={`w-full flex items-center justify-between text-left p-1.5 rounded-lg text-xs transition ${
                        checked 
                          ? "bg-gradient-to-r from-[#FF007A] to-[#BC00DD] text-white font-semibold shadow-md shadow-[#FF007A]/15" 
                          : "bg-white dark:bg-[#191433]/50 border border-slate-200/80 dark:border-purple-500/10 text-slate-700 dark:text-purple-200 hover:bg-slate-100 dark:hover:bg-[#241B46]"
                      }`}
                    >
                      <span className="truncate pr-2">{c.name}</span>
                      {checked && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
            <span className="text-[10px] text-slate-400">Class lists will auto-populate using student details.</span>
          </div>

          {error && <p className="text-xs font-medium text-red-655 bg-red-50 p-2.5 rounded-lg">{error}</p>}
          {success && <p className="text-xs font-medium text-pink-655 bg-pink-50 dark:bg-[#130F26] p-2.5 rounded-lg border border-pink-100 dark:border-pink-500/20">{success}</p>}

          <button
            id="mem-save-btn"
            type="submit"
            className="w-full py-2 bg-[#FF3366] hover:bg-[#FF1A53] text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-[#FF3366]/30 transition-all transform active:scale-[0.98]"
          >
            {editId ? "Update Student Profile" : "Register and Enroll Student"}
          </button>
        </form>
      </div>

      {/* Members Directory Table view */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Filters Panel */}
        <div className="bg-white dark:bg-[#191433]/80 p-4 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl space-y-3 shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-purple-500/10">
            <div>
              <h3 className="text-base font-display font-semibold text-slate-800 dark:text-white">Students Directory</h3>
              <p className="text-xs text-slate-500 dark:text-purple-200/60">Track and manage student registration status and Sundays class cohorts</p>
            </div>
            <div className="flex items-center gap-2">
              {members.length > 0 && (
                <button
                  onClick={handleRemoveAll}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  title="Remove all registered students"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove All Students</span>
                </button>
              )}
              <button
                id="mem-refresh-btn"
                onClick={fetchData}
                className="p-1.5 border border-slate-200 dark:border-purple-500/20 rounded-lg hover:bg-slate-50 dark:hover:bg-[#130F26] text-slate-500 dark:text-purple-200 transition cursor-pointer"
                title="Refresh lists"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search inputs */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                id="mem-search-field"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, email..."
                className="w-full pl-10 pr-3 py-1.5 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            {/* Class membership filter */}
            <select
              id="mem-filter-class"
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#130F26] dark:text-white border border-slate-200 dark:border-purple-500/20 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            >
              <option className="dark:bg-[#130F26]" value="">Filter by Sunday School class</option>
              {classes.map(c => (
                <option className="dark:bg-[#130F26]" key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Status filters */}
            <select
              id="mem-filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#130F26] dark:text-white border border-slate-200 dark:border-purple-500/20 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            >
              <option className="dark:bg-[#130F26]" value="">All Status types</option>
              <option className="dark:bg-[#130F26]" value="active">Active (Enrolled)</option>
              <option className="dark:bg-[#130F26]" value="inactive">Inactive (Withdrawn)</option>
            </select>
          </div>
        </div>

        {/* Members Table */}
        {loading ? (
          <div className="bg-white dark:bg-[#191433]/80 p-12 text-center rounded-2xl border border-slate-200/60 dark:border-purple-500/20 text-sm text-slate-500 dark:text-purple-200/60">
            Refreshing Member details database...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white dark:bg-[#191433]/80 p-12 text-center rounded-2xl border border-slate-200/60 dark:border-purple-500/20 text-sm text-slate-500 dark:text-purple-200/60">
            No registered students match current search criteria.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#191433]/80 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-600 dark:text-purple-200/80">
                <thead className="bg-slate-50 dark:bg-[#130F26] border-b border-slate-200 dark:border-purple-500/25 text-slate-500 dark:text-purple-200/60 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Name / Contact</th>
                    <th className="px-5 py-3.5">Registered Enrollment</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-purple-500/10">
                  {filteredMembers.map((mem) => (
                    <tr key={mem.id} id={`mem-row-${mem.id}`} className="hover:bg-slate-50/70 dark:hover:bg-[#1C1645] transition">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">{mem.name}</div>
                        <div className="flex flex-col gap-0.5 mt-1 text-slate-500 dark:text-purple-200/50 font-mono text-[10px]">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400 dark:text-purple-200/40" /> {mem.email}</span>
                          {mem.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400 dark:text-purple-200/40" /> {mem.phone}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-slate-600 dark:text-purple-200/70">
                          <span className="flex items-center gap-1 text-slate-400 dark:text-purple-200/40 mb-1">
                            <Calendar className="w-3.5 h-3.5" /> Enrolled on: <span className="font-semibold text-slate-700 dark:text-purple-200">{mem.joinedDate}</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {!mem.classIds || mem.classIds.length === 0 ? (
                              <span className="text-[10px] bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/45 font-medium">No assigned Sunday school class</span>
                            ) : (
                              mem.classIds.map(cid => (
                                <span 
                                  key={cid}
                                  className="inline-flex items-center gap-0.5 text-[9px] bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-450 px-1.5 py-0.5 rounded border border-sky-100/50 dark:border-sky-900/30 font-medium"
                                >
                                  <Book className="w-2.5 h-2.5 text-sky-500" />
                                  <span className="max-w-[100px] truncate">{classMap[cid] || "Unknown class"}</span>
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          mem.status === 'active' 
                            ? 'bg-pink-50 text-pink-700 border border-pink-200/50 dark:bg-pink-400/10 dark:text-[#00E5FF] dark:border-[#00E5FF]/20' 
                            : 'bg-red-55 text-red-800 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                        }`}>
                          {mem.status === 'active' ? 'Active' : 'Withdrawn'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`edit-mem-${mem.id}`}
                            onClick={() => handleEdit(mem)}
                            className="p-1 text-slate-500 dark:text-purple-200 hover:text-[#FF1A53] dark:hover:text-[#FF1A53] hover:bg-slate-100 dark:hover:bg-[#130F26] rounded transition"
                            title="Edit member"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-mem-${mem.id}`}
                            onClick={() => handleDelete(mem.id, mem.name)}
                            className="p-1 text-slate-400 hover:text-red-700 hover:bg-slate-100 dark:hover:bg-[#130F26] rounded transition"
                            title="Delete member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
