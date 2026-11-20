"use client";
import { useState, type FormEvent } from "react";
import { api } from "../../components/api";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      window.location.assign("/employees");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-entry">
      <div className="mb-5">
        <p className="auth-brand text-2xl font-bold text-indigo-deep">
          OpenHR India
        </p>
      </div>
      <section className="panel">
        <h1 className="mb-2 text-3xl font-bold">Sign in</h1>
        <p className="mb-6 text-muted">
          Use your company workspace and work email.
        </p>
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <label htmlFor="companySlug">
            Company workspace
            <input
              id="companySlug"
              name="companySlug"
              autoComplete="organization"
              required
              maxLength={80}
              placeholder="your-company"
            />
          </label>
          <label htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <button className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
      <p className="mt-6 text-sm text-muted">
        Need access or a password reset? Contact your workspace administrator.
      </p>
    </main>
  );
}
