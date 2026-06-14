"use client";

import dynamic from "next/dynamic";
import React from "react";

// Dynamically import the MapInner component to disable Server-Side Rendering (SSR)
// for Leaflet. During loading, render a beautiful glowing placeholder skeleton.
const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[350px] bg-slate-900 border border-slate-800/60 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/30 to-transparent -translate-x-full animate-shimmer" style={{ animationDuration: "1.5s" }}></div>
      <div className="h-10 w-10 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin"></div>
      <span className="text-sm text-slate-400 font-semibold tracking-wider">
        Loading Satellite Map Interface...
      </span>
    </div>
  ),
});

export type { Point, Geofence } from "@/services/api";

interface VehicleMarker {
  id: number;
  name: string;
  lat: number;
  lng: number;
  timestamp: string;
}

interface MapProps {
  geofences?: any[];
  vehicles?: VehicleMarker[];
  draftPoints?: any[];
  onMapClick?: (point: any) => void;
  center?: [number, number];
  zoom?: number;
}

export const Map: React.FC<MapProps> = (props) => {
  return <MapInner {...props} />;
};

export default Map;
