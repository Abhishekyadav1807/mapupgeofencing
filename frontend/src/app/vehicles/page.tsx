"use client";

import React, { useEffect, useState } from "react";
import { api, Vehicle, Geofence, Point, LocationRecord } from "@/services/api";
import Map from "@/components/Map";
import { Truck, PlusCircle, Navigation, Clock, AlertTriangle, Play } from "lucide-react";
import toast from "react-hot-toast";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states - Create Vehicle
  const [vName, setVName] = useState("");
  const [creating, setCreating] = useState(false);

  // Form states - Location Simulator
  const [selectedSimVehicle, setSelectedSimVehicle] = useState<number | "">("");
  const [simLat, setSimLat] = useState<string>("");
  const [simLng, setSimLng] = useState<string>("");
  const [simulating, setSimulating] = useState(false);
  const [simAlerts, setSimAlerts] = useState<any[]>([]);

  // Selection states - View History
  const [selectedHistoryVehicle, setSelectedHistoryVehicle] = useState<Vehicle | null>(null);
  const [historyLocations, setHistoryLocations] = useState<LocationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Map focus coordinate helper
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  const fetchData = async () => {
    try {
      const [vehs, gfs] = await Promise.all([
        api.getVehicles(),
        api.getGeofences(),
      ]);
      setVehicles(vehs);
      setGeofences(gfs);
      if (vehs.length > 0 && selectedSimVehicle === "") {
        setSelectedSimVehicle(vehs[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch initial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim()) {
      toast.error("Vehicle name is required");
      return;
    }

    setCreating(true);
    try {
      const created = await api.createVehicle(vName.trim());
      toast.success(`Vehicle "${created.name}" registered successfully!`);
      setVName("");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to register vehicle");
    } finally {
      setCreating(false);
    }
  };

  const handleMapClickForSim = (point: Point) => {
    setSimLat(point.lat.toFixed(6));
    setSimLng(point.lng.toFixed(6));
    toast.success(`Position set to: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`, { id: "sim-pos", duration: 1500 });
  };

  const handleSendLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimVehicle) {
      toast.error("Please select a vehicle to simulate");
      return;
    }
    const lat = parseFloat(simLat);
    const lng = parseFloat(simLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Invalid coordinate values");
      return;
    }

    setSimulating(true);
    setSimAlerts([]);
    try {
      const result = await api.recordLocation(Number(selectedSimVehicle), lat, lng);
      toast.success("Location update broadcasted!");
      
      // Update alerts if triggered
      if (result.alerts && result.alerts.length > 0) {
        setSimAlerts(result.alerts);
        toast.custom((t) => (
          <div className="bg-amber-950 border border-amber-500/30 text-amber-100 p-4 rounded-xl shadow-2xl flex flex-col gap-1.5 animate-enter">
            <span className="font-bold flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Perimeter Breach Warning!
            </span>
            <span className="text-xs text-amber-200">
              {result.alerts.map((a) => a.message).join(", ")}
            </span>
          </div>
        ), { duration: 6000 });
      }

      // If we are currently viewing this vehicle's history, reload it
      if (selectedHistoryVehicle && selectedHistoryVehicle.id === Number(selectedSimVehicle)) {
        loadVehicleHistory(selectedHistoryVehicle);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update location");
    } finally {
      setSimulating(false);
    }
  };

  const loadVehicleHistory = async (vehicle: Vehicle) => {
    setSelectedHistoryVehicle(vehicle);
    setLoadingHistory(true);
    try {
      const history = await api.getVehicleLocations(vehicle.id);
      setHistoryLocations(history);
      if (history.length > 0) {
        setMapCenter([history[0].lat, history[0].lng]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load location history");
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary-500/25 border-t-primary-500 rounded-full animate-spin"></div>
          <span className="text-slate-400 font-medium">Loading Vehicle Assets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-enter">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Vehicle Activity & Simulator
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Register tracking nodes and use the real-time simulator to check geofence breaches.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Side: Create Vehicle & Location Simulator */}
        <div className="space-y-8">
          {/* Register Vehicle */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur">
            <h2 className="text-lg font-bold text-white mb-4">Register Vehicle Asset</h2>
            <form onSubmit={handleCreateVehicle} className="flex gap-4">
              <input
                type="text"
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                placeholder="e.g. Truck-418, Forklift-02"
                className="flex-1 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 focus:border-primary-500 focus:outline-none px-4 py-3 text-sm text-slate-100 transition"
                required
              />
              <button
                type="submit"
                disabled={creating || !vName.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-sm font-bold text-white px-6 py-3 shadow-lg shadow-primary-500/25 transition duration-300 disabled:opacity-50 whitespace-nowrap"
              >
                <PlusCircle className="h-4.5 w-4.5" />
                {creating ? "Adding..." : "Register Vehicle"}
              </button>
            </form>
          </div>

          {/* Location Simulator */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Interactive Location Simulator</h2>
              <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full uppercase">
                Mock GPS Signal
              </span>
            </div>

            <form onSubmit={handleSendLocation} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Select Vehicle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Select Simulated Asset
                  </label>
                  <select
                    value={selectedSimVehicle}
                    onChange={(e) => setSelectedSimVehicle(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 focus:border-primary-500 focus:outline-none px-4 py-3 text-sm text-slate-100 transition"
                    required
                  >
                    <option value="" disabled>Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (ID: #{v.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coordinates Fields */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Target Position (Lat / Lng)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={simLat}
                      onChange={(e) => setSimLat(e.target.value)}
                      className="w-1/2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 focus:border-primary-500 focus:outline-none px-4 py-3 text-sm text-slate-100 transition"
                      required
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={simLng}
                      onChange={(e) => setSimLng(e.target.value)}
                      className="w-1/2 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 focus:border-primary-500 focus:outline-none px-4 py-3 text-sm text-slate-100 transition"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Map Helper */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Click Coordinates on Map
                  </span>
                  <span className="text-[10px] text-slate-500">Updates input fields instantly</span>
                </div>
                <div className="h-[250px]">
                  <Map
                    geofences={geofences}
                    onMapClick={handleMapClickForSim}
                    center={mapCenter}
                  />
                </div>
              </div>

              {/* Send simulator coordinate */}
              <button
                type="submit"
                disabled={simulating || selectedSimVehicle === "" || simLat === "" || simLng === ""}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-sm font-bold text-white py-3.5 shadow-lg shadow-amber-500/25 transition duration-300 disabled:opacity-50"
              >
                <Play className="h-4.5 w-4.5" />
                {simulating ? "Transmitting GPS..." : "Transmit Simulated Location"}
              </button>
            </form>

            {/* Simulated Alerts list */}
            {simAlerts.length > 0 && (
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2.5">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 animate-bounce" /> Breach Events Triggered:
                </span>
                <div className="space-y-1.5">
                  {simAlerts.map((a, idx) => (
                    <p key={idx} className="text-xs text-slate-300">
                      • {a.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Vehicles List & Location History */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6">
          {/* Registered Vehicles List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Registered Assets ({vehicles.length})</h2>
            {vehicles.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-8 text-center text-slate-500 shadow-xl backdrop-blur">
                <Truck className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-xs text-slate-400">No Vehicles Registered</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
                {vehicles.map((v) => {
                  const isSelected = selectedHistoryVehicle?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => loadVehicleHistory(v)}
                      className={`group relative overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur cursor-pointer transition-all duration-300 flex items-center justify-between ${
                        isSelected
                          ? "border-primary-500/80 bg-primary-500/5 shadow-primary-500/10"
                          : "border-slate-800/60 bg-slate-950/40 hover:border-slate-700/60 hover:bg-slate-900/20"
                      }`}
                    >
                      <div className="space-y-1">
                        <h3 className={`font-bold transition-colors ${
                          isSelected ? "text-primary-400" : "text-slate-100 group-hover:text-primary-400"
                        }`}>
                          {v.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Asset ID: <strong className="text-slate-300">#{v.id}</strong></span>
                        </div>
                      </div>
                      <button className={`rounded-lg text-xs font-semibold px-3 py-1.5 transition duration-300 ${
                        isSelected
                          ? "bg-primary-600 text-white border border-transparent"
                          : "bg-slate-900 border border-slate-800 group-hover:border-primary-500/40 text-primary-400 hover:text-white hover:bg-primary-600"
                      }`}>
                        View History
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Location History list */}
          {selectedHistoryVehicle && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary-500" />
                  History: {selectedHistoryVehicle.name}
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                  {historyLocations.length} locations
                </span>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center p-8">
                  <div className="h-6 w-6 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                </div>
              ) : historyLocations.length === 0 ? (
                <div className="rounded-xl border border-slate-800/60 bg-slate-950/20 p-8 text-center text-slate-500 text-xs">
                  No GPS coordinates received yet. Use the Simulator.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 shadow-xl backdrop-blur p-4 max-h-[300px] overflow-y-auto space-y-3.5">
                  {historyLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-start gap-3 border-b border-slate-900/80 pb-3 last:border-0 last:pb-0"
                    >
                      <Navigation className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-200">
                            {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(loc.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Log ID: #{loc.id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
