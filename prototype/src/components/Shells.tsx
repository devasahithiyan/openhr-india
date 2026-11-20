import { WorkspaceShell, type NavItem } from "./workspace-shell";
import { Link, useLocation, Outlet } from "react-router-dom";
import { COMPANY } from "../lib/data";
import { useDemo, useMe } from "../lib/store";
import { DemoBar } from "./ui";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect
          width="32"
          height="32"
          rx="7"
          fill={light ? "#ffffff" : "#2B3A8C"}
        />
        <circle cx="16" cy="16" r="6" fill="#E8A317" />
      </svg>
      <span
        className={`text-[19px] font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}
      >
        OpenHR India
      </span>
    </Link>
  );
}

function DemoShell({ admin }: { admin: boolean }) {
  const { leaves, corrections, workforce } = useDemo(),
    me = useMe(),
    { pathname } = useLocation();
  const time = "Time",
    finance = "Finance",
    people = "People";
  const items: NavItem[] = admin
    ? [
        {
          href: "/admin",
          label: "Overview",
          icon: "overview",
          group: "Workspace",
        },
        {
          href: "/admin/people",
          label: "People",
          icon: "people",
          group: people,
        },
        { href: "/admin/org", label: "Org chart", icon: "org", group: people },
        {
          href: "/admin/onboarding",
          label: "Onboarding",
          icon: "onboarding",
          group: people,
        },
        {
          href: "/admin/workforce",
          label: "Workforce",
          icon: "workforce",
          group: people,
        },
        {
          href: "/admin/leave",
          label: "Leave requests",
          icon: "leave",
          group: time,
          count: leaves.filter((l) => l.status === "Pending").length,
        },
        {
          href: "/admin/calendar",
          label: "Team calendar",
          icon: "calendar",
          group: time,
        },
        {
          href: "/admin/attendance",
          label: "Attendance",
          icon: "time",
          group: time,
          count: corrections.filter((c) => c.status === "Pending").length,
        },
        {
          href: "/admin/payroll",
          label: "Payroll",
          icon: "pay",
          group: finance,
        },
        {
          href: "/admin/expenses",
          label: "Expenses",
          icon: "expense",
          group: finance,
        },
        {
          href: "/admin/compliance",
          label: "Compliance",
          icon: "compliance",
          group: finance,
        },
      ]
    : [
        { href: "/me", label: "Home", icon: "overview", group: "Workspace" },
        {
          href: "/me/profile",
          label: "Profile",
          icon: "profile",
          group: people,
        },
        {
          href: "/me/onboarding",
          label: "Onboarding",
          icon: "onboarding",
          group: people,
        },
        {
          href: "/me/workforce",
          label: "Workforce",
          icon: "workforce",
          group: people,
        },
        { href: "/me/leave", label: "Leave", icon: "leave", group: time },
        {
          href: "/me/attendance",
          label: "Attendance",
          icon: "time",
          group: time,
        },
        {
          href: "/me/payslips",
          label: "Payslips",
          icon: "pay",
          group: finance,
        },
        {
          href: "/me/expenses",
          label: "Expenses",
          icon: "expense",
          group: finance,
        },
        { href: "/me/tax", label: "Tax", icon: "compliance", group: finance },
      ];
  const ended = !admin && workforce.people.find((p) => p.id === me.id)?.ended;
  return (
    <WorkspaceShell
      items={items}
      home="/"
      pathname={pathname}
      company={COMPANY.name}
      identity={
        admin ? "Meenakshi Sundaram · HR Manager" : me.name + " · Employee"
      }
      link={(to, children, attrs) => (
        <Link to={to} {...attrs}>
          {children}
        </Link>
      )}
      tools={<DemoBar role={admin ? "admin" : "employee"} />}
    >
      {ended ? <p>Company access ended on {ended}.</p> : <Outlet />}
    </WorkspaceShell>
  );
}
export const AdminShell = () => <DemoShell admin />;
export const EmployeeShell = () => <DemoShell admin={false} />;
