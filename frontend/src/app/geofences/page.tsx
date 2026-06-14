"use client";

import React, { useEffect, useState } from "react";
import { api, Geofence, Point } from "@/services/api";
import Map from "@/components/Map";
import { MapPin, Trash2, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [saving, setSaving] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);

  const fetchGeofences = async () => {
    try {
      const data = await api.getGeofences();
      setGeofences(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch geofences");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeofences();
  }, []);

  const handleMapClick = (point: Point) => {
    setDraftPoints((prev) => [...prev, point]);
  };

  const handleUndoPoint = () => {
    setDraftPoints((prev) => prev.slice(0, -1));
  };

  const handleClearDraft = () => {
    setDraftPoints([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Geofence name is required");
      return;
    }
    if (draftPoints.length < 3) {
      toast.error("A polygon must have at least 3 distinct vertices");
      return;
    }

    setSaving(true);
    try {
      // Create geofence - backend handles closed-loop stripping automatically now!
      const created = await api.createGeofence(name.trim(), draftPoints);
      toast.success(`Geofence "${created.name}" created successfully!`);
      
      // Reset form
      setName("");
      setDraftPoints([]);
      fetchGeofences();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create geofence");
    } finally {
      setSaving(false);
    }
  };

  const handleFocusGeofence = (gf: Geofence) => {
    if (gf.polygon.length > 0) {
      // Find bounding box center
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      gf.polygon.forEach((p) => {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lng < minLng) minLng = p.lng;
        if (p.lng > maxLng) maxLng = p.lng;
      });

      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      setMapCenter([centerLat, centerLng]);
      setMapZoom(14);
      toast.success(`Focussed on geofence "${gf.name}"`, { duration: 1500 });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary-500/25 border-t-primary-500 rounded-full animate-spin"></div>
          <span className="text-slate-400 font-medium">Loading Geofence Zones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-enter">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Geofence Management
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Draw boundary lines on the map to define geofences and set restriction barriers.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Side: Create Geofence Form */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur">
            <h2 className="text-lg font-bold text-white mb-4">Create Geofence Zone</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Geofence Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Zone Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Warehouse A Perimeter, Forbidden Zone"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 focus:border-primary-500 focus:outline-none px-4 py-3 text-sm text-slate-100 transition"
                  required
                />
              </div>

              {/* Dynamic Interactive Drawing Map */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Draw Boundaries
                  </label>
                  {draftPoints.length > 0 && (
                    <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full uppercase">
                      {draftPoints.length} vertices placed
                    </span>
                  )}
                </div>
                
                <div className="h-[300px]">
                  <Map
                    geofences={geofences}
                    draftPoints={draftPoints}
                    onMapClick={handleMapClick}
                    center={mapCenter}
                    zoom={mapZoom}
                  />
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-900/40 rounded-lg p-2 border border-slate-800/50 mt-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-primary-500" />
                    <span>Click on the map to define polygon vertices (Min 3)</span>
                  </div>
                  {draftPoints.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUndoPoint}
                        className="flex items-center gap-1 text-amber-500 hover:text-amber-400 transition"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Undo Last
                      </button>
                      <button
                        type="button"
                        onClick={handleClearDraft}
                        className="text-rose-500 hover:text-rose-400 transition"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Coordinates List */}
              {draftPoints.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Vertex Coordinates
                  </span>
                  <div className="max-h-24 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-900/20 p-3 flex flex-wrap gap-2">
                    {draftPoints.map((pt, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-2 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <span className="text-primary-400 font-bold">#{idx + 1}</span>
                        {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || draftPoints.length < 3 || !name.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-sm font-bold text-white py-3.5 shadow-lg shadow-primary-500/25 transition duration-300 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                {saving ? "Saving Zone..." : "Save Geofence Zone"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Geofence List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Registered Geofences ({geofences.length})</h2>
          
          {geofences.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-12 text-center text-slate-500 shadow-xl backdrop-blur">
              <MapPin className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="font-semibold text-sm text-slate-400">No Geofences Created</p>
              <p className="text-xs mt-1">Draw boundaries on the left map helper to configure your first tracking perimeter.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[620px] overflow-y-auto pr-2">
              {geofences.map((gf) => (
                <div
                  key={gf.id}
                  onClick={() => handleFocusGeofence(gf)}
                  className="group relative overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/40 p-4 shadow-lg backdrop-blur hover:border-primary-500/50 hover:bg-slate-900/20 cursor-pointer transition-all duration-300 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-100 group-hover:text-primary-400 transition-colors">
                      {gf.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>ID: <strong className="text-slate-300">#{gf.id}</strong></span>
                      <span>•</span>
                      <span>Vertices: <strong className="text-slate-300">{gf.polygon.length}</strong></span>
                    </div>
                  </div>

                  <button className="rounded-lg bg-slate-900 border border-slate-800 group-hover:border-primary-500/40 text-xs font-semibold px-3 py-1.5 text-primary-400 hover:text-white hover:bg-primary-600 transition duration-300">
                    View on Map
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
