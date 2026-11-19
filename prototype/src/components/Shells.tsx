import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { COMPANY } from "../lib/data";
import { useDemo, useMe } from "../lib/store";
import { Avatar, DemoBar } from "./ui";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill={light ? "#ffffff" : "#2B3A8C"} />
        <circle cx="16" cy="16" r="6" fill="#E8A317" />
      </svg>
      <span className={`text-[19px] font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>OpenHR India</span>
    </Link>
  );
}

export function AdminShell() {
  const { leaves } = useDemo();
  const pending = leaves.filter((l) => l.status === "Pending").length;
  const [open, setOpen] = useState(false);
  const nav = [
    { to: "/admin", label: "Overview", end: true },
    { to: "/admin/people", label: "People" },
    { to: "/admin/org", label: "Org chart" },
    { to: "/admin/leave", label: "Leave requests", badge: pending },
    { to: "/admin/payroll", label: "Payroll" },
    { to: "/admin/compliance", label: "Compliance" },
  ];

  return (
    <div className="min-h-screen">
      <DemoBar role="admin" />
      <div className="lg:flex">
        <aside className="no-print bg-indigo-deep text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
          <div className="flex items-center justify-between px-5 py-4">
            <Logo light />
            <button
              className="rounded-md px-3 py-1.5 text-sm font-semibold ring-1 ring-white/30 lg:hidden"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Close" : "Menu"}
            </button>
          </div>
          <nav className={`${open ? "block" : "hidden"} px-3 pb-4 lg:block`} aria-label="Admin">
            <p className="px-3 pt-2 pb-3 text-[14px] text-white/60">{COMPANY.name}</p>
            <ul className="space-y-0.5">
              {nav.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-lg px-3 py-2 text-[16px] ${
                        isActive ? "bg-white/12 font-semibold text-white" : "text-white/75 hover:bg-white/6 hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex items-center gap-2.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-haldi" : "bg-transparent"}`} />
                          {n.label}
                        </span>
                        {n.badge ? (
                          <span className="rounded-full bg-haldi px-2 text-[13px] font-bold text-ink">{n.badge}</span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center gap-3 border-t border-white/15 px-3 pt-4">
              <Avatar name="Meenakshi Sundaram" size="sm" />
              <div className="text-[14px] leading-tight">
                <p className="font-semibold">Meenakshi Sundaram</p>
                <p className="text-white/60">HR Manager</p>
              </div>
            </div>
          </nav>
        </aside>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function EmployeeShell() {
  const me = useMe();
  const nav = [
    { to: "/me", label: "Home", end: true },
    { to: "/me/payslips", label: "Payslips" },
    { to: "/me/leave", label: "Leave" },
    { to: "/me/tax", label: "Tax" },
    { to: "/me/profile", label: "Profile" },
  ];
  return (
    <div className="min-h-screen">
      <DemoBar role="employee" />
      <header className="no-print border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-2.5">
            <span className="hidden text-right text-[14px] leading-tight sm:block">
              <span className="block font-semibold">{me.name}</span>
              <span className="text-muted">{COMPANY.short}</span>
            </span>
            <Avatar name={me.name} size="sm" />
          </div>
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-2 sm:px-6" aria-label="Employee">
          <ul className="flex gap-1">
            {nav.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `block border-b-[3px] px-3 py-2.5 text-[16px] whitespace-nowrap ${
                      isActive ? "border-haldi font-semibold text-ink" : "border-transparent text-muted hover:text-ink"
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
