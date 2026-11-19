# ADR 0001: TypeScript foundation and company isolation

Date: 2026-11-19 · Status: Accepted

## Decision

Use pnpm workspaces, NestJS REST API, PostgreSQL 17 with Prisma 6, Next.js App Router and Tailwind 4.1. Use shared Zod schemas, Vitest unit/API integration tests and Playwright workflow tests. Pin dependency resolution in a workspace lockfile; use Node 22 LTS in containers and CI. The existing Vite prototype stays standalone, preserving its Vercel deployment and visual identity.

One database holds multiple companies. Every tenant-owned record has company_id, repository queries require an authenticated company context, and composite foreign keys reject cross-company references. Global User records have company Memberships with separate roles. Login requires company slug plus email/password. There is no public registration or implicit default company; provisioning is a local CLI operation.

Use Argon2id passwords and opaque random session cookies; store only session token hashes in PostgreSQL. Sessions bind a membership, expire after eight hours, and are revoked on logout/password changes. Read current membership role on each request. Require same-origin checks plus a synchronizer CSRF token for authenticated mutations. Use HTTP-only, SameSite=Lax cookies (Secure in production). Admin/HR write employee records; Managers read themselves and direct reports; Employees read themselves. Managers cannot see others' private identifiers. No role can cross a company boundary.

Encrypt PAN, bank account, UAN and ESIC using AES-256-GCM with contextual additional authenticated data and a deployment key. API responses mask identifiers; full values are write-only in this slice. Aadhaar input accepts exactly four digits and stores only those four. Never log request bodies, credentials or sensitive identifiers. Separate personal information from directory records. Production operators must preserve encryption keys and database backups; this foundation does not claim legal certification.

## Reasons and consequences

A single language and shared validation reduce contributor friction. Nest provides explicit modules and guards; Prisma supplies reviewed SQL migrations; Postgres constraints supplement application tenant checks. Sessions allow immediate revocation without Redis or JWT refresh complexity. Company isolation is not dependent on URL parameters supplied by a client. PostgreSQL RLS is deferred; all tenant operations must stay within the repository boundary and isolation tests are mandatory.

Next.js follows the requested default and leaves server rendering available for later modules, while the prototype remains a design reference. No hosting or paid service is selected. Compliance remains empty until sourced, effective-dated rules and calculation tests are ready; prototype arithmetic is not production compliance logic. Future payroll must snapshot approved inputs, rule versions and outputs rather than recalculate historical payslips.
