import {demoPunchDay,initialWork,type WorkforceState} from "../workforce/adapter";
import {initialOnboarding} from "../onboarding/seed";
import type {OnboardingData} from "../onboarding/model";
import { initialClaims, updateClaims, type Claim, type Action as ExpenseAction, type Role as ExpenseRole } from "./expenses";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  BRANCHES,type Employee,
  DEMO_EMPLOYEE_ID,
  EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_BRANCH_CALENDARS,
  INITIAL_CORRECTIONS,
  INITIAL_FILINGS,
  INITIAL_LEAVES,
  INITIAL_POLICIES,
  type AttendanceEntry,
  type BranchCalendar,
  type Correction,
  type CorrectionStatus,
  type Filing,
  type LeavePolicy,
  type LeaveRequest,
  type LeaveStatus,
} from "./data";
import type { Declarations, Regime } from "./payroll";
import type { Assessment, PublishedRun, SalaryComponent } from "./payrollRun";


export const DEMO_TODAY = "2026-11-19";

interface DemoState {
 workforce:WorkforceState;
  onboarding:OnboardingData;
  claims: Claim[];
  leaves: LeaveRequest[];
  filings: Filing[];
  /** Per-employee salary structures HR has edited; others use the defaults. */
  salaries: Record<string, SalaryComponent[]>;
  /** HR's deduction review per employee, tied to the inputs it was made against. */
  reviews: Record<string, Assessment & { hash: string }>;
  published: PublishedRun | null;
  myRegime: Regime;
  myDeclarations: Declarations;
  policies: LeavePolicy[];
  calendars: Record<string, BranchCalendar>;
  attendance: AttendanceEntry[];
  corrections: Correction[];
}

interface DemoStore extends DemoState {
 saveWork:(next:{workforce:WorkforceState;onboarding:OnboardingData})=>void;
  saveOnboarding:(data:OnboardingData)=>void;
  expense: (role: ExpenseRole, action: ExpenseAction) => void;
  applyLeave: (l: Omit<LeaveRequest, "id" | "status" | "appliedOn" | "employeeId">) => void;
  withdrawLeave: (id: string) => void;
  setLeaveStatus: (id: string, status: LeaveStatus) => void;
  setSalary: (employeeId: string, components: SalaryComponent[]) => void;
  saveReview: (employeeId: string, review: Assessment & { hash: string }) => void;
  publishPayroll: (run: PublishedRun) => void;
  reopenPayroll: () => void;
  markFiled: (id: string) => void;
  setMyTax: (regime: Regime, decl: Declarations) => void;
  addPolicy: (p: Omit<LeavePolicy, "id">) => void;
  setWorkweek: (branch: string, weekdays: number[]) => void;
  addHoliday: (branch: string, day: string, name: string) => void;
  removeHoliday: (branch: string, id: string) => void;
  clock: (time: string) => void;
  requestCorrection: (c: Omit<Correction, "id" | "status" | "appliedOn" | "employeeId">) => void;
  setCorrectionStatus: (id: string, status: CorrectionStatus) => void;
  reset: () => void;
}

// v3 replaces the payroll stages with review-and-publish; older saved state is ignored.
// v4: onboarding now uses Kaveri Textiles staff; older saved state is ignored.
const KEY = "openhr-demo-v4";
const me = EMPLOYEES.find((e) => e.id === DEMO_EMPLOYEE_ID)!;
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const initial = (): DemoState => ({
  workforce:initialWork(),onboarding:initialOnboarding(),
  claims: initialClaims,
  leaves: INITIAL_LEAVES,
  filings: INITIAL_FILINGS,
  salaries: {},
  reviews: {},
  published: null,
  myRegime: me.regime,
  myDeclarations: me.declarations,
  policies: INITIAL_POLICIES,
  calendars: INITIAL_BRANCH_CALENDARS,
  attendance: INITIAL_ATTENDANCE,
  corrections: INITIAL_CORRECTIONS,
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

  const patchCalendar = (branch: string, fn: (c: BranchCalendar) => BranchCalendar) =>
    setState((s) => ({ ...s, calendars: { ...s.calendars, [branch]: fn(s.calendars[branch]) } }));

  const store: DemoStore = {
    ...state,saveWork:next=>setState(s=>({...s,...next,onboarding:{...next.onboarding,people:next.onboarding.people.map(p=>{
 const w=next.workforce.people.find(w=>w.id===p.id);
 return w?{...p,branchId:w.branch.toLowerCase(),departmentId:w.department.toLowerCase(),managerId:w.manager||null}:p;
 })}})),
    saveOnboarding:onboarding=>setState(s=>({...s,onboarding})),
    expense: (role, action) => {
      const id = uid("expense");
      setState((s) => ({ ...s, claims: updateClaims(s.claims, role, action, s.workforce.today, id,s.workforce.people.map(p=>({id:p.id,managerId:p.manager}))) }));
    },
    applyLeave: (l) =>
      setState((s) => ({
        ...s,
        leaves: [{ ...l, id: uid("l"), employeeId: DEMO_EMPLOYEE_ID, status: "Pending", appliedOn: DEMO_TODAY }, ...s.leaves],
      })),
    withdrawLeave: (id) => setState((s) => ({ ...s, leaves: s.leaves.filter((l) => l.id !== id) })),
    setLeaveStatus: (id, status) =>
      setState((s) => ({ ...s, leaves: s.leaves.map((l) => (l.id === id ? { ...l, status } : l)) })),
    setSalary: (id, components) => setState((s) => ({ ...s, salaries: { ...s.salaries, [id]: components } })),
    saveReview: (id, review) => setState((s) => ({ ...s, reviews: { ...s.reviews, [id]: review } })),
    publishPayroll: (published) => setState((s) => ({ ...s, published })),
    reopenPayroll: () => setState((s) => ({ ...s, published: null, reviews: {} })),
    markFiled: (id) =>
      setState((s) => ({ ...s, filings: s.filings.map((f) => (f.id === id ? { ...f, status: "Filed" } : f)) })),
    setMyTax: (myRegime, myDeclarations) => setState((s) => ({ ...s, myRegime, myDeclarations })),
    addPolicy: (p) => setState((s) => ({ ...s, policies: [...s.policies, { ...p, id: uid("p") }] })),
    setWorkweek: (branch, weekdays) => patchCalendar(branch, (c) => ({ ...c, weekdays: [...weekdays].sort() })),
    addHoliday: (branch, day, name) =>
      patchCalendar(branch, (c) => ({
        ...c,
        holidays: [...c.holidays.filter((x) => x.day !== day), { id: uid("h"), day, name }].sort((a, b) =>
          a.day.localeCompare(b.day),
        ),
      })),
    removeHoliday: (branch, id) => patchCalendar(branch, (c) => ({ ...c, holidays: c.holidays.filter((x) => x.id !== id) })),
    clock: (time) =>
      setState((s) => {
        const day=demoPunchDay(s,DEMO_EMPLOYEE_ID,time);
        const open = s.attendance.find((a) => a.employeeId === DEMO_EMPLOYEE_ID && a.day === day);
        if (!open) return { ...s, attendance: [...s.attendance, { employeeId: DEMO_EMPLOYEE_ID, day, checkIn: time }] };
        if (open.checkOut) return s;
        return {
          ...s,
          attendance: s.attendance.map((a) => (a === open ? { ...a, checkOut: day===s.workforce.today && time<a.checkIn?a.checkIn:time } : a)),
        };
      }),
    requestCorrection: (c) =>
      setState((s) => ({
        ...s,
        corrections: [{ ...c, id: uid("c"), employeeId: DEMO_EMPLOYEE_ID, status: "Pending", appliedOn: DEMO_TODAY }, ...s.corrections],
      })),
    setCorrectionStatus: (id, status) =>
      setState((s) => {
        const c = s.corrections.find((x) => x.id === id);
        if (!c) return s;
        // An approved correction replaces that day's punches in the register.
        const attendance =
          status === "Approved"
            ? [
                ...s.attendance.filter((a) => !(a.employeeId === c.employeeId && a.day === c.day)),
                { employeeId: c.employeeId, day: c.day, checkIn: c.checkIn, checkOut: c.checkOut },
              ]
            : s.attendance;
        return { ...s, attendance, corrections: s.corrections.map((x) => (x.id === id ? { ...x, status } : x)) };
      }),
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
  const { myRegime, myDeclarations,workforce } = useDemo();
  const p=workforce.people.find(p=>p.id===me.id);
  return { ...me, ...(p?{branch:p.branch,department:p.department,designation:p.designation,managerId:p.manager||undefined}:{}), regime: myRegime, declarations: myDeclarations };
}

export function useDirectory():Employee[]{
 const {workforce,onboarding}=useDemo();
 return workforce.people.filter(p=>!p.ended).map(p=>{
 const previous=EMPLOYEES.find(e=>e.id===p.id);
 const details=previous??{panMasked:"",aadhaarLast4:"",uan:"",bank:"",accountLast4:"",ifsc:"",monthlyGross:0,regime:"new" as const,declarations:{sec80C:0,sec80D:0},email:onboarding.people.find(e=>e.id===p.id)?.email??""};
 return {...details,...p,state:BRANCHES.find(b=>b.name===p.branch)!.state,managerId:p.manager||undefined};
 });
}
