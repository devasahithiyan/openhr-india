"use client";
import { useState, useEffect } from "react";
import type { OnboardingData, OnboardingAction } from "@openhr/shared";
import { useSession } from "../../components/session";
import { api } from "../../components/api";
import { OnboardingBoard } from "../../components/onboarding-board";
export default function Onboarding() {
  const viewer = useSession(),
    [data, set] = useState<OnboardingData | null>(null),
    [error, fail] = useState(""),
    [busy, lock] = useState(false),
    [reload, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    api<OnboardingData>("/onboarding")
      .then((d) => {
        if (active) {
          set(d);
          fail("");
        }
      })
      .catch((e: Error) => {
        if (active) fail(e.message);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  async function send(action: OnboardingAction) {
    if (!viewer || busy) return false;
    lock(true);
    fail("");
    try {
      await api("/onboarding", {
        method: "POST",
        headers: { "x-csrf-token": viewer.csrfToken },
        body: JSON.stringify(action),
      });
      set(await api<OnboardingData>("/onboarding"));
      return true;
    } catch (e) {
      fail(e instanceof Error ? e.message : "Update failed");
      return false;
    } finally {
      lock(false);
    }
  }
  return (
    <>
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button onClick={() => refresh((n) => n + 1)}>Reload plans</button>
        </div>
      )}
      {viewer && data ? (
        <fieldset disabled={busy}>
          <OnboardingBoard
            data={data}
            viewer={viewer}
            send={send}
            initialEmployee={
              new URLSearchParams(window.location.search).get("employee") ??
              undefined
            }
          />
        </fieldset>
      ) : (
        !error && <p role="status">Loading onboarding…</p>
      )}
    </>
  );
}
