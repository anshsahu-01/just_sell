"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Users", href: "/users" },
  { label: "Listings", href: "/listings" },
  { label: "Orders", href: "/orders" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-slate-200 bg-white md:h-screen md:w-56 md:border-b-0 md:border-r">
      <div className="px-4 py-4 text-sm font-semibold tracking-wide text-slate-800">Admin Panel</div>
      <nav className="flex gap-2 overflow-x-auto px-2 pb-3 md:block md:space-y-1 md:overflow-visible md:pb-0">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}