# OpenHR India

**An open-source HR and payroll platform built for Indian businesses.**

OpenHR India aims to give startups, SMEs and growing teams a free, self-hostable alternative to commercial HRMS tools, with Indian labour law and statutory compliance built in from day one rather than bolted on.

> 🚧 **Status: early development.** Phase 0 (foundations) is done: sign-in, roles and the employee master work end to end. Leave requests, branch calendars and daily attendance are available. Payroll and compliance are planned. Ideas, issues and contributions are very welcome.

### 👀 Try the demo: [openhr-india.vercel.app](https://openhr-india.vercel.app)

A clickable prototype with sample data showing where the platform is headed:

- **HR admin view:** run monthly payroll (PF, ESI, PT, TDS), approve leave, track statutory filings.
- **Employee view:** view payslips, apply for leave, compare old vs new tax regimes.

The demo is front-end only and lives in [`prototype/`](prototype/). It is separate from the real application below, and its tax and statutory figures are illustrative.

## What works today

The real application (run it yourself with [Getting started](#getting-started)) currently covers:

- **Sign-in and roles:** one login per person, with company-specific roles (Admin, HR, Manager, Employee) checked on the server.
- **Multiple companies:** each company's data is isolated at the database level.
- **Org chart:** search by name or employee code, filter by department, expand or collapse teams and open employee profiles from the workspace navigation. Admin and HR see the company, managers see themselves and their direct reports, and employees see their own record.
- **People:** branches (with state), departments, designations and the employee master. Admin and HR manage records, managers see their direct reports, employees see themselves.
- **Leave and attendance:** configurable annual leave, branch holidays and workweeks, team calendar, daily punches and reviewed corrections.
- **Private identifiers protected:** PAN, bank account, UAN, ESIC and IFSC are encrypted and shown masked. Only Aadhaar's last four digits are stored.

| Part                        | Stack                      | Folder                                       |
| --------------------------- | -------------------------- | -------------------------------------------- |
| Web app                     | Next.js, Tailwind CSS      | [`apps/web`](apps/web)                       |
| API                         | NestJS, Prisma, PostgreSQL | [`apps/api`](apps/api)                       |
| Shared types and validation | Zod                        | [`packages/shared`](packages/shared)         |
| Statutory rules (coming)    | Versioned rule data        | [`packages/compliance`](packages/compliance) |
| Clickable demo              | Vite, React                | [`prototype`](prototype)                     |

Why this stack: [ADR 0001](docs/adr/0001-tech-stack.md). API reference: [docs/API.md](docs/API.md).

## Why

Most open-source HR tools are designed for the US or Europe. Indian companies need things those tools don't handle well:

- Salary structures with Basic, HRA, special allowance and reimbursements
- Statutory deductions: **PF (EPF/EPS)**, **ESI**, **Professional Tax** (state-wise slabs), **LWF**
- **TDS** on salary under both old and new tax regimes, with investment declarations and proof collection
- Statutory filings and forms: ECR for EPFO, ESIC returns, **Form 16**, Form 24Q
- State-specific **Shops & Establishments** rules, holiday calendars and leave policies
- Gratuity, bonus (Payment of Bonus Act) and full-and-final settlement
- New Labour Codes readiness

## Planned modules

| Module                        | Highlights                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| **Core HR**                   | Employee master, org chart, departments, documents (PAN, Aadhaar-masked, bank details) |
| **Onboarding / Offboarding**  | Offer letters, checklists, F&F settlement, relieving & experience letters              |
| **Attendance & Leave**        | Shifts, regularisation, state-wise holiday lists, configurable leave policies          |
| **Payroll**                   | Salary structures, arrears, LOP, payslips, bank transfer files                         |
| **Statutory Compliance**      | PF, ESI, PT, LWF, TDS, Form 16, ECR & challan generation                               |
| **Expenses & Reimbursements** | Claims, approvals, flexible benefit plans                                              |
| **Employee Self-Service**     | Payslips, tax declarations, leave, profile — mobile-friendly                           |
| **Reports**                   | Headcount, attrition, payroll registers, compliance reports                            |

See [docs/ROADMAP.md](docs/ROADMAP.md) for phasing.

## Principles

- **India-first** — compliance rules are first-class, versioned and configurable per state and financial year.
- **Self-hostable** — run it on your own server; your employee data stays with you.
- **Privacy by design** — built with the Digital Personal Data Protection (DPDP) Act, 2023 in mind.
- **Multilingual** — English first, with Indian language support planned.
- **Extensible** — clean APIs and integrations (accounting, banks, biometric devices).

## Getting started

The real app now has a company-isolated Auth + People foundation. Illustrative payroll and tax screens in `prototype/` are still illustrative demos, separate from the real application.

### Run the whole foundation with Docker

Requires Docker Compose v2. Node 22 and pnpm 10.30.1 are needed for development; `node scripts/setup-env.mjs` also works without pnpm to generate the environment file.

```bash
pnpm setup:env                    # generate local .env and encryption key once
# Starts Postgres, applies migrations, builds and starts API + web:
docker compose up --build
# In another terminal, create explicitly fictional demonstration accounts:
docker compose exec -e DEMO_SEED=true api pnpm db:seed
```

Open http://localhost:3000. Demo workspace: `demo`; password: `Demo-only-1234`; emails: `admin@example.test`, `hr@example.test`, `manager@example.test`, `employee@example.test`. These are fictional development credentials. Seeding requires `DEMO_SEED=true` and is disabled when `NODE_ENV=production`. A new installation has no accounts until provisioned or explicitly seeded. `docker compose down` preserves the database volume; never use `down -v` on data you need.

### Develop locally

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm setup:env                    # skip if .env already exists
pnpm db:generate
# Start only the database, then run apps on the host:
docker compose up -d db
pnpm db:migrate
DEMO_SEED=true pnpm db:seed
pnpm dev                         # web :3000, API :3001
```

Existing PostgreSQL works too: point `DATABASE_URL` in `.env` to your database and omit the Docker command. Keep the local web origin exactly `http://localhost:3000`. API rewrites use `API_INTERNAL_URL` at build time (default `http://127.0.0.1:3001` for host development). The Docker build defaults this to `http://api:3001` for Compose; override the Docker build argument if you change the service topology. Next.js does not require access to personal data to build.

Create a company/account through the CLI using a password environment variable (never a command-line argument). In zsh, this prompts without echoing:

```bash
read -rs 'OPENHR_PASSWORD?Password (12+ characters): '; echo
export OPENHR_PASSWORD
pnpm provision account example-company "Example Company" admin@example.test Admin
unset OPENHR_PASSWORD
```

Use Organisation setup inside Add employee to create branches/departments/designations, then save employees. To link another role, repeat provisioning with the same company slug and an Employee or Manager role followed by that person's employee code. Reusing an email across companies requires the identity's existing password; the login is shared and the roles are company-specific. Reprovisioning a membership revokes its sessions. `pnpm provision password email@example.test` changes the identity's password using `OPENHR_PASSWORD` and revokes all its sessions.

### Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
# Create a separate empty PostgreSQL database named openhr_test first.
# Apply migrations to it (existing environment variables override .env):
DATABASE_URL=postgresql://user:password@localhost:5432/openhr_test pnpm db:migrate
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/openhr_test pnpm test:integration
pnpm build
# Browser tests use the local .env database; seed fake demo accounts first:
DEMO_SEED=true pnpm db:seed
pnpm exec playwright install chromium
pnpm test:e2e                 # uses production builds from pnpm build
# The original demo remains independent:
pnpm --dir prototype install --frozen-lockfile --ignore-workspace
pnpm --dir prototype build
pnpm --dir prototype dev
```

Integration tests refuse databases whose names do not end in `_test` and clean up their own generated fixtures. Browser tests create fictional E2E employees in the demo company, so use a development database. CI runs lint, typecheck, unit tests, migrated-Postgres integration tests, production builds and desktop/mobile workflow tests.

See [architecture decision](docs/adr/0001-tech-stack.md) and [REST API contract](docs/API.md). All four roles have server-side access checks; Admin/HR manage employees, Managers read self/direct reports, Employees read self.

### Data handling and self-hosting

PAN, bank account, UAN, ESIC and IFSC values are encrypted with AES-256-GCM, tied to company/employee/field context. Only Aadhaar's final four digits are accepted. Normal readbacks are masked. Blank private fields preserve saved values; Clear removes them. Request bodies, passwords and private identifiers are not logged.

The checked-in Compose setup is local development infrastructure with an explicit development database password. Production requires an operator-selected hosting setup, HTTPS, `NODE_ENV=production`, the exact HTTPS `APP_ORIGIN`, strong database credentials, protected backups and access controls. Keep `DATA_ENCRYPTION_KEY` outside Git and back it up securely: losing it makes encrypted identifiers unreadable. Key rotation, retention/deletion workflows, audit trails, MFA and account invitation/recovery screens remain future work. This foundation does not claim DPDP certification or production payroll compliance.

## Contributing

Contributions from developers, HR professionals, payroll specialists and chartered accountants are all valuable — compliance knowledge matters as much as code. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Disclaimer

OpenHR India is provided as-is. Statutory rates and rules change frequently; always verify calculations and filings with a qualified professional.

## License

[MIT](LICENSE)

### Leave and attendance

After applying migrations, open **Leave**, **Calendar** or **Attendance** in the web workspace. HR can create an annual leave type with an opening balance per employee and configure each branch’s working days and holidays. The fictional demo seed includes an annual policy for the current year.

Employees preview charged working days, submit requests and withdraw pending requests. Pending days reserve balance. Managers can approve or reject direct reports’ requests, and HR can review company requests. The team calendar shows names on approved working days. Daily check-in and check-out use India Standard Time. Employees can request a correction for a missed entry, and approval applies the corrected times to the daily register.
