import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AlertProvider } from "@/context/AlertContext";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Geofencing Control Dashboard",
  description: "Real-time geofence tracking and breach alert control dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex bg-slate-950 text-slate-100 font-sans">
        <AlertProvider>
          {/* Real-time Alerts Toast Provider */}
          <Toaster position="top-right" />

          {/* Navigation Sidebar */}
          <Navbar />

          {/* Main Dashboard Space */}
          <main className="flex-1 min-h-screen pl-64 flex flex-col">
            <div className="flex-1 p-8 overflow-y-auto">
              {children}
            </div>
          </main>
        </AlertProvider>
      </body>
    </html>
  );
}
