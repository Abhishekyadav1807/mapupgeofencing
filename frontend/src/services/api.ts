import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Point {
  lat: number;
  lng: number;
}

export interface Geofence {
  id: number;
  name: string;
  polygon: Point[];
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LocationRecord {
  id: number;
  vehicle_id: number;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface AlertConfig {
  id: number;
  geofence_id: number;
  vehicle_id?: number;
  alert_type: "entry" | "exit" | "both";
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Violation {
  id: number;
  geofence_id: number;
  vehicle_id: number;
  type: "entry" | "exit";
  lat: number;
  lng: number;
  timestamp: string;
}

export interface AlertEvent {
  violation_id: number;
  geofence_id: number;
  vehicle_id: number;
  type: "entry" | "exit";
  lat: number;
  lng: number;
  timestamp: string;
  message: string;
}

export interface ApiResponse<T> {
  time_ns: number;
  data?: T;
  error?: string;
}

// API functions
export const api = {
  // Geofences
  getGeofences: async (): Promise<Geofence[]> => {
    const res = await apiClient.get<ApiResponse<Geofence[]>>("/geofences");
    return res.data.data || [];
  },
  createGeofence: async (name: string, polygon: Point[]): Promise<Geofence> => {
    const res = await apiClient.post<ApiResponse<Geofence>>("/geofences", { name, polygon });
    if (res.data.error) throw new Error(res.data.error);
    return res.data.data!;
  },

  // Vehicles
  getVehicles: async (): Promise<Vehicle[]> => {
    const res = await apiClient.get<ApiResponse<Vehicle[]>>("/vehicles");
    return res.data.data || [];
  },
  createVehicle: async (name: string): Promise<Vehicle> => {
    const res = await apiClient.post<ApiResponse<Vehicle>>("/vehicles", { name });
    if (res.data.error) throw new Error(res.data.error);
    return res.data.data!;
  },

  // Location Updates
  recordLocation: async (vehicle_id: number, lat: number, lng: number): Promise<{ location: LocationRecord, alerts: AlertEvent[] }> => {
    const res = await apiClient.post<ApiResponse<{ location: LocationRecord, alerts: AlertEvent[] }>>("/vehicles/location", {
      vehicle_id,
      lat,
      lng,
    });
    if (res.data.error) throw new Error(res.data.error);
    return res.data.data!;
  },
  getVehicleLocations: async (vehicle_id: number): Promise<LocationRecord[]> => {
    const res = await apiClient.get<ApiResponse<LocationRecord[]>>(`/vehicles/location/${vehicle_id}`);
    return res.data.data || [];
  },

  // Alert Rules Config
  getAlertConfigs: async (): Promise<AlertConfig[]> => {
    const res = await apiClient.get<ApiResponse<AlertConfig[]>>("/alerts");
    return res.data.data || [];
  },
  configureAlert: async (geofence_id: number, vehicle_id: number | null, alert_type: string, enabled: boolean): Promise<AlertConfig> => {
    const payload: any = { geofence_id, alert_type, enabled };
    if (vehicle_id !== null) {
      payload.vehicle_id = vehicle_id;
    }
    const res = await apiClient.post<ApiResponse<AlertConfig>>("/alerts/configure", payload);
    if (res.data.error) throw new Error(res.data.error);
    return res.data.data!;
  },

  // Violations History
  getViolationsHistory: async (geofence_id?: number, vehicle_id?: number, limit = 100): Promise<Violation[]> => {
    const params: any = { limit };
    if (geofence_id) params.geofence_id = geofence_id;
    if (vehicle_id) params.vehicle_id = vehicle_id;
    const res = await apiClient.get<ApiResponse<Violation[]>>("/violations/history", { params });
    return res.data.data || [];
  },
};
