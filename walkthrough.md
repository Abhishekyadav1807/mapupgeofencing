# Technical Walkthrough - MapUp Geofencing Management System

This document provides a technical overview of the architectural decisions, algorithm designs, backend bug fixes, and premium frontend components implemented in this system.

---

## 🛠️ Core Backend Implementations & Bug Fixes

During the audit and development of the Go backend, several critical logical bugs were resolved to make the system production-ready:

### 1. Ray-Casting Point-in-Polygon Algorithm
- **Implementation**: Located in `services/geofence.go` inside [PointInPolygon](file:///f:/mapup-geofencing/backend/services/geofence.go#L127-L147).
- **Details**: It casts an infinite ray horizontally to the right from the target point and counts intersections with the polygon segments. If the count of intersections is odd, the point is inside; if even, it is outside.
- **Complexity**: $O(N)$ where $N$ is the number of vertices in the polygon.

### 2. Geofence Boundary Closed-Loop Stripping
- **Problem**: Users drawing shapes on map helpers or submitting coordinates often append the starting coordinate twice to "close" the polygon. If stored as-is, this causes overlapping vertices and duplicate point checks during ray-casting.
- **Fix**: In `geofence_service.go`, when creating a geofence, we check if the last point matches the first point. If they do, we strip the final duplicate point before storing.
- **Validation**:
  - Validates minimum 3 distinct vertices.
  - Checks coordinate ranges ($\text{lat} \in [-90, 90], \text{lng} \in [-180, 180]$).
  - Checks for self-intersection (crossings) using segment intersection vectors.
  - Verifies non-zero area to prevent collinear lines.

### 3. Custom Polygon Marshaling (GORM SQLite)
- **Problem**: GORM stores the polygon slice of points as a raw JSON `text` string in GORM SQLite database. When marshaling response objects, Go standard library prints the `Polygon` field as a escaped string: `"polygon":"[{\"lat\":1.23,\"lng\":4.56},...]"` instead of a proper JSON array structure.
- **Fix**: Added a custom `MarshalJSON` interface implementation on the `Geofence` struct inside `models/models.go` to unmarshal the text field and structure it as a clean JSON array in HTTP responses.

### 4. Zero Coordinate (`0.0`) Gin Binding
- **Problem**: Standard Gin JSON binding checks `binding:"required"` on primitives. If coordinates `lat` or `lng` were exactly `0.0`, Go treated this as the default uninitialized zero value, failing the validation checks and returning bad requests.
- **Fix**: Replaced coordinate variables in `recordLocationRequest` inside `handlers.go` with `*float64` pointers. This allows Gin to differentiate between an absent coordinate (which results in `nil`) and a coordinate explicitly set to `0.0`.

### 5. Alert Configuration Upserts
- **Problem**: The original configuration code created duplicate configurations for the same vehicle/geofence trigger rules whenever they were updated.
- **Fix**: Converted GORM insertions to an **Upsert (FirstOrCreate)**, finding existing configurations matching `geofence_id` and `vehicle_id` and updating their `alert_type` and `enabled` status rather than creating a new record.

---

## 🎨 Frontend Architecture & Leaflet Optimizations

The Next.js 15 frontend utilizes Tailwind CSS v4 and dynamic Leaflet components:

### 1. SSR-Safe Map Wrapper
Leaflet references browser-only globals (like `window` and `document`) on initialization. To prevent SSR page compilation crashes, maps are wrapped using dynamic loading with SSR disabled:
```typescript
import dynamic from "next/dynamic";
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
```

### 2. React 19 Double-Mount Lifecycle Fix
- **Problem**: Next.js 15/16 running React 19 mounts and unmounts components twice in Strict/Development mode. When Leaflet maps unmount, they don't always clean up internal identifiers on DOM containers, leaving `_leaflet_id` attached. When React remounts, Leaflet detects this ID and throws a critical `"Map container is already initialized"` runtime error.
- **Fix**: Inside `MapInner.tsx` cleanup cycle, we explicitly remove the leaflet identifier on the DOM reference:
```typescript
useEffect(() => {
  return () => {
    if (containerRef.current) {
      delete (containerRef.current as any)._leaflet_id;
    }
  };
}, []);
```

### 3. Custom divIcons
To prevent broken asset path issues for Leaflet marker assets under Next.js assets bundler, vehicles are rendered as custom pulsing SVG nodes using Leaflet's `L.divIcon`:
```typescript
const vehicleIcon = L.divIcon({
  className: "custom-vehicle-marker",
  html: `<div class="pulse-marker animate-pulse bg-violet-500 ring-4 ring-violet-500/30"></div>`,
});
```

---

## 🛰️ Real-Time WebSocket Channel

- **Establishment**: Handled in `AlertContext.tsx` under a React Context Provider wrapper.
- **Status Indicator**: Navbar displays a pulsing status badge:
  - **Connected (Green)**: WebSocket channel open.
  - **Reconnecting (Red)**: Attempts connection retry every 3 seconds.
- **Toasts Feed**: Translates WebSocket events into beautiful custom sliding Toast indicators that warn operators immediately when a breach is active.
