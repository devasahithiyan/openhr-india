# Roadmap

A rough phasing plan. Open an issue to discuss changes.

## Phase 0 — Foundations
- [x] Choose tech stack and architecture (multi-tenant vs single-tenant, database, API style)
- [x] Project setup: linting, tests, CI, Docker-based local dev
- [x] Auth, roles and permissions (Admin, HR, Manager, Employee)

## Phase 1 — Core HR
- [x] Company, branches (with state), departments, designations
- [ ] Employee master and documents (employee master implemented; document uploads pending)
- [ ] Employee self-service portal

## Phase 2 — Attendance & Leave
- [x] Leave requests, approvals, withdrawals, annual opening balances and decision history
- [ ] Accrual and carry-forward
- [x] Branch workweeks, holidays and team absence calendar
- [ ] Shared state holiday templates
- [x] Daily attendance and manager-reviewed corrections
- [ ] Shift scheduling

## Phase 3 — Payroll & Compliance
- [x] Effective-dated monthly salary structures and components
- [x] Historical Tamil Nadu pilot: monthly register, approved LOP, locked payslips and standard capped employee PF
- [ ] Arrears and payroll corrections after close
- [ ] Broader PF coverage and automated ESI, Professional Tax and LWF
- [ ] TDS (old and new regimes), investment declarations, Form 16
- [ ] ECR, challans and bank transfer files

## Phase 4 — Beyond
- [ ] Onboarding/offboarding, F&F settlement, gratuity
- [x] Itemized expense claims, review, resubmission and reimbursement tracking
- [ ] Reports and analytics
- [ ] Indian language support, mobile app, integrations
