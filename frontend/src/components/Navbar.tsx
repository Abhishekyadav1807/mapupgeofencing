"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAlerts } from "@/context/AlertContext";
import { LayoutDashboard, Map, Truck, BellRing, History, ShieldAlert } from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { isConnected } = useAlerts();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Geofences", href: "/geofences", icon: Map },
    { name: "Vehicles", href: "/vehicles", icon: Truck },
    { name: "Alert Rules", href: "/alerts", icon: BellRing },
    { name: "Violations", href: "/violations", icon: History },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-800/80">
        <ShieldAlert className="h-6 w-6 text-primary-500 animate-pulse" />
        <span className="text-lg font-bold tracking-wider text-slate-100 uppercase bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">
          MapUp Geofence
        </span>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/25"
                  : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Connection Status indicator */}
      <div className="border-t border-slate-800/80 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-slate-900/40 border border-slate-800/50 p-3.5">
          <span className="relative flex h-3.5 w-3.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                isConnected ? "bg-emerald-400" : "bg-rose-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                isConnected ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></span>
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-200">
              Live Stream Status
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {isConnected ? "Connected to Alerts" : "Disconnected - Retrying"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Navbar;
