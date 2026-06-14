"use client";

import React, { useEffect, useState } from "react";
import { api, Violation, Geofence, Vehicle } from "@/services/api";
import { History, ShieldAlert, Filter, MapPin, Truck, RefreshCw, XCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterGeofence, setFilterGeofence] = useState<number | "">("");
  const [filterVehicle, setFilterVehicle] = useState<number | "">("");
  const [limit, setLimit] = useState<number>(100);

  const fetchFiltersData = async () => {
    try {
      const [gfs, vehs] = await Promise.all([
        api.getGeofences(),
        api.getVehicles(),
      ]);
      setGeofences(gfs);
      setVehicles(vehs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchViolations = async () => {
    setRefreshing(true);
    try {
      const data = await api.getViolationsHistory(
        filterGeofence === "" ? undefined : filterGeofence,
        filterVehicle === "" ? undefined : filterVehicle,
        limit
      );
      setViolations(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load violations history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchViolations();
  }, [filterGeofence, filterVehicle, limit]);

  const handleClearFilters = () => {
    setFilterGeofence("");
    setFilterVehicle("");
    setLimit(100);
    toast.success("Filters cleared");
  };

  const getGeofenceName = (id: number) => {
    return geofences.find((g) => g.id === id)?.name || `Geofence #${id}`;
  };

  const getVehicleName = (id: number) => {
    return vehicles.find((v) => v.id === id)?.name || `Vehicle #${id}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary-500/25 border-t-primary-500 rounded-full animate-spin"></div>
          <span className="text-slate-400 font-medium">Loading Breach Logs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Breach Violation Log
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Historical audit logs of geofence entry and exit events compiled across all vehicles.
          </p>
        </div>
        
        <button
          onClick={fetchViolations}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-slate-800 hover:text-white px-4 py-2.5 text-xs font-semibold text-slate-300 transition duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Reload Logs
        </button>
      </div>

      {/* Filter Section */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur space-y-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary-500" />
          Filter Audit Parameters
        </span>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Geofence Filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Geofence Scope</span>
            <select
              value={filterGeofence}
              onChange={(e) => setFilterGeofence(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl bg-slate-900 border border-slate-800/80 focus:border-primary-500 focus:outline-none px-4 py-2.5 text-xs text-slate-100 transition"
            >
              <option value="">All Geofence Zones</option>
              {geofences.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Vehicle Scope</span>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl bg-slate-900 border border-slate-800/80 focus:border-primary-500 focus:outline-none px-4 py-2.5 text-xs text-slate-100 transition"
            >
              <option value="">All Vehicle Assets</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Log Limit */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Max Records Displayed</span>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl bg-slate-900 border border-slate-800/80 focus:border-primary-500 focus:outline-none px-4 py-2.5 text-xs text-slate-100 transition"
            />
          </div>

          {/* Reset Filters button */}
          <div>
            {(filterGeofence !== "" || filterVehicle !== "" || limit !== 100) && (
              <button
                onClick={handleClearFilters}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-slate-800 text-rose-400 hover:text-rose-300 py-2.5 text-xs font-semibold transition duration-300"
              >
                <XCircle className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit History Log Table */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 shadow-xl backdrop-blur overflow-hidden">
        {violations.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <ShieldAlert className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="font-semibold text-sm text-slate-400">No Violations Found</p>
            <p className="text-xs mt-1">No boundary breaches detected matching the current configuration settings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-200">
              <thead className="bg-slate-900/40 text-xs text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Vehicle Asset</th>
                  <th className="px-6 py-4">Geofence Zone</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Coordinates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                {violations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4.5 font-mono text-xs text-slate-500">
                      #{v.id}
                    </td>
                    <td className="px-6 py-4.5 text-slate-300 whitespace-nowrap">
                      {new Date(v.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-slate-200">
                      <span className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-slate-500" />
                        {getVehicleName(v.vehicle_id)}
                        <span className="text-[10px] text-slate-500 font-normal font-mono">
                          (#{v.vehicle_id})
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-slate-200">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        {getGeofenceName(v.geofence_id)}
                        <span className="text-[10px] text-slate-500 font-normal font-mono">
                          (#{v.geofence_id})
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4.5 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        v.type === "entry"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}>
                        {v.type}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {v.lat.toFixed(5)}, {v.lng.toFixed(5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
