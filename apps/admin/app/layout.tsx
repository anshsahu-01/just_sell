import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin dashboard shell",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="md:flex">
          <Sidebar />
          <div className="min-h-screen flex-1">
            <Topbar />
            <main className="p-4 md:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}