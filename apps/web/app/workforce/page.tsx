"use client";
import { useState, useEffect } from "react";
import { type WorkData, type WorkCommand } from "@openhr/shared";
import { useSession } from "../../components/session";
import { WorkBoard } from "../../components/workforce-board";
import { api } from "../../components/api";
export default function Workforce() {
  const user = useSession(),
    [data, set] = useState<WorkData | null>(null),
    [error, fail] = useState(""),
    [busy, lock] = useState(false),
    [retry, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    api<WorkData>("/workforce")
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
  }, [retry]);
  async function send(c: WorkCommand) {
    if (!user || busy) return false;
    lock(true);
    fail("");
    try {
      await api("/workforce", {
        method: "POST",
        headers: { "x-csrf-token": user.csrfToken },
        body: JSON.stringify(c),
      });
      set(await api<WorkData>("/workforce"));
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
        <p className="error" role="alert">
          {error} <button onClick={() => refresh((n) => n + 1)}>Reload</button>
        </p>
      )}
      {data && user ? (
        <fieldset disabled={busy}>
          <WorkBoard
            data={data}
            viewer={{ ...user, membershipId: user.membershipId }}
            send={send}
          />
        </fieldset>
      ) : (
        !error && <p role="status">Loading workforce operations…</p>
      )}
    </>
  );
}
