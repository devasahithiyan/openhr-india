import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEMO_EMPLOYEE_ID,
  EMPLOYEES,
  INITIAL_FILINGS,
  INITIAL_LEAVES,
  type Filing,
  type LeaveRequest,
  type LeaveStatus,
} from "./data";
import type { Declarations, Regime } from "./payroll";

export type PayrollStage = "review" | "calculated" | "approved" | "paid";

interface DemoState {
  leaves: LeaveRequest[];
  filings: Filing[];
  payrollStage: PayrollStage;
  myRegime: Regime;
  myDeclarations: Declarations;
}

interface DemoStore extends DemoState {
  applyLeave: (l: Omit<LeaveRequest, "id" | "status" | "appliedOn" | "employeeId">) => void;
  setLeaveStatus: (id: string, status: LeaveStatus) => void;
  setPayrollStage: (s: PayrollStage) => void;
  markFiled: (id: string) => void;
  setMyTax: (regime: Regime, decl: Declarations) => void;
  reset: () => void;
}

const KEY = "openhr-demo-v1";
const me = EMPLOYEES.find((e) => e.id === DEMO_EMPLOYEE_ID)!;

const initial = (): DemoState => ({
  leaves: INITIAL_LEAVES,
  filings: INITIAL_FILINGS,
  payrollStage: "review",
  myRegime: me.regime,
  myDeclarations: me.declarations,
});

function load(): DemoState {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return { ...initial(), ...JSON.parse(s) };
  } catch {
    /* storage unavailable: fall back to defaults */
  }
  return initial();
}

const Ctx = createContext<DemoStore | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const store: DemoStore = {
    ...state,
    applyLeave: (l) =>
      setState((s) => ({
        ...s,
        leaves: [
          { ...l, id: `l${Date.now()}`, employeeId: DEMO_EMPLOYEE_ID, status: "Pending", appliedOn: "2026-11-19" },
          ...s.leaves,
        ],
      })),
    setLeaveStatus: (id, status) =>
      setState((s) => ({ ...s, leaves: s.leaves.map((l) => (l.id === id ? { ...l, status } : l)) })),
    setPayrollStage: (payrollStage) => setState((s) => ({ ...s, payrollStage })),
    markFiled: (id) =>
      setState((s) => ({ ...s, filings: s.filings.map((f) => (f.id === id ? { ...f, status: "Filed" } : f)) })),
    setMyTax: (myRegime, myDeclarations) => setState((s) => ({ ...s, myRegime, myDeclarations })),
    reset: () => setState(initial()),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDemo must be used inside DemoProvider");
  return c;
}

/** The demo employee with their current tax choices applied. */
export function useMe() {
  const { myRegime, myDeclarations } = useDemo();
  return { ...me, regime: myRegime, declarations: myDeclarations };
}
