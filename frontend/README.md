# MapUp Geofencing Control Panel Frontend

An interactive, premium-designed Geofencing Control Panel frontend built with **Next.js 15**, **TypeScript**, **Tailwind CSS v4**, and **React Leaflet**. It integrates with the Go backend to display geofence perimeters, track live vehicle signals, simulate GPS transmissions, configure entry/exit rules, and show live WebSocket warnings.

---

## 🌟 Tech Stack & Key Libraries

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styles**: [Tailwind CSS v4](https://tailwindcss.com/) (modern variables-based design system)
- **Maps**: [React Leaflet 5](https://react-leaflet.js.org/) & [Leaflet 1.9](https://leafletjs.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **API Client**: [Axios](https://axios-http.com/)
- **Toasts**: [React Hot Toast](https://react-hot-toast.com/) (beautiful floating alerts)

---

## 📄 Key Features & Pages

### 1. Dashboard (`/`)
- Renders key analytics: Active Vehicles, Registered Geofences, Alert rules, and Total Breaches.
- Houses the **Main Live tracking map** overlays all polygons and live pulsing vehicle markers.
- Side panel displays a real-time scrolling breach alert log directly piped from the WebSocket.

### 2. Geofence Management (`/geofences`)
- Interactive drawing helper: click on the map to define polygon vertices (minimum 3).
- Undo last point / clear drawing tools.
- Shows immediate validation feedback and records list. Clicking lists focuses the map on that geofence.

### 3. Vehicle Activity & GPS Simulator (`/vehicles`)
- Register vehicles with unique names (numbers like `UP65AB1234`).
- **GPS Simulator**: select any registered asset, click on the map to mock GPS coordinates, and transmit. Shows immediate alert warning banners on breach.
- View chronological historical movement logs for individual vehicles.

### 4. Alert Configuration (`/alerts`)
- Set alert triggers for entry, exit, or both boundaries.
- Bind alert configurations globally to all vehicles or target specific registered vehicle IDs.
- Enable or disable rules dynamically with interactive toggles.

### 5. Violation Audit Log (`/violations`)
- Structured tabular report listing historical entries and exit details (ID, Vehicle name, Geofence name, coords, timestamp).
- Supports filtering by vehicle, geofence, and query limits.

---

## 🚀 Getting Started

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`.

### Environment Variables
Configure target endpoints using a `.env.local` or environment variables:

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `http://localhost:8080` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8080/ws/alerts` | WebSocket alerts endpoint |

---

## 📂 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Sidebar, layout template and Global styles
│   │   ├── page.tsx           # Dashboard view
│   │   ├── geofences/         # Geofences builder
│   │   ├── vehicles/          # Assets management and Simulator
│   │   ├── alerts/            # Rules configuration panel
│   │   └── violations/        # Historical logs
│   ├── components/
│   │   ├── Navbar.tsx         # Fixed glass sidebar + ws indicators
│   │   ├── Map.tsx            # Dynamic client-only Leaflet wrapper
│   │   └── MapInner.tsx       # Leaflet maps event handler & drawing layer
│   ├── context/
│   │   └── AlertContext.tsx   # WebSocket subscription and custom toast system
│   └── services/
│       └── api.ts             # Axios HTTP client requests mapping
├── Dockerfile                 # Multi-stage production Docker configuration
├── package.json
└── tsconfig.json
```

---

## ⚙️ Key Technical Implementations

### 1. SSR-Safe Map Loading
Leaflet requires a browser DOM environment to initialize. To prevent SSR compilation crashes, map modules are loaded dynamically with server-side rendering disabled:
```typescript
import dynamic from "next/dynamic";
const Map = dynamic(() => import("@/components/Map"), { ssr: false });
```

### 2. React 19 Double-Mount Cleanup
React 19 strict mode double-mounts effects, and Leaflet does not dispose DOM properties correctly when re-rendered, throwing `"Map container is already initialized"`. We resolve this with a cleanup hook inside `MapInner.tsx`:
```typescript
useEffect(() => {
  return () => {
    if (containerRef.current) {
      // Safely delete leaflet identifiers on unmount
      delete (containerRef.current as any)._leaflet_id;
    }
  };
}, []);
```
