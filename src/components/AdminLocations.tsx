import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, MapPin, Phone, RefreshCw, X } from "lucide-react";
import { Location } from "../types";

export default function AdminLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to load locations");
      const data = await res.json();
      setLocations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (loc: Location) => {
    setEditId(loc.id);
    setName(loc.name);
    setAddress(loc.address);
    setPhone(loc.phone || "");
  };

  const clearForm = () => {
    setEditId(null);
    setName("");
    setAddress("");
    setPhone("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !address) {
      setError("Name and physical address are required");
      return;
    }

    try {
      const endpoint = editId ? `/api/locations/${editId}` : "/api/locations";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save operation failed");

      setSuccess(editId ? "Location successfully modified!" : "New location created with success!");
      clearForm();
      fetchLocations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete ${label}?`)) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete location");

      setSuccess("Location removed successfully!");
      fetchLocations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Location creation/editing column */}
      <div className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl h-fit shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            {editId ? "Modify Location Details" : "Register New Location"}
          </h3>
          {editId && (
            <button
              id="clear-edit"
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
              Campus / Parish Name
            </label>
            <input
              id="loc-name-field"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grace Central Chapel"
              className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Physical Street Address
            </label>
            <input
              id="loc-add-field"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 404 Broadway Ave"
              className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Contact Phone (Optional)
            </label>
            <input
              id="loc-phone-field"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. (555) 301-4004"
              className="w-full px-3 py-2 border border-slate-200 dark:border-purple-500/20 dark:bg-[#130F26] dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>

          {error && <p className="text-xs font-medium text-red-650 bg-red-50 p-2.5 rounded-lg">{error}</p>}
          {success && <p className="text-xs font-medium text-pink-600 bg-pink-50 dark:bg-[#130F26] p-2.5 rounded-lg border border-pink-100 dark:border-pink-500/20">{success}</p>}

          <button
            id="loc-save-btn"
            type="submit"
            className="w-full py-2 bg-[#FF3366] hover:bg-[#FF1A53] text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-[#FF3366]/30 transition-all transform active:scale-[0.98]"
          >
            {editId ? "Update Campus Details" : "Create New Church Campus"}
          </button>
        </form>
      </div>

      {/* Locations listing Grid (2/3 width) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center bg-white dark:bg-[#191433]/80 p-4 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl shadow-sm">
          <div>
            <h3 className="text-base font-display font-semibold text-slate-800 dark:text-white">Parishes & Campuses</h3>
            <p className="text-xs text-slate-500 dark:text-purple-200/60">Overview of all active church locations, sanctuaries and chapels</p>
          </div>
          <button
            id="refresh-locs"
            onClick={fetchLocations}
            className="p-1.5 border border-slate-200 dark:border-purple-500/20 rounded-lg hover:bg-slate-50 dark:hover:bg-[#130F26] text-slate-500 dark:text-purple-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-sm text-slate-500">
            Refreshing location lists...
          </div>
        ) : locations.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 text-sm text-slate-500">
            No active church campuses or parishes registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div 
                key={loc.id} 
                id={`loc-card-${loc.id}`}
                className="bg-white dark:bg-[#191433]/80 p-5 border border-slate-200/60 dark:border-purple-500/20 rounded-2xl hover:border-[#FF007A]/55 hover:shadow-[0_0_15px_rgba(255,0,122,0.15)] transition-all shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 bg-violet-50 dark:bg-[#130F26] text-violet-850 dark:text-[#00E5FF] font-semibold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wide border dark:border-purple-500/10">
                    <MapPin className="w-3.5 h-3.5 text-[#FF007A] dark:text-[#00E5FF]" />
                    <span>Active Campus</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-${loc.id}`}
                      onClick={() => handleEdit(loc)}
                      className="p-1 text-slate-500 hover:text-[#FF1A53] hover:bg-slate-100 dark:hover:bg-[#130F26] rounded transition"
                      title="Edit location"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-${loc.id}`}
                      onClick={() => handleDelete(loc.id, loc.name)}
                      className="p-1 text-slate-400 hover:text-red-700 hover:bg-slate-100 dark:hover:bg-[#130F26] rounded transition"
                      title="Delete location"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-display font-bold text-slate-800 dark:text-white text-lg mt-3">{loc.name}</h4>
                <p className="text-xs text-slate-600 dark:text-purple-200/70 mt-1 flex items-start gap-1">
                  <span className="text-slate-400 dark:text-purple-200/40 mt-0.5">Address:</span>
                  <span>{loc.address}</span>
                </p>

                {loc.phone && (
                  <p className="text-xs text-slate-600 dark:text-purple-200/70 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400 dark:text-purple-200/40" />
                    <span>{loc.phone}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
