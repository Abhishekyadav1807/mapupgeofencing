"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { AlertEvent } from "@/services/api";

interface AlertContextType {
  alerts: AlertEvent[];
  isConnected: boolean;
  clearAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      console.log("Connecting to WebSocket alerts stream...");
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws/alerts";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        toast.success("Connected to real-time alert feed", {
          id: "ws-status",
          duration: 3000,
        });
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          // The backend sends websocket messages as: { time_ns: ..., data: AlertEvent }
          if (parsed && parsed.data) {
            const alertEvent: AlertEvent = parsed.data;
            setAlerts((prev) => [alertEvent, ...prev].slice(0, 100)); // limit feed to 100 latest items

            // Trigger beautiful custom toast notification
            toast.custom(
              (t) => (
                <div
                  className={`${
                    t.visible ? "animate-enter" : "animate-leave"
                  } max-w-md w-full bg-slate-900 border-l-4 ${
                    alertEvent.type === "entry" ? "border-emerald-500" : "border-rose-500"
                  } shadow-2xl rounded-r-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}
                >
                  <div className="flex-1 w-0">
                    <div className="flex items-start">
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                          Geofence Alert: {alertEvent.type}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {alertEvent.message}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Location: {alertEvent.lat.toFixed(5)}, {alertEvent.lng.toFixed(5)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex border-l border-slate-800">
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-200 focus:outline-none"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ),
              { duration: 6000 }
            );
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed. Retrying...");
        setIsConnected(false);
        // Clean toast for status
        toast.error("Alert feed disconnected. Retrying...", {
          id: "ws-status",
          duration: 3000,
        });
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket connection error:", err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const clearAlerts = () => {
    setAlerts([]);
  };

  return (
    <AlertContext.Provider value={{ alerts, isConnected, clearAlerts }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error("useAlerts must be used within an AlertProvider");
  }
  return context;
};
