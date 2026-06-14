"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polygon as LeafletPolygon, Polyline as LeafletPolyline, Marker, Popup, useMapEvents } from "react-leaflet";
import { Point, Geofence } from "@/services/api";

// Fix default leaflet icons using custom SVG icons for stability
const createVehicleIcon = (name: string) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <span class="absolute inline-flex h-8 w-8 rounded-full bg-primary-500/30 animate-ping"></span>
        <div class="h-5.5 w-5.5 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 border border-slate-100 flex items-center justify-center shadow-lg text-[9px] font-bold text-white uppercase">
          ${name.substring(0, 2)}
        </div>
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const draftVertexIcon = L.divIcon({
  html: `<div class="h-3 w-3 rounded-full bg-amber-500 border border-white shadow shadow-black"></div>`,
  className: "custom-vertex-icon",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

interface VehicleMarker {
  id: number;
  name: string;
  lat: number;
  lng: number;
  timestamp: string;
}

interface MapInnerProps {
  geofences?: Geofence[];
  vehicles?: VehicleMarker[];
  draftPoints?: Point[];
  onMapClick?: (point: Point) => void;
  center?: [number, number];
  zoom?: number;
}

// Subcomponent to handle map clicks for drawing mode
const MapClickHandler: React.FC<{ onClick?: (point: Point) => void }> = ({ onClick }) => {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

// Subcomponent to auto-adjust map bounds to show all geofences/vehicles
const MapBoundsHandler: React.FC<{ geofences?: Geofence[]; vehicles?: VehicleMarker[] }> = ({ geofences, vehicles }) => {
  const map = useMapEvents({});

  useEffect(() => {
    const points: L.LatLng[] = [];
    geofences?.forEach((gf) => {
      gf.polygon.forEach((pt) => {
        points.push(L.latLng(pt.lat, pt.lng));
      });
    });
    vehicles?.forEach((v) => {
      points.push(L.latLng(v.lat, v.lng));
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [geofences, vehicles, map]);

  return null;
};

export const MapInner: React.FC<MapInnerProps> = ({
	geofences = [],
	vehicles = [],
	draftPoints = [],
	onMapClick,
	center = [12.97159, 77.59456], // Default to Bangalore center
	zoom = 13,
}) => {
	const mapKey = `${center[0]}-${center[1]}-${zoom}`;
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const cleanupLeafletId = () => {
			if (containerRef.current) {
				const el = containerRef.current.querySelector('.leaflet-container') as any;
				if (el && el._leaflet_id) {
					delete el._leaflet_id;
				}
			}
		};

		cleanupLeafletId();
		return cleanupLeafletId;
	}, [mapKey]);

	return (
		<div ref={containerRef} className="relative w-full h-full min-h-[350px] border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">
			<MapContainer
				key={mapKey}
				center={center}
				zoom={zoom}
				style={{ width: "100%", height: "100%" }}
				zoomControl={true}
			>
        {/* Sleek Dark Map Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Draw handlers */}
        <MapClickHandler onClick={onMapClick} />
        <MapBoundsHandler geofences={geofences} vehicles={vehicles} />

        {/* Render Existing Geofences */}
        {geofences.map((gf) => {
          const latLngs = gf.polygon.map((p) => [p.lat, p.lng] as [number, number]);
          return (
            <LeafletPolygon
              key={gf.id}
              positions={latLngs}
              pathOptions={{
                fillColor: "#8b5cf6",
                fillOpacity: 0.15,
                color: "#6366f1",
                weight: 2,
                dashArray: "1, 5",
              }}
            >
              <Popup>
                <div className="text-slate-950 font-sans p-1">
                  <h3 className="font-bold text-sm text-primary-900">{gf.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Geofence ID: {gf.id}</p>
                  <p className="text-[10px] text-slate-500">Vertices: {gf.polygon.length}</p>
                </div>
              </Popup>
            </LeafletPolygon>
          );
        })}

        {/* Render Draft Drawing Points */}
        {draftPoints.length > 0 && (
          <>
            {/* Markers at each vertex */}
            {draftPoints.map((pt, idx) => (
              <Marker
                key={`draft-v-${idx}`}
                position={[pt.lat, pt.lng]}
                icon={draftVertexIcon}
              />
            ))}
            
            {/* Draw polyline connecting vertices */}
            <LeafletPolyline
              positions={draftPoints.map((pt) => [pt.lat, pt.lng])}
              pathOptions={{ color: "#f59e0b", weight: 3, dashArray: "5, 5" }}
            />

            {/* If 3+ vertices, draw closed fill polygon */}
            {draftPoints.length >= 3 && (
              <LeafletPolygon
                positions={draftPoints.map((pt) => [pt.lat, pt.lng])}
                pathOptions={{
                  fillColor: "#f59e0b",
                  fillOpacity: 0.1,
                  color: "#d97706",
                  weight: 1,
                }}
              />
            )}
          </>
        )}

        {/* Render Active Vehicles */}
        {vehicles.map((v) => (
          <Marker
            key={`veh-${v.id}`}
            position={[v.lat, v.lng]}
            icon={createVehicleIcon(v.name)}
          >
            <Popup>
              <div className="text-slate-950 font-sans p-1">
                <h3 className="font-bold text-sm text-primary-900">{v.name}</h3>
                <p className="text-[10px] text-slate-600 mt-1 font-semibold">Vehicle ID: {v.id}</p>
                <p className="text-[10px] text-slate-500">Coordinates: {v.lat.toFixed(5)}, {v.lng.toFixed(5)}</p>
                <p className="text-[10px] text-slate-400">Last updated: {new Date(v.timestamp).toLocaleTimeString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
export default MapInner;
