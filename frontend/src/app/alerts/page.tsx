"use client";

import React, { useEffect, useState } from "react";
import { api, AlertConfig, Geofence, Vehicle } from "@/services/api";
import { Bell, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function AlertsPage() {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedGeofence, setSelectedGeofence] = useState<number | "">("");
  const [selectedVehicle, setSelectedVehicle] = useState<number | "all">("all");
  const [alertType, setAlertType] = useState<"entry" | "exit" | "both">("both");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [alertConfigs, gfs, vehs] = await Promise.all([
        api.getAlertConfigs(),
        api.getGeofences(),
        api.getVehicles(),
      ]);
      setConfigs(alertConfigs);
      setGeofences(gfs);
      setVehicles(vehs);
      if (gfs.length > 0 && selectedGeofence === "") {
        setSelectedGeofence(gfs[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load configuration lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGeofence === "") {
      toast.error("Geofence selection is required");
      return;
    }

    setSaving(true);
    try {
      const vehicleId = selectedVehicle === "all" ? null : Number(selectedVehicle);
      await api.configureAlert(Number(selectedGeofence), vehicleId, alertType, enabled);
      toast.success("Alert rule configured successfully!");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to configure alert rule");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (config: AlertConfig) => {
    try {
      const vehicleId = config.vehicle_id || null;
      await api.configureAlert(config.geofence_id, vehicleId, config.alert_type, !config.enabled);
      toast.success(`Rule ${!config.enabled ? "enabled" : "disabled"} successfully!`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to toggle alert rule");
    }
  };

  const getGeofenceName = (id: number) => {
    return geofences.find((g) => g.id === id)?.name || `Geofence #${id}`;
  };

  const getVehicleName = (id?: number) => {
    if (!id) return "All Vehicles";
    return vehicles.find((v) => v.id === id)?.name || `Vehicle #${id}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary-500/25 border-t-primary-500 rounded-full animate-spin"></div>
          <span className="text-slate-400 font-medium">Loading Rules configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-enter">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Alert Rules Configuration
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Establish boundary entry and exit warning parameters for specific vehicles or the entire fleet.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left column: Form */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur h-fit">
          <h2 className="text-lg font-bold text-white mb-6">Configure Alert Rule</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Select Geofence */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Geofence Zone
              </label>
              <select
                value={selectedGeofence}
                onChange={(e) => setSelectedGeofence(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 focus:border-primary-500 focus:outline-none px-4 py-3 text-sm text-slate-100 transition"
                required
              >
                <option value="" disabled>Select geofence...</option>
                {geofences.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (ID: #{g.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Vehicle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Vehicle Scope
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="w-full rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 focus:border-primary-500 focus:outline-none px-4 py-3 text-sm text-slate-100 transition"
                required
              >
                <option value="all">Apply to All Vehicles (Global)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    Only {v.name} (ID: #{v.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Alert Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Trigger Boundary Action
              </label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as any)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 focus:border-primary-500 focus:outline-none px-4 py-3 text-sm text-slate-100 transition"
                required
              >
                <option value="entry">On Zone Entry Only</option>
                <option value="exit">On Zone Exit Only</option>
                <option value="both">On Both Entry & Exit</option>
              </select>
            </div>

            {/* Enabled Switch */}
            <div className="flex items-center justify-between rounded-xl bg-slate-900/40 border border-slate-800/60 p-4">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Rule Enabled Status</span>
                <span className="text-[10px] text-slate-400">Triggers alerts if active</span>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className="text-primary-500 hover:text-primary-400 transition"
              >
                {enabled ? (
                  <ToggleRight className="h-9 w-9" />
                ) : (
                  <ToggleLeft className="h-9 w-9 text-slate-600" />
                )}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || selectedGeofence === ""}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-sm font-bold text-white py-3.5 shadow-lg shadow-primary-500/25 transition duration-300 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
              {saving ? "Saving Config..." : "Establish Warning Rule"}
            </button>
          </form>
        </div>

        {/* Right column: Config list */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white">Active Rules Configurations ({configs.length})</h2>
          
          {configs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-12 text-center text-slate-500 shadow-xl backdrop-blur">
              <Bell className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="font-semibold text-sm text-slate-400">No Alerts Configured</p>
              <p className="text-xs mt-1">Configure warning rules to monitor boundary violations for your vehicle fleet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`group relative overflow-hidden rounded-xl border p-5 shadow-lg backdrop-blur transition-all duration-300 flex flex-col gap-4 ${
                    config.enabled
                      ? "border-slate-800/80 bg-slate-950/40 hover:border-primary-500/40"
                      : "border-slate-900 bg-slate-950/10 opacity-60 hover:opacity-85"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        Rule ID: #{config.id}
                      </span>
                      <h3 className="font-bold text-slate-100 group-hover:text-primary-400 transition-colors">
                        {getGeofenceName(config.geofence_id)}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Asset: <strong className="text-slate-200">{getVehicleName(config.vehicle_id)}</strong>
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      config.alert_type === "entry"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : config.alert_type === "exit"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {config.alert_type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      {config.enabled ? (
                        <>
                          <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Active Monitoring</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4.5 w-4.5 text-slate-500" />
                          <span className="text-slate-500 font-medium">Inactive</span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => toggleRule(config)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition duration-300 ${
                        config.enabled
                          ? "bg-slate-900 border-slate-800 text-rose-400 hover:bg-rose-600 hover:text-white"
                          : "bg-slate-900 border-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                      }`}
                    >
                      {config.enabled ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
