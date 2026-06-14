"use client";

import React, { useEffect, useState } from "react";
import { api, Geofence, Vehicle, AlertConfig, Violation } from "@/services/api";
import { useAlerts } from "@/context/AlertContext";
import Map from "@/components/Map";
import { MapPin, Truck, Bell, AlertTriangle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface VehicleLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export default function Dashboard() {
  const { alerts } = useAlerts();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [vehicleLocations, setVehicleLocations] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  const routes = [
    // Vehicle 1 (Truck-001) -> Cubbon Park Green Zone (GF 1)
    [
      { lat: 12.9750, lng: 77.5850 },
      { lat: 12.9750, lng: 77.5880 },
      { lat: 12.9750, lng: 77.5915 }, // entry
      { lat: 12.9755, lng: 77.5940 },
      { lat: 12.9750, lng: 77.5965 },
      { lat: 12.9745, lng: 77.5980 },
      { lat: 12.9740, lng: 77.6010 }, // exit
      { lat: 12.9740, lng: 77.6040 },
      { lat: 12.9740, lng: 77.6070 },
      { lat: 12.9740, lng: 77.6040 },
      { lat: 12.9745, lng: 77.5980 }, // entry
      { lat: 12.9750, lng: 77.5940 }
    ],
    // Vehicle 2 (Delivery-Van-42) -> Indiranagar Commercial Corridor (GF 2)
    [
      { lat: 12.9850, lng: 77.6430 },
      { lat: 12.9810, lng: 77.6430 },
      { lat: 12.9750, lng: 77.6430 }, // entry
      { lat: 12.9710, lng: 77.6430 },
      { lat: 12.9690, lng: 77.6430 },
      { lat: 12.9650, lng: 77.6430 }, // exit
      { lat: 12.9610, lng: 77.6430 },
      { lat: 12.9570, lng: 77.6430 },
      { lat: 12.9610, lng: 77.6430 },
      { lat: 12.9650, lng: 77.6430 },
      { lat: 12.9690, lng: 77.6430 }, // entry
      { lat: 12.9750, lng: 77.6430 }
    ],
    // Vehicle 3 (Cargo-Hauler-X) -> Hebbal IT Highway (GF 3)
    [
      { lat: 13.0380, lng: 77.5920 },
      { lat: 13.0380, lng: 77.5890 },
      { lat: 13.0380, lng: 77.5830 }, // exit
      { lat: 13.0350, lng: 77.5810 },
      { lat: 13.0320, lng: 77.5800 },
      { lat: 13.0290, lng: 77.5830 },
      { lat: 13.0290, lng: 77.5890 },
      { lat: 13.0340, lng: 77.5920 }, // entry
      { lat: 13.0380, lng: 77.5920 },
      { lat: 13.0420, lng: 77.5920 },
      { lat: 13.0480, lng: 77.5920 }, // exit
      { lat: 13.0420, lng: 77.5920 } // entry
    ]
  ];

  // Simulation tick logic
  useEffect(() => {
    if (!isSimulating || vehicles.length < 3) return;

    const timer = setTimeout(async () => {
      const stepIndex = simStep;
      
      const p1 = routes[0][stepIndex % routes[0].length];
      const p2 = routes[1][stepIndex % routes[1].length];
      const p3 = routes[2][stepIndex % routes[2].length];

      const vehicleId1 = vehicles[0]?.id;
      const vehicleId2 = vehicles[1]?.id;
      const vehicleId3 = vehicles[2]?.id;

      const promises = [];

      if (vehicleId1) {
        promises.push(
          api.recordLocation(vehicleId1, p1.lat, p1.lng).then((res) => {
            setVehicleLocations((prev) => {
              const next = [...prev];
              const idx = next.findIndex((v) => v.id === vehicleId1);
              const updated = { id: vehicleId1, name: vehicles[0].name, lat: p1.lat, lng: p1.lng, timestamp: res.location.timestamp };
              if (idx !== -1) next[idx] = updated;
              else next.push(updated);
              return next;
            });
          }).catch(console.error)
        );
      }

      if (vehicleId2) {
        promises.push(
          api.recordLocation(vehicleId2, p2.lat, p2.lng).then((res) => {
            setVehicleLocations((prev) => {
              const next = [...prev];
              const idx = next.findIndex((v) => v.id === vehicleId2);
              const updated = { id: vehicleId2, name: vehicles[1].name, lat: p2.lat, lng: p2.lng, timestamp: res.location.timestamp };
              if (idx !== -1) next[idx] = updated;
              else next.push(updated);
              return next;
            });
          }).catch(console.error)
        );
      }

      if (vehicleId3) {
        promises.push(
          api.recordLocation(vehicleId3, p3.lat, p3.lng).then((res) => {
            setVehicleLocations((prev) => {
              const next = [...prev];
              const idx = next.findIndex((v) => v.id === vehicleId3);
              const updated = { id: vehicleId3, name: vehicles[2].name, lat: p3.lat, lng: p3.lng, timestamp: res.location.timestamp };
              if (idx !== -1) next[idx] = updated;
              else next.push(updated);
              return next;
            });
          }).catch(console.error)
        );
      }

      await Promise.all(promises);
      setSimStep((prev) => prev + 1);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isSimulating, simStep, vehicles]);

  const handleSeed = async () => {
    const loadToast = toast.loading("Seeding database with demo data...");
    try {
      setIsSimulating(false);
      setSimStep(0);
      await api.seedDatabase();
      toast.success("Database seeded! Default geofences and vehicles registered.", { id: loadToast });
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to seed database: " + err.message, { id: loadToast });
    }
  };

  const handleStartSimulation = () => {
    if (vehicles.length < 3) {
      toast.error("Please seed the demo data first!");
      return;
    }
    setIsSimulating(true);
    toast.success("Vehicle tracking simulation started!");
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    toast.success("Simulation paused.");
  };

  const fetchData = async () => {
    try {
      const [gfs, vehs, configs, vios] = await Promise.all([
        api.getGeofences(),
        api.getVehicles(),
        api.getAlertConfigs(),
        api.getViolationsHistory(undefined, undefined, 10),
      ]);

      setGeofences(gfs);
      setVehicles(vehs);
      setAlertConfigs(configs);
      setViolations(vios);

      // Fetch the latest location for each vehicle
      const locPromises = vehs.map(async (v) => {
        try {
          const locs = await api.getVehicleLocations(v.id);
          if (locs.length > 0) {
            return {
              id: v.id,
              name: v.name,
              lat: locs[0].lat,
              lng: locs[0].lng,
              timestamp: locs[0].timestamp,
            };
          }
        } catch (e) {
          console.error(`Failed to fetch location for vehicle ${v.id}`, e);
        }
        return null;
      });

      const locResults = await Promise.all(locPromises);
      setVehicleLocations(locResults.filter((l): l is VehicleLocation => l !== null));
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Failed to load dashboard data. Is the backend running?");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update vehicle locations dynamically if a live alert event arrives via WS
  useEffect(() => {
    if (alerts.length > 0) {
      const latest = alerts[0];
      setVehicleLocations((prev) => {
        const idx = prev.findIndex((v) => v.id === latest.vehicle_id);
        const name = vehicles.find((v) => v.id === latest.vehicle_id)?.name || `Vehicle ${latest.vehicle_id}`;
        const updatedLoc: VehicleLocation = {
          id: latest.vehicle_id,
          name,
          lat: latest.lat,
          lng: latest.lng,
          timestamp: latest.timestamp,
        };

        if (idx !== -1) {
          const newLocs = [...prev];
          newLocs[idx] = updatedLoc;
          return newLocs;
        } else {
          return [...prev, updatedLoc];
        }
      });

      // Reload violations history
      api.getViolationsHistory(undefined, undefined, 10).then(setViolations).catch(console.error);
    }
  }, [alerts, vehicles]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeConfigsCount = alertConfigs.filter((c) => c.enabled).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary-500/25 border-t-primary-500 rounded-full animate-spin"></div>
          <span className="text-slate-400 font-medium">Loading Dashboard Analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-enter">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Analytics Overview
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time geofence violations, vehicle activity tracker, and perimeter breaches.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-slate-800 hover:text-white px-4 py-2.5 text-xs font-semibold text-slate-300 transition duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {/* Simulation Control Panel */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-6 shadow-2xl backdrop-blur relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 animate-enter">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Demo Control Panel</h2>
            {isSimulating && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Prepare the database and execute live tracking simulations. Seeding wipes the database and resets auto-increment sequence, introducing 3 geofences and 3 vehicles.
          </p>
          {isSimulating && (
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-300 mt-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 w-fit uppercase tracking-wider">
              <span>Status: <strong className="text-emerald-400 font-extrabold">Simulating</strong></span>
              <span className="text-slate-700">|</span>
              <span>Step: <strong className="text-indigo-400 font-extrabold">{simStep}</strong></span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={handleSeed}
            className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-slate-800 hover:text-white px-4 py-2.5 text-xs font-semibold text-slate-300 transition duration-300 cursor-pointer"
          >
            Seed Demo Data
          </button>
          {!isSimulating ? (
            <button
              onClick={handleStartSimulation}
              disabled={vehicles.length < 3}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-semibold shadow-lg shadow-indigo-600/20 transition duration-300 disabled:opacity-50 cursor-pointer"
            >
              Start Live Simulation
            </button>
          ) : (
            <button
              onClick={handleStopSimulation}
              className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 text-xs font-semibold shadow-lg shadow-rose-600/20 transition duration-300 cursor-pointer"
            >
              Stop Simulation
            </button>
          )}
        </div>
        
        {/* Sleek background details */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Geofences Counter */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur transition-all duration-300 hover:border-primary-500/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Geofence Zones
              </span>
              <p className="text-3xl font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors">
                {geofences.length}
              </p>
            </div>
            <div className="rounded-xl bg-primary-500/10 p-3 text-primary-500 group-hover:bg-primary-500/20 transition-all duration-300">
              <MapPin className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>

        {/* Vehicles Counter */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur transition-all duration-300 hover:border-indigo-500/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Vehicles
              </span>
              <p className="text-3xl font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                {vehicles.length}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-500 group-hover:bg-indigo-500/20 transition-all duration-300">
              <Truck className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-primary-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>

        {/* Alert Rules Counter */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur transition-all duration-300 hover:border-amber-500/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Configured Rules
              </span>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                  {alertConfigs.length}
                </p>
                <span className="text-xs text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {activeConfigsCount} Active
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500 group-hover:bg-amber-500/20 transition-all duration-300">
              <Bell className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>

        {/* Violations Counter */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-xl backdrop-blur transition-all duration-300 hover:border-rose-500/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Breaches
              </span>
              <p className="text-3xl font-bold text-white tracking-tight group-hover:text-rose-400 transition-colors">
                {violations.length}
              </p>
            </div>
            <div className="rounded-xl bg-rose-500/10 p-3 text-rose-500 group-hover:bg-rose-500/20 transition-all duration-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
        </div>
      </div>

      {/* Main Grid: Interactive Map & Live Alerts Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Live Tracking Map */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Live Tracking Map</h2>
            <span className="text-xs text-slate-400">Shows current vehicle markers & boundaries</span>
          </div>
          <div className="h-[500px]">
            <Map geofences={geofences} vehicles={vehicleLocations} />
          </div>
        </div>

        {/* Live Alerts Feed Side Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Real-Time Alert Feed</h2>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase animate-pulse">
              Live Stream
            </span>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 shadow-xl backdrop-blur h-[500px] overflow-y-auto flex flex-col gap-3">
            {/* Live alerts from state or historical fallback */}
            {alerts.length === 0 && violations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-500"></span>
                </span>
                Waiting for geofence breaches...
              </div>
            ) : (
              <>
                {/* Real-time Alerts */}
                {alerts.map((alert, idx) => (
                  <div
                    key={`live-${idx}-${alert.timestamp}`}
                    className="flex flex-col gap-1.5 p-3 rounded-xl border border-primary-500/30 bg-primary-500/5 shadow shadow-primary-500/10 transition duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        alert.type === "entry" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}>
                        {alert.type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-normal">
                      {alert.message}
                    </p>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-1.5 mt-0.5">
                      <span>Vehicle: #{alert.vehicle_id}</span>
                      <span>Pos: {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}</span>
                    </div>
                  </div>
                ))}

                {/* Separator if both exist */}
                {alerts.length > 0 && violations.length > 0 && (
                  <div className="border-b border-slate-800/80 my-1 flex items-center justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 bg-slate-950 px-2 py-1 select-none">
                      Recent History
                    </span>
                  </div>
                )}

                {/* Historical fallback */}
                {violations.slice(0, 10).map((v) => (
                  <div
                    key={`hist-${v.id}`}
                    className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-800 bg-slate-900/20 hover:bg-slate-900/40 transition duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        v.type === "entry" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {v.type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-normal">
                      Vehicle #{v.vehicle_id} {v.type === "entry" ? "entered" : "exited"} geofence #{v.geofence_id}
                    </p>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-900 pt-1.5 mt-0.5">
                      <span>Vehicle: #{v.vehicle_id}</span>
                      <span>Pos: {v.lat.toFixed(4)}, {v.lng.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
