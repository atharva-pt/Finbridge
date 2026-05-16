# FinBridge

A multi-tenant financial data exchange platform that lets mid-sized businesses send invoices, payments, salary registers, bank statements, and ledgers to their accounting firm — and lets the firm review and accept them with AI doing the data entry.

Built for the FinBridge Hackathon.

## What's inside

- **Three-tier tenancy** — Platform Admin onboards firms, Firm Admin onboards companies + configures payment heads, Company users upload documents.
- **AI extraction with Claude Vision** — Upload an invoice / receipt / bank statement / salary register / ledger as an image or PDF; Claude (`claude-opus-4-5`) auto-extracts structured fields including vendor, GSTIN, line items, amounts, and suggests a payment-head category. Type-aware prompts per document type.
- **Accountant review workflow** — Firm accountants see the extracted record beside the original document, edit any field, categorize under a payment head/sub-head, and accept/reject/request-info. Company users get notified.
- **Industry-aware payment heads** — When a firm onboards a new company, FinBridge auto-seeds the right payment heads/sub-heads based on industry (Technology, Retail, Manufacturing, Services).
- **Reports** — Firm uploads MIS / Balance Sheet / P&L / Cash Flow as files; the company sees them in a download list.
- **Dashboards** — KPI cards with sparklines, transaction volume (area chart), status distribution (donut), activity feed.
- **Notifications** — Bell in topbar with unread badge, created on accept/reject/needs-info.
- **Audit trail** — Every action logged to the `AuditLog` table.
- Dark / light mode, framer-motion animations, Plus Jakarta Sans font.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Prisma 7** with `@prisma/adapter-pg` + PostgreSQL
- **Tailwind CSS v4** (oklch tokens), shadcn/ui, framer-motion, Recharts
- **Anthropic SDK** for Claude Vision extraction
- **JWT auth** via httpOnly cookies; NextAuth wired for Google OAuth
- **Pino** structured logging, Zod request validation, bcrypt password hashing
- **pnpm**

## Setup

### 1. Prereqs

- Node 20+
- pnpm: `npm install -g pnpm`
- PostgreSQL 14+ running locally

### 2. Install

```bash
pnpm install
```

### 3. Environment

Copy `.env.example` to `.env.local` (or create it) and fill in:

```bash
DATABASE_URL="postgresql://<user>@localhost:5433/finbridge"
JWT_SECRET="<any-long-random-string>"
ANTHROPIC_API_KEY="sk-ant-..."        # from https://console.anthropic.com
# Optional — for Google sign-in:
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NEXTAUTH_SECRET="<another-long-random-string>"
NEXTAUTH_URL="http://localhost:3000"
```

> Port 5433 is what we use locally. If your Postgres is on 5432, change `DATABASE_URL` to match.

### 4. Create the database

```bash
createdb finbridge        # or via your favorite Postgres GUI
```

### 5. Migrate + seed

```bash
pnpm tsx --env-file=.env.local node_modules/prisma/build/index.js migrate dev
pnpm tsx --env-file=.env.local prisma/seed.ts
```

The seed creates one accounting firm, two client companies (TechStartup + RetailCo) with industry-templated payment heads, eight transactions across all statuses, three MIS reports, and demo users for every role.

### 6. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo credentials

| Role | Email | Password | Lands on |
|---|---|---|---|
| Platform Admin | `superadmin@finbridge.io` | `Admin@1234` | `/admin` — onboard firms |
| Firm Admin | `admin@sharmaassociates.com` | `Demo@1234` | `/firm` — review dashboard |
| Firm Accountant | `accountant@sharmaassociates.com` | `Demo@1234` | `/firm` — review queue |
| Company Admin | `admin@techstartup.com` | `Demo@1234` | `/company` — upload + reports |
| Company User | `user@techstartup.com` | `Demo@1234` | `/company` — upload |
| Retail Admin | `admin@retailco.in` | `Demo@1234` | `/company` (second tenant) |

## Demo flow (2 minutes)

1. **Sign in as Platform Admin** → see firm overview, onboard a new firm with its first admin in one form.
2. **Sign in as Firm Admin** → onboard a Company (pick industry → payment heads auto-seeded).
3. **Sign in as Company Admin** → upload an invoice image or PDF. Claude extracts in ~5s.
4. **Sign in as Firm Accountant** → open the extracted transaction. Confidence gauge shows AI score; payment head is pre-filled from the AI's suggestion. Edit any field, then Accept.
5. **Back to Company Admin** → notification bell shows "Transaction Accepted." Reports tab shows MIS files uploaded by the firm.

## Project layout

```
app/
  (admin)/        Platform Admin pages
  (firm)/         Firm Admin + Accountant pages
  (company)/      Company Admin + User pages
  (auth)/         Login & register
  api/            Auth, documents, transactions, reports, payment-heads, notifications, admin
components/
  charts/         Recharts wrappers (area, donut, sparkline)
  dashboard/      KPI card, activity feed, confidence gauge
  layout/         Sidebar, topbar, notifications bell, page header
  ui/             shadcn primitives
lib/
  auth.ts                       JWT session + bcrypt
  claude.ts                     Multi-doc-type Claude extraction
  payment-head-templates.ts     Industry → starter payment heads
  prisma.ts                     PrismaClient singleton
  logger.ts                     Pino w/ pino-pretty in dev
prisma/
  schema.prisma                 9 models
  seed.ts                       Demo data + sample files
proxy.ts                        Next 16 proxy (role-based route guard)
```

## Multi-tenant isolation

Every database query is scoped to `firmId` and/or `companyId` from the JWT. The proxy (`proxy.ts`) enforces role-based path access: `PLATFORM_ADMIN → /admin`, firm roles → `/firm`, company roles → `/company`.

## Testing

```bash
pnpm test          # run all tests
pnpm test:watch    # watch mode
```

Tests cover anomaly detection rules, rate limiting logic, and API health contracts using Vitest.

## What's intentionally out of scope (per the brief)

- Zoho/QuickBooks/Tally integration
- Payment gateway
- Advanced reporting engines (we use simple file upload/download)

## Roadmap (what we'd build next)

- Mobile PWA for upload-on-the-go
- Bulk bank statement upload with row-level auto-categorization
- Editable AI extraction prompts per firm (industry-specific rules)
- Read-receipts on report uploads
- Audit log viewer in the admin UI

---

Built with [Claude Code](https://claude.com/claude-code).
