"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
  return (
    <Context.Provider value={user}>
      <header className="workspace-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/employees" className="brand text-xl font-bold">
            OpenHR India
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <span>{user.company.name}</span>
            <span className="rounded bg-indigo-soft px-2 py-1 text-sm text-indigo-deep">
              {user.role}
            </span>
            <button className="secondary" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Workspace" className="workspace-nav">
          {[
            ["/employees", "People"],
            ["/organization", "Org chart"],
            [
              "/payroll",
              user.role === "Admin" || user.role === "HR"
                ? "Payroll"
                : "My payslip",
            ],
            ["/time/leave", "Leave"],
            ["/time/calendar", "Calendar"],
            ["/time/attendance", "Attendance"],
            ["/expenses", "Expenses"],
            ["/onboarding", "Onboarding"],
            ["/workforce", "Workforce"],
          ].map(([href, title]) => (
            <Link
              key={href}
              href={href!}
              aria-current={pathname.startsWith(href!) ? "page" : undefined}
            >
              {title}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {children}
      </main>
    </Context.Provider>
  );
}
