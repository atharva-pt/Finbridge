# FinBridge — Setup Guide

AI-powered financial data exchange platform for businesses and accounting firms.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1 — Install PostgreSQL](#step-1--install-postgresql)
3. [Step 2 — Open the Project](#step-2--open-the-project)
4. [Step 3 — Install Dependencies](#step-3--install-dependencies)
5. [Step 4 — Configure Environment Variables](#step-4--configure-environment-variables)
6. [Step 5 — Run Database Migrations](#step-5--run-database-migrations)
7. [Step 6 — Seed Demo Data](#step-6--seed-demo-data)
8. [Step 7 — Start the Server](#step-7--start-the-server)
9. [Demo Credentials](#demo-credentials)
10. [Demo Flow](#demo-flow)
11. [Backend Architecture](#backend-architecture)
12. [Database Schema](#database-schema)
13. [API Reference](#api-reference)
14. [AI Pipeline](#ai-pipeline)
15. [Authentication](#authentication)
16. [Multi-Tenant Architecture](#multi-tenant-architecture)
17. [File Storage](#file-storage)
18. [Project Structure](#project-structure)
19. [Common Issues](#common-issues)
20. [Tech Stack](#tech-stack)

---

## Prerequisites

Make sure you have the following installed before starting:

- **Node.js** v18 or later — https://nodejs.org
- **Homebrew** (macOS) — https://brew.sh
- **An Anthropic API key** — https://console.anthropic.com

---

## Step 1 — Install PostgreSQL

If PostgreSQL is not already installed:

```bash
brew install postgresql@16
```

Start the database server:

```bash
brew services start postgresql@16
```

Or run it manually if brew services fails:

```bash
/opt/homebrew/opt/postgresql@16/bin/postgres \
  -D /opt/homebrew/var/postgresql@16 -p 5433
```

> **Note:** This project uses port **5433** to avoid conflicts with any existing PostgreSQL on port 5432.

Create the database:

```bash
/opt/homebrew/opt/postgresql@16/bin/createdb finbridge
```

Verify it's running:

```bash
/opt/homebrew/opt/postgresql@16/bin/pg_isready -p 5433
# Expected: /tmp:5433 - accepting connections
```

---

## Step 2 — Open the Project

```bash
cd ~/Desktop/finbridge
```

---

## Step 3 — Install Dependencies

```bash
npm install
```

This installs both frontend and backend packages including Prisma, bcryptjs, jsonwebtoken, and the Anthropic SDK.

---

## Step 4 — Configure Environment Variables

Two files need configuring. **Only the Anthropic API key requires your input** — everything else is pre-filled.

### `.env` — used by Prisma CLI tools

```env
DATABASE_URL="postgresql://atharvasenpai@localhost:5433/finbridge"
```

> Replace `atharvasenpai` with your Mac username if different. Run `whoami` to check.

### `.env.local` — used by the Next.js server at runtime

```env
DATABASE_URL="postgresql://atharvasenpai@localhost:5433/finbridge"
JWT_SECRET="finbridge-super-secret-jwt-key-change-in-production-2024"
ANTHROPIC_API_KEY="sk-ant-api03-..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Get your Anthropic API key at: https://console.anthropic.com/settings/keys

---

## Step 5 — Run Database Migrations

Creates all tables in PostgreSQL from the Prisma schema:

```bash
npx prisma migrate dev --name init
```

Expected output:

```
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "finbridge" at "localhost:5433"

Applying migration `20260515_init`
Your database is now in sync with your schema.
```

To inspect your database visually after migration:

```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## Step 6 — Seed Demo Data

Populates the database with realistic Indian financial demo data:

```bash
npm run seed
```

Expected output:

```
Seeding database...
Created firm: Sharma & Associates
Created companies: TechStartup Pvt Ltd, RetailCo India Pvt Ltd
Created users

Seed complete! Demo credentials:
-----------------------------------
FIRM ADMIN:       admin@sharmaassociates.com  / Demo@1234
FIRM ACCOUNTANT:  accountant@sharmaassociates.com / Demo@1234
COMPANY ADMIN:    admin@techstartup.com / Demo@1234
COMPANY USER:     user@techstartup.com / Demo@1234
RETAIL ADMIN:     admin@retailco.in / Demo@1234
```

> Running seed again clears all data and re-creates it fresh.

---

## Step 7 — Start the Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

The terminal will show:

```
▲ Next.js 16.x (Turbopack)
- Local: http://localhost:3000
✓ Ready in ~300ms
```

Both the frontend and all backend API routes are served from this single command.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Firm Admin | admin@sharmaassociates.com | Demo@1234 |
| Firm Accountant | accountant@sharmaassociates.com | Demo@1234 |
| Company Admin | admin@techstartup.com | Demo@1234 |
| Company User | user@techstartup.com | Demo@1234 |
| Retail Company Admin | admin@retailco.in | Demo@1234 |

---

## Demo Flow

### As a Business (Company Admin)

1. Go to http://localhost:3000/login
2. Login as `admin@techstartup.com` / `Demo@1234`
3. View the dashboard — pre-seeded invoices and stats are visible
4. Click **Upload Documents** in the sidebar
5. Drag and drop an invoice image (JPG or PNG)
6. Select document type → click **Upload & Extract**
7. Watch the AI extract vendor name, amount, GST, and line items
8. Review extracted fields → click **Submit for Review**

### As an Accountant (Firm)

1. Go to http://localhost:3000/login
2. Login as `accountant@sharmaassociates.com` / `Demo@1234`
3. View the firm dashboard — pending review queue is visible
4. Click **Review Queue** in the sidebar
5. Click any transaction row to open the review page
6. Left panel shows the original document, right panel shows extracted data
7. Check the confidence score gauge — amber means low confidence fields
8. Edit any field inline if needed
9. Click **Accept Transaction** (green) or **Reject** with a reason

---

## Backend Architecture

FinBridge uses **Next.js 15 API Routes** as its backend — there is no separate backend server. All server-side logic lives inside `app/api/` and runs in the same Node.js process as the frontend.

```
Browser → Next.js Server (port 3000)
                ├── Renders React pages (RSC)
                ├── Handles API requests (app/api/*)
                ├── Connects to PostgreSQL via Prisma
                └── Calls Anthropic Claude API
```

### Key backend libraries

| Library | Purpose |
|---|---|
| `@prisma/client` + `@prisma/adapter-pg` | Type-safe PostgreSQL ORM |
| `jsonwebtoken` | JWT signing and verification |
| `bcryptjs` | Password hashing (12 rounds) |
| `@anthropic-ai/sdk` | Claude Vision API for invoice extraction |
| `zod` | Request body validation on all POST routes |

---

## Database Schema

The database has 7 models. All queries are tenant-isolated by `firmId` and `companyId`.

### AccountingFirm

The top-level tenant. Each firm manages multiple companies.

| Column | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| name | String | e.g. "Sharma & Associates" |
| slug | String (unique) | URL-safe identifier |
| email | String | Contact email |
| plan | String | Subscription plan |
| isActive | Boolean | Soft delete flag |

### Company

A business client managed by a firm.

| Column | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| firmId | String (FK) | Parent accounting firm |
| name | String | Company name |
| gstin | String? | GST registration number |
| pan | String? | PAN card number |
| industry | String? | Industry sector |

### User

Platform users with role-based access.

| Column | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| email | String (unique) | Login email |
| passwordHash | String | bcrypt hash |
| role | UserRole (enum) | See roles below |
| firmId | String? | FK to firm (for firm roles) |
| companyId | String? | FK to company (for company roles) |

**Roles:**

```
PLATFORM_ADMIN   → manages the entire platform
FIRM_ADMIN       → manages their accounting firm + companies
FIRM_ACCOUNTANT  → reviews transactions for their firm
COMPANY_ADMIN    → manages their company account
COMPANY_USER     → uploads documents for their company
```

### Document

A file uploaded by a company user.

| Column | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| firmId | String (FK) | Tenant isolation |
| companyId | String (FK) | Tenant isolation |
| uploadedById | String (FK) | User who uploaded |
| originalName | String | Original filename |
| filePath | String | Server path to saved file |
| mimeType | String | image/jpeg, image/png, etc. |
| documentType | DocumentType (enum) | INVOICE, RECEIPT, etc. |
| status | TransactionStatus | PENDING, ACCEPTED, etc. |

### Transaction

The AI-extracted structured data from a document.

| Column | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| documentId | String (FK) | Parent document |
| status | TransactionStatus | Review status |
| vendorName | String? | Extracted vendor |
| vendorGstin | String? | Vendor GST number |
| invoiceNumber | String? | Invoice/receipt number |
| invoiceDate | DateTime? | Date on document |
| amount | Float? | Base amount |
| taxAmount | Float? | Tax amount |
| totalAmount | Float? | Total including tax |
| currency | String | Default: INR |
| lineItems | Json? | Array of line item objects |
| aiExtracted | Boolean | Was Claude used? |
| confidenceScore | Float? | 0.0 to 1.0 |
| rawAiResponse | Json? | Full Claude response |
| reviewNotes | String? | Accountant notes |
| rejectionReason | String? | If rejected |

### AuditLog

Immutable audit trail for all actions.

| Column | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| action | String | e.g. "TRANSACTION_ACCEPTED" |
| description | String | Human-readable log |
| userId | String? | Who performed the action |
| documentId | String? | Related document |
| transactionId | String? | Related transaction |

### Notification

In-app notifications for users.

| Column | Type | Description |
|---|---|---|
| id | String (cuid) | Primary key |
| userId | String (FK) | Recipient |
| title | String | Notification title |
| body | String | Notification body |
| read | Boolean | Read/unread state |

---

## API Reference

All endpoints require a valid `finbridge_token` cookie except `/api/auth/login` and `/api/auth/register`. Every route validates the JWT and enforces tenant isolation.

### Authentication

#### `POST /api/auth/login`

Authenticates a user and sets the session cookie.

**Request body:**
```json
{
  "email": "admin@techstartup.com",
  "password": "Demo@1234"
}
```

**Response:**
```json
{
  "user": {
    "id": "cmp6...",
    "email": "admin@techstartup.com",
    "name": "Arjun Kapoor",
    "role": "COMPANY_ADMIN"
  },
  "redirectUrl": "/company"
}
```

Sets `finbridge_token` as an httpOnly cookie (7-day expiry).

---

#### `POST /api/auth/register`

Creates a new user account.

**Request body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass@123",
  "role": "COMPANY_ADMIN",
  "companyName": "My Company Ltd"
}
```

For `COMPANY_ADMIN` / `COMPANY_USER` roles: creates a new Company and links to a default firm.
For `FIRM_ADMIN` / `FIRM_ACCOUNTANT` roles: creates a new AccountingFirm.

---

#### `GET /api/auth/me`

Returns the current authenticated user with their firm and company.

**Response:**
```json
{
  "user": {
    "id": "cmp6...",
    "email": "...",
    "role": "COMPANY_ADMIN",
    "firm": { "id": "...", "name": "Sharma & Associates" },
    "company": { "id": "...", "name": "TechStartup Pvt Ltd" }
  }
}
```

---

#### `POST /api/auth/logout`

Clears the session cookie. Redirects to `/login`.

---

### Documents

#### `POST /api/documents/upload`

Accepts a multipart form upload, saves the file, calls Claude Vision for extraction, and creates a Transaction record.

**Content-Type:** `multipart/form-data`

**Form fields:**
- `file` — the image or PDF file (max 10MB, JPG/PNG/PDF)
- `documentType` — one of: `INVOICE`, `RECEIPT`, `BANK_STATEMENT`, `SALARY_REGISTER`, `LEDGER`, `OTHER`

**Response:**
```json
{
  "document": {
    "id": "doc123",
    "originalName": "invoice.jpg",
    "documentType": "INVOICE",
    "status": "PENDING"
  },
  "transaction": {
    "id": "txn456",
    "status": "PENDING"
  },
  "extractedData": {
    "vendorName": "Zoho Corporation Pvt Ltd",
    "invoiceNumber": "INV-2024-0987",
    "invoiceDate": "2024-03-15",
    "amount": 85000,
    "taxAmount": 15300,
    "totalAmount": 100300,
    "currency": "INR",
    "confidenceScore": 0.93,
    "lineItems": [...]
  }
}
```

**What happens internally:**
1. File is validated (type + size)
2. Saved to `uploads/{firmId}/{companyId}/{uuid}.jpg`
3. Document record created in DB
4. File sent to Claude Vision with extraction prompt
5. JSON response parsed and stored in Transaction
6. Response returned to client

---

#### `GET /api/documents/[id]/file`

Serves the raw uploaded file (image/PDF) for display in the review UI.

**Auth:** Firm users can access documents belonging to their firm. Company users can only access their own company's documents.

---

#### `GET /api/company/documents`

Returns paginated list of documents for the authenticated company user's company.

**Query params:**
- `status` — filter by status (optional)
- `page` — page number (default: 1)
- `limit` — results per page (default: 20)

**Response:** Array of documents with their associated transaction.

---

### Transactions

#### `GET /api/transactions`

Returns transactions with optional filtering. Firm users see all transactions across their companies. Company users see only their own.

**Query params:**
- `status` — filter by `PENDING`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `NEEDS_INFO`
- `companyId` — filter by specific company (firm users only)

---

#### `GET /api/transactions/[id]`

Returns a single transaction with its document, company, and uploaded-by user.

**Response includes:** all extracted fields, AI confidence score, document metadata, company info.

---

#### `PATCH /api/transactions/[id]`

Updates a transaction. Used by accountants to accept, reject, or update fields.

**Request body (any subset):**
```json
{
  "status": "ACCEPTED",
  "reviewNotes": "Verified with vendor statement",
  "vendorName": "Zoho Corporation Pvt Ltd",
  "totalAmount": 100300,
  "rejectionReason": "Duplicate invoice"
}
```

- Setting `status: "ACCEPTED"` records `acceptedAt` timestamp
- Setting `status: "REJECTED"` requires `rejectionReason`
- Setting `status: "UNDER_REVIEW"` assigns the transaction to the current accountant

---

### Stats

#### `GET /api/company/stats`

Returns dashboard metrics for the authenticated company.

**Response:**
```json
{
  "totalDocuments": 12,
  "pendingReview": 4,
  "accepted": 6,
  "rejected": 2,
  "recentActivity": [...]
}
```

---

#### `GET /api/firm/stats`

Returns dashboard metrics for the authenticated firm.

**Response:**
```json
{
  "pendingCount": 8,
  "underReviewCount": 3,
  "acceptedToday": 5,
  "totalCompanies": 2,
  "pendingQueue": [...]
}
```

---

## AI Pipeline

When a file is uploaded, the following sequence runs server-side:

```
1. File saved to disk
        ↓
2. File read as base64
        ↓
3. Sent to Claude claude-opus-4-5 (Vision)
   with structured extraction prompt
        ↓
4. Claude returns JSON with:
   - vendorName, invoiceNumber, dates
   - amounts, taxAmount, totalAmount
   - lineItems array
   - bankDetails
   - confidenceScore (0.0 – 1.0)
   - extractionNotes (low-confidence warnings)
        ↓
5. JSON stored in Transaction record
        ↓
6. Returned to client for display
```

**Confidence score interpretation:**

| Score | Meaning | UI treatment |
|---|---|---|
| 0.90 – 1.00 | High confidence | Green badge |
| 0.65 – 0.89 | Medium confidence | Amber badge |
| Below 0.65 | Low confidence | Red badge + field warnings |

The extraction prompt instructs Claude to:
- Return only valid JSON (no prose)
- Use `null` for fields not found
- Output dates as `YYYY-MM-DD`
- Output all monetary values as plain numbers (no `₹` symbols)
- Set `confidenceScore` based on document clarity

The AI module is in `lib/claude.ts`. Supported input types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.

---

## Authentication

Authentication uses **JWT stored in an httpOnly cookie**.

### Flow

```
1. User submits email + password to POST /api/auth/login
2. Server verifies password with bcrypt
3. Server signs JWT containing:
   { userId, email, role, firmId, companyId, name }
4. JWT set as httpOnly cookie (7-day expiry)
5. All subsequent requests carry the cookie automatically
6. Each API route calls getSession() to verify the JWT
```

### Session helper

In server components and API routes:

```typescript
import { getSession } from "@/lib/auth";

const session = await getSession();
// Returns: { userId, email, role, firmId, companyId, name } | null
```

### Route protection

`proxy.ts` (Next.js 16 middleware) intercepts every non-public request:
- If no valid cookie → redirect to `/login`
- If wrong role for the route → redirect to correct dashboard
- Public paths: `/`, `/login`, `/register`, `/api/auth/*`

---

## Multi-Tenant Architecture

Every database query is scoped by `firmId` and/or `companyId` from the JWT payload. This prevents data leakage between tenants.

**Firm-level isolation:**
```typescript
// Firm users see all their companies' documents
const docs = await prisma.document.findMany({
  where: { firmId: session.firmId }
});
```

**Company-level isolation:**
```typescript
// Company users see only their own company's documents
const docs = await prisma.document.findMany({
  where: {
    firmId: session.firmId,
    companyId: session.companyId   // ← extra scope
  }
});
```

**Role hierarchy:**

```
PLATFORM_ADMIN
    └── AccountingFirm
            ├── FIRM_ADMIN
            ├── FIRM_ACCOUNTANT
            └── Company
                    ├── COMPANY_ADMIN
                    └── COMPANY_USER
```

---

## File Storage

Uploaded files are stored on the local filesystem during development.

**Path structure:**
```
uploads/
└── {firmId}/
    └── {companyId}/
        └── {uuid}.jpg
```

Files are served via `GET /api/documents/[id]/file`, which reads the file from disk and streams it to the client with the correct `Content-Type` header. Access is JWT-protected and tenant-scoped.

> For production, replace the local file write in `app/api/documents/upload/route.ts` with an S3/Cloudflare R2 upload.

---

## Project Structure

```
finbridge/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx           # Auth layout (centered, dark bg)
│   │   ├── login/page.tsx       # Login form (split-panel design)
│   │   └── register/page.tsx    # Registration form
│   │
│   ├── (company)/
│   │   ├── layout.tsx           # Company layout (sidebar + main)
│   │   └── company/
│   │       ├── page.tsx         # Company dashboard
│   │       ├── upload/page.tsx  # AI upload + extraction UI
│   │       └── transactions/
│   │           └── page.tsx     # Transaction list
│   │
│   ├── (firm)/
│   │   ├── layout.tsx           # Firm layout (sidebar + main)
│   │   └── firm/
│   │       ├── page.tsx         # Firm dashboard
│   │       └── transactions/
│   │           ├── page.tsx     # Review queue
│   │           └── [id]/
│   │               └── page.tsx # Transaction review (split-panel)
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts   # POST — login, set cookie
│   │   │   ├── logout/route.ts  # POST — clear cookie
│   │   │   ├── me/route.ts      # GET — current user
│   │   │   └── register/route.ts# POST — create account
│   │   ├── company/
│   │   │   ├── stats/route.ts   # GET — dashboard metrics
│   │   │   └── documents/route.ts# GET — paginated docs
│   │   ├── documents/
│   │   │   ├── upload/route.ts  # POST — upload + AI extract
│   │   │   └── [id]/file/route.ts# GET — serve raw file
│   │   ├── firm/
│   │   │   └── stats/route.ts   # GET — firm dashboard metrics
│   │   └── transactions/
│   │       ├── route.ts         # GET — list transactions
│   │       └── [id]/route.ts    # GET/PATCH — single transaction
│   │
│   ├── globals.css              # Design tokens, custom utilities
│   ├── layout.tsx               # Root layout (fonts, providers)
│   └── page.tsx                 # Landing page / role redirect
│
├── components/
│   ├── landing/
│   │   └── landing-page.tsx     # Marketing landing page
│   ├── layout/
│   │   ├── app-sidebar.tsx      # Collapsible sidebar navigation
│   │   └── page-header.tsx      # Page title + breadcrumb + actions
│   └── ui/
│       ├── stat-card.tsx        # Metric card with trend indicator
│       ├── status-badge.tsx     # Colored status chip
│       └── ...                  # shadcn/ui components
│
├── lib/
│   ├── auth.ts                  # JWT sign/verify, getSession(), cookie helpers
│   ├── claude.ts                # Anthropic SDK, extraction prompt, response parser
│   ├── prisma.ts                # PrismaClient singleton (pg adapter)
│   ├── store.ts                 # Zustand global state (sidebar, user)
│   └── utils.ts                 # cn() class merger
│
├── prisma/
│   ├── schema.prisma            # Database schema (7 models)
│   ├── seed.ts                  # Demo data seeder
│   └── migrations/              # SQL migration history
│
├── uploads/                     # Runtime file storage (git-ignored)
├── .env                         # Prisma CLI environment
├── .env.local                   # Next.js runtime environment
├── prisma.config.ts             # Prisma v7 config with dotenv
└── proxy.ts                     # Next.js 16 auth middleware
```

---

## Common Issues

### "Authentication failed against database server"

PostgreSQL is either not running or the username/port is wrong.

```bash
# Check if postgres is running on port 5433
/opt/homebrew/opt/postgresql@16/bin/pg_isready -p 5433

# If not, start it manually
/opt/homebrew/opt/postgresql@16/bin/postgres \
  -D /opt/homebrew/var/postgresql@16 -p 5433 &

# Verify your username
whoami
```

Update both `.env` and `.env.local`:
```
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5433/finbridge"
```

---

### "AI extraction failed" or blank extraction result

The `ANTHROPIC_API_KEY` in `.env.local` is missing or invalid.

```bash
# Verify the key is set
grep ANTHROPIC_API_KEY .env.local
```

Get a valid key at https://console.anthropic.com/settings/keys

---

### Port 3000 already in use

```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

---

### Prisma schema out of sync

If you modify `prisma/schema.prisma`, re-run the migration:

```bash
npx prisma migrate dev --name describe_your_change
npx prisma generate
```

---

### Re-seed / reset demo data

```bash
npm run seed
```

The seed script deletes all records and re-inserts fresh demo data.

---

### View the database visually

```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | Frontend + API routes |
| Language | TypeScript | Full type safety |
| Styling | Tailwind CSS + shadcn/ui | Component system |
| Animation | Framer Motion | Page and element transitions |
| Database | PostgreSQL 16 | Primary data store |
| ORM | Prisma 7 (pg adapter) | Type-safe DB queries |
| Auth | JWT + httpOnly cookies | Session management |
| Password | bcryptjs (12 rounds) | Password hashing |
| AI | Claude claude-opus-4-5 Vision | Invoice extraction |
| Validation | Zod | API request validation |
| State | Zustand | Client-side global state |
| Server state | TanStack Query | API caching + refetch |
| Forms | React Hook Form + Zod | Form validation |
| File upload | react-dropzone | Drag-and-drop UI |
| Dates | date-fns | Date formatting |
| Notifications | Sonner | Toast notifications |
