// Sample data for the demo. Every person, PAN, UAN and account here is fictional.

import type { Declarations, Regime } from "./payroll";

export type IndianState = "Tamil Nadu" | "Karnataka" | "Maharashtra";

export interface Employee {
  id: string;
  code: string;
  name: string;
  designation: string;
  department: string;
  branch: string;
  state: IndianState;
  joined: string; // ISO date
  monthlyGross: number;
  panMasked: string;
  aadhaarLast4: string;
  uan: string;
  bank: string;
  accountLast4: string;
  ifsc: string;
  regime: Regime;
  declarations: Declarations;
  managerId?: string;
  email: string;
}

export const COMPANY = {
  name: "Kaveri Textiles Pvt Ltd",
  short: "Kaveri Textiles",
  address: "SIDCO Industrial Estate, Kurichi, Coimbatore, Tamil Nadu 641021",
  pfCode: "TNCBE0012345000",
  tan: "CHEK01234A",
};

export const BRANCHES: { name: string; state: IndianState }[] = [
  { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Bengaluru", state: "Karnataka" },
  { name: "Pune", state: "Maharashtra" },
];

/** The demo is frozen on this date so numbers stay consistent. */
export const TODAY = new Date("2026-11-19T10:00:00+05:30");
export const PAYROLL_MONTH = { label: "November 2026", month: 11, year: 2026 };

const d = (sec80C = 0, sec80D = 0): Declarations => ({ sec80C, sec80D });

export const EMPLOYEES: Employee[] = [
  { id: "e1", code: "KT001", name: "Meenakshi Sundaram", designation: "HR Manager", department: "People", branch: "Coimbatore", state: "Tamil Nadu", joined: "2019-04-01", monthlyGross: 118000, panMasked: "XXXXX4821K", aadhaarLast4: "3390", uan: "1009XXXX4410", bank: "Indian Bank", accountLast4: "7712", ifsc: "IDIB000K031", regime: "old", declarations: d(150000, 25000), email: "meenakshi@kaveri.example" },
  { id: "e2", code: "KT002", name: "Arjun Venkatesh", designation: "Head of Operations", department: "Operations", branch: "Coimbatore", state: "Tamil Nadu", joined: "2018-07-16", monthlyGross: 210000, panMasked: "XXXXX1187P", aadhaarLast4: "5521", uan: "1009XXXX2231", bank: "HDFC Bank", accountLast4: "0045", ifsc: "HDFC0001234", regime: "new", declarations: d(150000, 25000), email: "arjun@kaveri.example" },
  { id: "e3", code: "KT014", name: "Priya Raman", designation: "Senior Textile Designer", department: "Design", branch: "Coimbatore", state: "Tamil Nadu", joined: "2021-02-08", monthlyGross: 86000, panMasked: "XXXXX6402R", aadhaarLast4: "8817", uan: "1012XXXX5678", bank: "State Bank of India", accountLast4: "3301", ifsc: "SBIN0000867", regime: "new", declarations: d(90000, 18000), managerId: "e2", email: "priya@kaveri.example" },
  { id: "e4", code: "KT021", name: "Karthik Subramanian", designation: "Loom Supervisor", department: "Production", branch: "Coimbatore", state: "Tamil Nadu", joined: "2020-11-02", monthlyGross: 42000, panMasked: "XXXXX9054S", aadhaarLast4: "1204", uan: "1011XXXX9081", bank: "Canara Bank", accountLast4: "6650", ifsc: "CNRB0001502", regime: "new", declarations: d(), managerId: "e2", email: "karthik@kaveri.example" },
  { id: "e5", code: "KT033", name: "Selvi Murugan", designation: "Quality Inspector", department: "Production", branch: "Coimbatore", state: "Tamil Nadu", joined: "2023-06-12", monthlyGross: 19500, panMasked: "XXXXX2276M", aadhaarLast4: "4478", uan: "1014XXXX3312", bank: "Indian Overseas Bank", accountLast4: "2218", ifsc: "IOBA0000415", regime: "new", declarations: d(), managerId: "e4", email: "selvi@kaveri.example" },
  { id: "e6", code: "KT034", name: "Ganesh Pandian", designation: "Machine Operator", department: "Production", branch: "Coimbatore", state: "Tamil Nadu", joined: "2024-01-15", monthlyGross: 17800, panMasked: "XXXXX7731G", aadhaarLast4: "9902", uan: "1015XXXX0047", bank: "Canara Bank", accountLast4: "1189", ifsc: "CNRB0001502", regime: "new", declarations: d(), managerId: "e4", email: "ganesh@kaveri.example" },
  { id: "e7", code: "KT035", name: "Lakshmi Narayanan", designation: "Machine Operator", department: "Production", branch: "Coimbatore", state: "Tamil Nadu", joined: "2024-03-04", monthlyGross: 16500, panMasked: "XXXXX3318L", aadhaarLast4: "6643", uan: "1015XXXX0112", bank: "State Bank of India", accountLast4: "8875", ifsc: "SBIN0000867", regime: "new", declarations: d(), managerId: "e4", email: "lakshmi@kaveri.example" },
  { id: "e8", code: "KT040", name: "Rohan Deshmukh", designation: "Sales Manager, West", department: "Sales", branch: "Pune", state: "Maharashtra", joined: "2022-08-22", monthlyGross: 135000, panMasked: "XXXXX5590D", aadhaarLast4: "2207", uan: "1013XXXX7720", bank: "Axis Bank", accountLast4: "4426", ifsc: "UTIB0000123", regime: "new", declarations: d(150000, 0), managerId: "e2", email: "rohan@kaveri.example" },
  { id: "e9", code: "KT041", name: "Sneha Kulkarni", designation: "Sales Executive", department: "Sales", branch: "Pune", state: "Maharashtra", joined: "2025-01-06", monthlyGross: 38000, panMasked: "XXXXX8812K", aadhaarLast4: "7356", uan: "1016XXXX2290", bank: "Bank of Maharashtra", accountLast4: "9034", ifsc: "MAHB0000456", regime: "new", declarations: d(), managerId: "e8", email: "sneha@kaveri.example" },
  { id: "e10", code: "KT042", name: "Aditya Joshi", designation: "Warehouse Associate", department: "Logistics", branch: "Pune", state: "Maharashtra", joined: "2025-05-19", monthlyGross: 20500, panMasked: "XXXXX4407J", aadhaarLast4: "1180", uan: "1016XXXX5521", bank: "Bank of Maharashtra", accountLast4: "3367", ifsc: "MAHB0000456", regime: "new", declarations: d(), managerId: "e8", email: "aditya@kaveri.example" },
  { id: "e11", code: "KT050", name: "Divya Hegde", designation: "E-commerce Lead", department: "Digital", branch: "Bengaluru", state: "Karnataka", joined: "2022-03-14", monthlyGross: 148000, panMasked: "XXXXX2219H", aadhaarLast4: "5093", uan: "1013XXXX1105", bank: "ICICI Bank", accountLast4: "7781", ifsc: "ICIC0000789", regime: "new", declarations: d(150000, 25000), managerId: "e2", email: "divya@kaveri.example" },
  { id: "e12", code: "KT051", name: "Mohammed Irfan", designation: "Full-stack Developer", department: "Digital", branch: "Bengaluru", state: "Karnataka", joined: "2023-09-01", monthlyGross: 112000, panMasked: "XXXXX6634I", aadhaarLast4: "2846", uan: "1014XXXX8834", bank: "Kotak Mahindra Bank", accountLast4: "5502", ifsc: "KKBK0000555", regime: "new", declarations: d(60000, 12000), managerId: "e11", email: "irfan@kaveri.example" },
  { id: "e13", code: "KT052", name: "Ananya Rao", designation: "Content Designer", department: "Digital", branch: "Bengaluru", state: "Karnataka", joined: "2024-07-08", monthlyGross: 64000, panMasked: "XXXXX9920A", aadhaarLast4: "6619", uan: "1015XXXX6670", bank: "Canara Bank", accountLast4: "2290", ifsc: "CNRB0000999", regime: "new", declarations: d(), managerId: "e11", email: "ananya@kaveri.example" },
  { id: "e14", code: "KT053", name: "Vikram Gowda", designation: "Customer Support Associate", department: "Digital", branch: "Bengaluru", state: "Karnataka", joined: "2025-10-13", monthlyGross: 21000, panMasked: "XXXXX1043V", aadhaarLast4: "3725", uan: "1017XXXX0019", bank: "State Bank of India", accountLast4: "6604", ifsc: "SBIN0040123", regime: "new", declarations: d(), managerId: "e11", email: "vikram@kaveri.example" },
];

/** The employee the "employee view" logs in as. */
export const DEMO_EMPLOYEE_ID = "e3";

export type LeaveType = "Casual" | "Sick" | "Earned";
export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
}

export const INITIAL_LEAVES: LeaveRequest[] = [
  { id: "l1", employeeId: "e9", type: "Casual", from: "2026-11-24", to: "2026-11-25", days: 2, reason: "Cousin's wedding in Nashik", status: "Pending", appliedOn: "2026-11-17" },
  { id: "l2", employeeId: "e6", type: "Sick", from: "2026-11-18", to: "2026-11-19", days: 2, reason: "Viral fever", status: "Pending", appliedOn: "2026-11-18" },
  { id: "l3", employeeId: "e12", type: "Earned", from: "2026-12-21", to: "2026-12-31", days: 9, reason: "Year-end trip home to Kozhikode", status: "Pending", appliedOn: "2026-11-12" },
  { id: "l4", employeeId: "e13", type: "Casual", from: "2026-11-19", to: "2026-11-19", days: 1, reason: "Passport appointment", status: "Approved", appliedOn: "2026-11-10" },
  { id: "l5", employeeId: "e3", type: "Earned", from: "2026-10-19", to: "2026-10-23", days: 5, reason: "Deepavali at home in Madurai", status: "Approved", appliedOn: "2026-09-28" },
];

export const LEAVE_ENTITLEMENT: Record<LeaveType, number> = { Casual: 12, Sick: 12, Earned: 18 };

export interface Holiday {
  date: string;
  name: string;
  states: IndianState[] | "All";
}

export const HOLIDAYS: Holiday[] = [
  { date: "2026-12-25", name: "Christmas", states: "All" },
  { date: "2027-01-01", name: "New Year's Day", states: "All" },
  { date: "2027-01-15", name: "Thai Pongal", states: ["Tamil Nadu"] },
  { date: "2027-01-15", name: "Makar Sankranti", states: ["Karnataka", "Maharashtra"] },
  { date: "2027-01-16", name: "Thiruvalluvar Day", states: ["Tamil Nadu"] },
  { date: "2027-01-26", name: "Republic Day", states: "All" },
];

export interface Filing {
  id: string;
  name: string;
  detail: string;
  due: string;
  status: "Due" | "Filed" | "Overdue";
}

export const INITIAL_FILINGS: Filing[] = [
  { id: "f1", name: "TDS deposit for October", detail: "Challan ITNS 281, salaries under Section 192", due: "2026-11-07", status: "Filed" },
  { id: "f2", name: "PF ECR and payment for October", detail: "EPFO Unified Portal, employee and employer share", due: "2026-11-15", status: "Filed" },
  { id: "f3", name: "ESI contribution for October", detail: "ESIC portal, 0.75% employee and 3.25% employer", due: "2026-11-15", status: "Filed" },
  { id: "f4", name: "Professional Tax, Maharashtra", detail: "Monthly return for the Pune branch", due: "2026-11-30", status: "Due" },
  { id: "f5", name: "TDS deposit for November", detail: "Challan ITNS 281", due: "2026-12-07", status: "Due" },
  { id: "f6", name: "PF ECR and payment for November", detail: "EPFO Unified Portal", due: "2026-12-15", status: "Due" },
  { id: "f7", name: "ESI contribution for November", detail: "ESIC portal", due: "2026-12-15", status: "Due" },
  { id: "f8", name: "Form 24Q, quarter 3", detail: "Quarterly TDS return on salaries", due: "2027-01-31", status: "Due" },
];
