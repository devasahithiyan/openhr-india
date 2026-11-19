# Auth and People API

All routes are under `/api`. The web app forwards `/api/*` to Nest on the same origin. Tenant context comes from the session membership, never a request's `companyId`. Responses are `Cache-Control: no-store`. No public signup or company-switching UI exists yet; sign out and use the other workspace slug.

| Method | Route                      | Access / behaviour                                                                                      |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/health`                  | Process liveness, no personal data                                                                      |
| POST   | `/auth/login`              | `{companySlug,email,password}`; same-origin required; sets HTTP-only session cookie, returns CSRF token |
| GET    | `/auth/me`                 | Current email, role, employee linkage, company and CSRF token                                           |
| POST   | `/auth/logout`             | Revokes session and clears cookie; returns 204                                                          |
| GET    | `/employees?q=&page=1`     | Scoped search; `{items,total,page,pageSize:25}`                                                         |
| GET    | `/employees/:id`           | Scoped employee detail; inaccessible IDs return 404                                                     |
| POST   | `/employees`               | Admin/HR only; validated employee input                                                                 |
| PATCH  | `/employees/:id`           | Admin/HR only; partial update                                                                           |
| GET    | `/references`              | Company's branches, departments, designations and visible manager candidates                            |
| POST   | `/references/branches`     | Admin/HR; `{name,state}` (state is full Indian state/UT name)                                           |
| POST   | `/references/departments`  | Admin/HR; `{name}`                                                                                      |
| POST   | `/references/designations` | Admin/HR; `{name}`                                                                                      |

Authenticated writes require the exact configured `Origin` plus `X-CSRF-Token` from `/auth/me`. API cookies expire after eight hours. Role changes apply on the next request; CLI membership/password changes revoke affected sessions. The process-local login throttle caps failed attempts per IP and per company/email window (10 per 15 minutes); use a shared reverse-proxy rate limit before horizontally scaling. Do not configure proxy trust without validating the proxy chain.

Employee input requires code, name, ISO date of joining, branchId, departmentId and designationId. managerId is optional/null. Optional private fields: pan (structural PAN validation), aadhaarLast4 (exactly four digits), uan (12 digits), esic (10 digits), bankAccount (9–18 digits), ifsc (structural IFSC validation). Format checks are not government or bank verification. Unknown fields, including companyId, are rejected. Manager relationships cannot cross companies or form cycles.

Private values are write-only. Admin/HR and the employee themselves receive masked private fields; Managers receive no private fields for direct reports. Omitting a private field on PATCH preserves it; explicit null clears it. The UI's blank private fields preserve existing values and its Clear checkboxes send null. Never send a displayed mask as an input value. Non-HR users cannot edit employee records in this slice.

Errors use `{message,fields?:[{path,message}]}`. Validation returns 400, unauthenticated 401, forbidden 403, unavailable records 404 and duplicate or concurrent writes 409. Database errors and request values are never serialized or logged.

## Leave and attendance

Authenticated `GET /api/time` returns company policies, branch schedules, visible requests, attendance and corrections. Use `?section=calendar` for approved absences without reasons or correction details. Employees see themselves, Managers also see direct reports, and Admin/HR see company records.

`POST /api/time` accepts the discriminated `TimeAction` contract in packages/shared/src/time.ts and requires the session CSRF token. Admin/HR actions are type, week, holiday and removeHoliday. Linked employees can apply, withdraw, clock and correct. Reviewers use leaveDecision and correctionDecision. Self-approval is forbidden. Branch schedules default to Monday–Friday and HR can change them. Approved and pending requests retain their original working-day snapshot. Annual opening allocations are per leave type and calendar year. Corrections cover one India-local day and replace its punches only after approval.

### Monthly payroll pilot

All requests use the existing session and company scope. Writes require Origin and CSRF validation. Monetary values are integer paise.

- `GET /api/payroll?month=2025-03` returns the register and preview fingerprint for HR/Admin. Employees and managers receive only their own published slip. The API returns an empty list for unpublished personal periods.
- `POST /api/payroll` with action `salary` takes an employeeId, an effective YYYY-MM-DD date and components with name, monthly paise and pfWage. A new date adds a revision. Resaving the same date replaces that revision.
- Action `review` takes employeeId, month, the employee preview hash and an assessment with esi, pt, lwf, tds, a worksheet reference and standardCappedPF set to true. This records the reviewer's membership. A changed pay calculation or attendance exception list requires a fresh review.
- Admin action `publish` takes month and the register hash. An incomplete or stale draft returns 409. Publication atomically stores one snapshot per employee. A repeated publication returns the closed register.

### Expense claims

`GET /api/expenses` returns visible claims, itemized amounts in paise, status history and allowed actions. HR and Admin also receive the company total approved and awaiting reimbursement. Managers can see their own claims and direct reports’ claims. Employees see their own.

`POST /api/expenses` takes an action. Submit accepts one to forty items (date in `day`, category, integer `paise` and business purpose). Resubmit takes corrected items. Approve and return operate on submitted claims and return requires a reason. Reimburse takes the actual payment day and a reference. Every action after submission includes the claim ID and the last seen revision. A stale update returns 409. Repeating a completed payment with the same date and reference returns the existing claim ID.
