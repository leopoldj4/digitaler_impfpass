# VaxCheck — Digitaler Impfpass

> A two-surface vaccination passport platform: a patient-facing mobile app for managing and sharing immunisation records, and a practice-facing web application for AI-assisted document extraction, clinical review, and digital signing.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Screenshots / Demo](#screenshots--demo)
- [API Documentation](#api-documentation)
- [AI / LLM Features](#ai--llm-features)
- [Deployment](#deployment)
- [Challenges & Learnings](#challenges--learnings)
- [Future Improvements](#future-improvements)
- [Contributors](#contributors)
- [License](#license)

---

## Problem Statement

Paper vaccination booklets are fragile, easy to lose, and slow to process. When a patient visits a practice, staff must manually transcribe handwritten entries — a process that is error-prone, time-consuming, and produces no auditable record. Patients lack a portable, trustworthy proof of their immunisation status for travel, school enrolment, or employment.

---

## Solution

VaxCheck digitises the entire vaccination workflow across two complementary surfaces:

- **Patient app (mobile):** Upload a photo of a paper booklet, view all vaccinations by category, track upcoming booster deadlines, and store a verifiable pass in Google Wallet.
- **Practice web app:** Receive uploaded documents, run them through a local vision-language model, present extracted data side-by-side with the source image for clinician review, then commit entries with a two-step digital signature. Every change is written to an immutable audit log.

The AI extraction backend runs entirely on a local `llama.cpp` instance — no patient data ever leaves the operator's infrastructure.

---

## Key Features

**Patient Mobile App**
- Upload vaccination booklet photos from camera or gallery
- Vaccination overview grouped by disease category with status indicators (current / booster due / lifelong)
- Automated booster reminders linked to appointment booking
- Practice access management — grant or revoke read access per clinic
- Google Wallet integration: generates a verifiable digital card with QR code, stored locally on the device

**Practice Web App**
- Physician dashboard with KPI cards, vaccination trend chart, status donut, and activity feed
- Patient roster with full-text search, vaccination count, and review-pending badge
- Drag-and-drop document upload (JPEG, PNG, WEBP, PDF) with animated processing pipeline: upload → OCR → AI → extracted → review
- Side-by-side AI review: original document on the left, extracted vaccination entries with confidence scoring and manual correction on the right
- Two-step digital signature: review pending entries → legal consent acknowledgement → sign → audit entry written
- Print-ready vaccination passport view with scannable QR verification code
- Field-level audit log with old/new values and performer identity

**Data Utilities**
- Rust extraction service: accepts raw image bytes, returns structured JSON via `POST /extract`
- Python import utility: converts arbitrary vaccination JSON (including nested structures and German date formats) to SQLite for offline analysis

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Patient app** | React 18, Vite 5, TypeScript, Tailwind CSS v3, React Router v6 |
| **Practice frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Radix UI |
| **Animations** | Framer Motion 12 |
| **Charts** | Recharts 3 |
| **Forms** | React Hook Form 7, Zod 4 |
| **Server state** | TanStack Query 5, Convex React client |
| **Backend / Database** | Convex (serverless functions, real-time queries, file storage) |
| **AI Extractor** | Rust (Actix-web 4), rig-core 0.37, llama.cpp (OpenAI-compatible) |
| **Data utilities** | Python 3, SQLite |
| **Dev environment** | Nix flake, rust-overlay |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│   Patient Mobile App  (React + Vite)             │
│   /upload  /overview  /share  /termin  /wallet   │
└──────────────────────┬───────────────────────────┘
                       │  (future: real API)
┌──────────────────────▼───────────────────────────┐
│   Practice Web App  (Next.js 16 / App Router)    │
│   /  /patients  /upload  /review  /signature     │
│   /patients/[id]  /patients/[id]/impfpass        │
└──────┬────────────────────────────┬──────────────┘
       │ Convex SDK (HTTP client)   │ fetch (raw bytes)
       ▼                            ▼
┌─────────────┐          ┌──────────────────────────┐
│   Convex    │          │  Extractor  (Rust/Actix)  │
│  patients   │          │  POST /extract            │
│  vaccinations          │  GET  /openapi.json       │
│  audit_log  │          └────────────┬─────────────┘
│  documents  │                       │ rig-core prompt
│  storage    │          ┌────────────▼─────────────┐
└─────────────┘          │  llama.cpp  (local VLM)  │
                         │  OpenAI-compatible API   │
                         └──────────────────────────┘
```

### Document Upload Data Flow

1. User selects a patient and drops image or PDF files onto the upload zone.
2. Next.js calls `convex.mutation(documents.generateUploadUrl)` and POSTs raw bytes to Convex storage.
3. `documents.registerUploadedDocument` stores the `storage_id` reference in `vaccination_documents`.
4. Raw image bytes are forwarded to the Rust extractor (`POST /extract`).
5. The extractor base64-encodes the image and submits a typed prompt to llama.cpp.
6. llama.cpp returns structured JSON constrained to `ExtractionResponse`; entries land in `vaccinations` with `needs_review: true` and a `confidence_score`.
7. Clinician reviews on `/review/[patientId]` (document viewer + entry editor), corrects any fields, then proceeds to `/signature/[patientId]` for consent and signing.
8. `vaccinations.verify` mutation marks each entry `is_verified: true`, records `verified_by / verified_at`, and writes an `audit_log` row.

### Convex Schema

| Table | Key Fields |
|---|---|
| `patients` | `first_name`, `last_name`, `birth_date` |
| `vaccinations` | `vaccine_name`, `vaccination_date`, `batch_number`, `is_verified`, `needs_review`, `confidence_score`, `digital_signature_hash` |
| `audit_log` | `action`, `field_changed`, `old_value`, `new_value`, `performed_by`, `performed_at` |
| `vaccination_documents` | `storage_id`, `file_name`, `file_type`, `page_number` |

---

## Project Structure

```
VaxCheck/
├── mockup/                         # Patient-facing mobile app (React + Vite)
│   └── src/
│       ├── pages/                  # Home, Upload, Overview, Share, Termin, Wallet
│       └── components/             # MobileFrame, Logo
│
├── impfpass-app/
│   └── frontend-next/              # Practice web app (Next.js)
│       ├── convex/                 # Backend: schema, queries, mutations
│       │   ├── schema.ts
│       │   ├── patients.ts
│       │   ├── vaccinations.ts
│       │   └── documents.ts
│       └── src/
│           ├── app/                # Next.js App Router pages
│           │   ├── page.tsx        # Dashboard
│           │   ├── patients/       # Patient list + detail + impfpass view
│           │   ├── upload/         # Document upload flow
│           │   ├── review/         # AI review (side-by-side)
│           │   ├── signature/      # Digital signature flow
│           │   └── login/
│           ├── components/
│           │   ├── dashboard/      # KPI cards, charts, activity feed
│           │   ├── impfpass/       # Passport card, QR, export button
│           │   ├── patient-detail/ # Stammdaten, Impfungen, Dokumente, Signaturen tabs
│           │   ├── review/         # Document viewer, vaccination entry editor
│           │   ├── upload/         # DropZone, StatusPipeline
│           │   └── ui/             # shadcn/ui primitives
│           ├── hooks/              # usePatient, useDocumentUpload, useVaccinationMutations
│           ├── lib/                # api.ts, api-client.ts (Convex HTTP client wrapper)
│           └── types/              # patient.ts, vaccination.ts, document.ts
│
├── extractor/                      # AI extraction service (Rust)
│   └── src/main.rs                 # Actix-web server, rig-core agent, OpenAPI spec
│
├── JSON_to_SQL.py                  # JSON → SQLite import utility
├── impfpass_beispiel.json          # Sample extractor output
└── flake.nix                       # Nix dev environment (Rust stable toolchain)
```

---

## Setup & Installation

### Prerequisites

- Node.js ≥ 20
- Rust stable (via `rustup` or the Nix flake)
- Python ≥ 3.10 (for the import utility only)
- A running `llama.cpp` server with a vision-capable model and OpenAI-compatible API

### 1. Patient Mobile App

```bash
cd mockup
npm install
npm run dev        # http://localhost:5173  (--host flag: accessible on LAN)
npm run build      # production build → dist/
```

### 2. Practice Web App

```bash
cd impfpass-app/frontend-next
npm install

# Start Convex local backend
npx convex dev     # runs Convex dev server at http://127.0.0.1:3210

# In a second terminal
npm run dev        # Next.js at http://localhost:3000
```

Seed the database with sample patients:

```bash
npm run import     # convex import --table patients samplePatients.jsonl
```

### 3. AI Extractor Service

```bash
cd extractor

# Option A: Nix
nix develop        # drops into shell with Rust stable

# Option B: rustup
rustup toolchain install stable

# Set environment variables (see next section), then:
LLAMA_CPP_BASE_URL=http://127.0.0.1:8081/v1 cargo run --release
```

### 4. JSON Import Utility

```bash
python JSON_to_SQL.py impfpass_beispiel.json
# optional: --db /path/to/output.db
```

---

## Environment Variables

### Practice Web App (`impfpass-app/frontend-next/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex backend HTTP endpoint | `http://127.0.0.1:3210` |
| `CONVEX_DEPLOYMENT` | Convex deployment identifier | `anonymous:anonymous-frontend-next` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex site URL (used for file serving) | `http://127.0.0.1:3211` |

### Extractor Service

| Variable | Description | Default |
|---|---|---|
| `LLAMA_CPP_BASE_URL` | OpenAI-compatible base URL of llama.cpp | **required** |
| `LLAMA_CPP_MODEL` | Model name as registered in llama.cpp | `local` |
| `LLAMA_CPP_API_KEY` | API key (if the llama.cpp server requires one) | `llama.cpp` |
| `BIND_ADDR` | Bind address for the extractor service | `127.0.0.1:8080` |

---

## Usage

### Practice Web App — typical workflow

1. Open `http://localhost:3000/login`.  
   Demo credentials: `doctor@example.com` / `ChangeMe!234`, then 2FA code `123456`.
2. The **Dashboard** shows patient count, pending reviews, documents processed, and monthly verification stats.
3. **Patienten** → select a patient → **Dokumente** tab to view uploaded files.
4. **Upload**: select a patient, drop a vaccination booklet image or PDF. The pipeline animates through five stages: upload → OCR → AI → extracted → review.
5. **Review** (`/review/[patientId]`): original document on the left, extracted entries on the right. Edit inline, then **Bestätigen & Signieren**.
6. **Signatur** (`/signature/[patientId]`): review pending entries, accept the consent declaration, click **Jetzt signieren**.
7. **Impfpass** (`/patients/[id]/impfpass`): print-ready view with a QR code linking to the verification URL.

### Patient Mobile App

```bash
cd mockup && npm run dev
# Open http://localhost:5173 in a browser or on a mobile device on the same network
```

Navigate: Home → Upload (camera / gallery) → Overview (grouped by disease, booster alerts) → Share (practice access control) → Wallet (Google Wallet card preview and add flow).

---


## API Documentation

### Extractor Service

Base URL: `http://127.0.0.1:8080` (configurable via `BIND_ADDR`)  
Full OpenAPI spec: `GET /openapi.json`

#### `GET /`

Health check.

```
200 OK
"Hello world!"
```

#### `POST /extract`

Accepts raw image bytes. Returns vaccination data extracted by the VLM.

**Request**

```
Content-Type: image/jpeg     (or image/png, image/webp)
Body: <raw image bytes>      (max 25 MB)
```

**Response `200`**

```json
{
  "first_name": "Max",
  "last_name": "Mustermann",
  "birth_date": "1990-05-14",
  "birth_place": "München",
  "vaccinations": [
    { "date": "2021-04-12", "name": "Comirnaty" },
    { "date": "2021-07-03", "name": "Comirnaty" }
  ]
}
```

Fields are `null` when not visible in the image.

**Response `400`**

```json
{ "error": "image body must not be empty" }
```

**Response `500`**

```json
{ "error": "llama.cpp extraction failed: ..." }
```

### Convex Backend Functions

| Function | Type | Description |
|---|---|---|
| `patients.list` | query | List patients with optional name search |
| `patients.get` | query | Fetch patient with vaccinations and documents |
| `vaccinations.update` | mutation | Update vaccination fields; writes audit log entries |
| `vaccinations.verify` | mutation | Mark vaccination verified; writes audit log |
| `documents.generateUploadUrl` | mutation | Generate a Convex storage upload URL |
| `documents.registerUploadedDocument` | mutation | Register an uploaded file against a patient |
| `documents.listByPatient` | query | List documents with signed storage URLs |
| `documents.deleteDocument` | mutation | Delete document and purge from storage |

---

## AI / LLM Features

### Vision Extraction Pipeline

The `extractor` service uses [rig-core](https://github.com/0xPlaygrounds/rig) to build a typed agent backed by any OpenAI-compatible endpoint — in practice, a locally-running `llama.cpp` vision-language model.

**Prompt strategy:**  
A system preamble constrains model behaviour: `"You extract vaccination passport data from images. Return only data visible in the image. Leave unknown fields null."` The user turn combines a text instruction with the base64-encoded image. Output is constrained to the `ExtractionResponse` Rust struct via `prompt_typed` — no post-processing regex required.

**Compile-time output schema (`schemars` + `serde`):**

```rust
struct ExtractionResponse {
    first_name:   Option<String>,
    last_name:    Option<String>,
    birth_date:   Option<String>,
    birth_place:  Option<String>,
    vaccinations: Option<Vec<Vaccination>>,
}

struct Vaccination {
    date: Option<String>,
    name: Option<String>,
}
```

**Confidence and review flags:**  
Each extracted vaccination is stored with a `confidence_score` and `needs_review: true`. Entries are cleared from the review queue only after explicit clinician action via `vaccinations.verify`.

**Privacy by design:**  
llama.cpp runs on the operator's own hardware. Raw patient images are processed in-memory and never sent to any external API or cloud service.

---

## Deployment

### Local development

```bash
# Terminal 1 — Convex
cd impfpass-app/frontend-next && npx convex dev

# Terminal 2 — Next.js
cd impfpass-app/frontend-next && npm run dev

# Terminal 3 — Rust extractor
cd extractor && LLAMA_CPP_BASE_URL=http://127.0.0.1:8081/v1 cargo run --release

# Terminal 4 — llama.cpp (example)
llama-server --model ./models/llava.gguf --port 8081
```

### Convex Cloud

```bash
cd impfpass-app/frontend-next
npx convex deploy
# Update NEXT_PUBLIC_CONVEX_URL and CONVEX_DEPLOYMENT in .env.local
```

### Vercel (Next.js frontend)

```bash
vercel --prod
# Set NEXT_PUBLIC_CONVEX_URL and CONVEX_DEPLOYMENT as Vercel environment variables
```

### Extractor container (example Dockerfile — not yet committed)

```dockerfile
FROM rust:1.80 AS builder
WORKDIR /app
COPY extractor/ .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/extractor /usr/local/bin/extractor
ENV BIND_ADDR=0.0.0.0:8080
CMD ["extractor"]
```

---

## Challenges & Learnings

**Structured output from a local VLM**  
Getting llama.cpp to reliably return valid JSON requires schema enforcement at the protocol level. rig-core's `prompt_typed` combined with a `schemars`-derived schema constrains generation without post-processing, which proved far more robust than regex-based parsing of free-form text.

**Convex real-time vs. HTTP client**  
The Convex React client streams live updates; the HTTP client used in the Next.js server component (`ImpfpassPage`) issues a one-shot query. Choosing the right client per surface prevents unnecessary WebSocket connections on server-rendered pages.

**Audit trail without noise**  
`vaccinations.update` compares each incoming value against the current database row and only writes an `audit_log` entry when the value genuinely changes. This avoids polluting the audit trail with no-op saves while still capturing every real edit.

**Two-surface trust model**  
The patient app and practice app share no code, yet must present a coherent trust signal. The QR code on the printed vaccination passport links to a verification URL that encodes the patient ID — a lightweight bridge between surfaces that avoids tight coupling.

**German date format normalisation**  
Paper booklets use at least five distinct date formats: `19. JAN. 2007`, `21.3.2011`, `27.6.11`, `3.12` (day and month only), and ISO 8601. The Python import utility handles all known variants deterministically and logs a warning rather than aborting on unrecognised patterns.

---

## Future Improvements

- **Real authentication:** Replace the demo login with an OIDC provider (e.g., Keycloak) scoped to licensed medical practitioners.
- **Patient app backend:** Connect the Vite mockup to a live API; all patient data is currently static.
- **Extractor streaming:** Stream partial VLM results to the frontend to reduce perceived latency on multi-page documents.
- **Confidence threshold routing:** Automatically accept high-confidence entries without manual review; flag only ambiguous ones.
- **eIDAS-compliant signatures:** Replace the mock signature hash with a qualified electronic signature via a registered trust service provider.
- **Offline-first patient app:** Cache vaccination records with a service worker so the mobile app is fully functional without connectivity.
- **Multi-tenant support:** Namespace patients and documents per practice with role-based access control.

---


## License

This project is not yet licensed for public use. All rights reserved unless otherwise stated.
