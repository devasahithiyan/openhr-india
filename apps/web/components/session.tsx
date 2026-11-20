"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { WorkspaceShell, type NavItem } from "./workspace-shell";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@openhr/shared";
import { api, ApiError } from "./api";
const Context = createContext<AuthUser | null>(null);
export const useSession = () => useContext(Context);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    api<AuthUser>("/auth/me")
      .then((u) => {
        if (active) {
          setUser(u);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setUser(null);
          if (e instanceof ApiError && e.status === 401) {
            if (pathname !== "/login") router.replace("/login");
          } else
            setError(e instanceof Error ? e.message : "Unable to load session");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pathname, router]);
  async function logout() {
    try {
      await api("/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": user?.csrfToken ?? "" },
      });
      setUser(null);
      router.replace("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign out");
    }
  }
  if (pathname === "/login") return <>{children}</>;
  if (loading || !user)
    return (
      <main className="mx-auto max-w-lg p-8" aria-live="polite">
        {error ? (
          <>
            <p className="error">{error}</p>
            <button onClick={() => window.location.reload()}>Try again</button>
          </>
        ) : (
          "Loading your workspace…"
        )}
      </main>
    );
  const items: NavItem[] = [
    { href: "/employees", label: "People", icon: "people", group: "People" },
    { href: "/organization", label: "Org chart", icon: "org", group: "People" },
    {
      href: "/onboarding",
      label: "Onboarding",
      icon: "onboarding",
      group: "People",
    },
    {
      href: "/workforce",
      label: "Workforce",
      icon: "workforce",
      group: "People",
    },
    { href: "/time/leave", label: "Leave", icon: "leave", group: "Time" },
    {
      href: "/time/calendar",
      label: "Calendar",
      icon: "calendar",
      group: "Time",
    },
    {
      href: "/time/attendance",
      label: "Attendance",
      icon: "time",
      group: "Time",
    },
    {
      href: "/payroll",
      label: ["HR", "Admin"].includes(user.role) ? "Payroll" : "My payslip",
      icon: "pay",
      group: "Finance",
    },
    { href: "/expenses", label: "Expenses", icon: "expense", group: "Finance" },
  ];
  return (
    <Context.Provider value={user}>
      <WorkspaceShell
        items={items}
        pathname={pathname}
        home="/employees"
        company={user.company.name}
        identity={user.role}
        link={(href, content, attrs) => (
          <Link href={href} {...attrs}>
            {content}
          </Link>
        )}
        tools={
          <button className="hr-tool" onClick={logout}>
            Sign out
          </button>
        }
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {children}
      </WorkspaceShell>
    </Context.Provider>
  );
}
