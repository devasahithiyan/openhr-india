import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useDemo } from "../lib/store";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short" });

export const fmtDate = (iso: string) => dateFmt.format(new Date(iso + "T00:00:00"));
export const fmtShort = (iso: string) => shortFmt.format(new Date(iso + "T00:00:00"));
export const fmtDay = (iso: string) => dayFmt.format(new Date(iso + "T00:00:00"));

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  return (
    <span
      aria-hidden
      className={`${s} inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-soft font-semibold text-indigo`}
    >
      {initials(name)}
    </span>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-line/60 text-muted",
  good: "bg-leaf-soft text-leaf",
  warn: "bg-haldi-soft text-[#8a5a00]",
  bad: "bg-sindoor-soft text-sindoor",
  info: "bg-indigo-soft text-indigo",
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function statusTone(s: string): Tone {
  if (s === "Approved" || s === "Filed" || s === "Paid") return "good";
  if (s === "Rejected" || s === "Overdue") return "bad";
  if (s === "Pending" || s === "Due") return "warn";
  return "neutral";
}

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="hr-page-head mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {sub && <p className="mt-1 text-[15px] text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "accent" }) {
  const v = {
    primary: "bg-indigo text-white hover:bg-indigo-deep",
    accent: "bg-haldi text-ink hover:brightness-95",
    ghost: "border border-line bg-white text-ink hover:border-indigo/40",
    danger: "border border-line bg-white text-sindoor hover:border-sindoor/50",
  }[variant];
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DemoBar({ role }: { role: "admin" | "employee" }) {
  const { reset } = useDemo();
  return (
    <div className="hr-demo-tools">
      <span className="hr-demo-label">Sample data</span>
        <Link className="hr-tool" to={role === "admin" ? "/me" : "/admin"}>
          <span className="hr-switch-long">Switch to </span>{role === "admin" ? "Employee" : "HR admin"} view
        </Link>
        <button className="hr-tool"
          onClick={() => {
            if (confirm("Reset all demo changes?")) reset();
          }}
        >
          Reset demo
        </button>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-[19px] font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
