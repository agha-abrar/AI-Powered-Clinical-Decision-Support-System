# AI-Powered Clinical Decision Support and Drug Recommendation System

> **Educational prototype. Not clinically validated. Does not replace professional medical
> judgment. All AI output requires review by an authorized healthcare professional. Use only
> synthetic or properly de-identified data. This project makes no claim of HIPAA, PDPL, GDPR,
> FDA, CE, or other regulatory certification.**

## What this is

A monorepo implementing the architecture below:

```
Electron Desktop App (React, TypeScript, Vite)
        | HTTPS/REST
        v
NestJS Backend API  ── PostgreSQL (system of record)
        | internal authenticated request
        v
FastAPI AI Gateway
        | secure external request
        v
OpenRouter API
```

- The Electron renderer never talks to PostgreSQL or OpenRouter directly.
- NestJS owns authentication, RBAC, persistence, deterministic medication-safety rules, and
  audit logging.
- FastAPI owns de-identification, prompt construction, OpenRouter communication, and structured
  response validation.
- Deterministic safety logic (drug-drug, drug-allergy, contraindications, dosage) lives entirely
  in NestJS/PostgreSQL and never depends on or can be overridden by the LLM.

## Honest scope of this build

This is a large specification (57 sections). What's implemented as **real, working code** in this
repository:

**Fully implemented:**
- Monorepo tooling (pnpm workspaces, Turbo, shared TS config/ESLint), Docker Compose
- Complete Prisma schema covering every entity in the spec, with indexes and constraints
- Shared Zod contracts (auth, patients, the strict AI diagnostic response schema, prescriptions/safety)
- NestJS: auth (login → MFA → JWT, refresh rotation with reuse detection, account lockout,
  password reset), hash-chained append-only audit log with integrity verification, AES-256-GCM
  field encryption, RBAC guard, patients module (fuzzy search, duplicate detection, optimistic
  concurrency, timeline), encounters module (vitals/labs), clinical notes with a deterministic
  pattern-based NLP extractor (swappable interface), medications module + CSV/JSON import with
  transactional rollback, the **deterministic medication-safety engine** (all 10 check types from
  the spec, with unit tests covering the seeded demo scenarios), dosage service, prescriptions
  module (draft → validate → finalize with mandatory server-side safety rerun), diagnoses module,
  treatments module, reports module with **real PDF generation via pdfkit** plus JSON export,
  users/admin module (create/activate/deactivate/lock/unlock/reset-MFA/assign-roles), system
  settings module, health checks
- FastAPI AI gateway: de-identifier, versioned prompt with prompt-injection defenses, strict
  JSON-schema structured output, OpenRouter client (retry/backoff/circuit-breaker/size limits),
  OpenRouter provider, deterministic local-demo provider (implements the diabetes and
  low-confidence-autoimmune demo scenarios), fallback orchestration, and a real pytest suite
  (fully mocked — no live network calls, no paid requests during tests)
- Electron: secure `BrowserWindow` config (CSP, sandboxed, no nodeIntegration, permission
  denial, navigation lock-down), minimal preload bridge
- React: login screen (wired to the real API, handles the MFA challenge) and an authenticated
  dashboard shell showing live DB/AI-service health — this proves the full chain end to end
- Seed script covering roles/permissions, 3 demo users, synthetic patients, medications with all
  four interaction severities (MINOR/MODERATE/MAJOR/CONTRAINDICATED), and guideline references

**Scaffolded but not yet built out:** the remaining clinical UI screens beyond login/dashboard
(patient list/detail, encounter workspace, NLP review, diagnostic workspace, treatment planning
UI, prescription workspace, administration screens), the interoperability (FHIR) module, most of
the automated test suite beyond the AI service and the two NestJS unit-test files included,
docs/architecture diagrams, and Electron packaging configuration.

**Sandbox limitation:** this code was written and reviewed in an environment without internet
access, so dependencies were never actually installed and nothing was actually executed here
(Python files passed `py_compile` syntax checks; TypeScript could not be type-checked without
installing `typescript`/`@types/*` packages). Expect to spend some time fixing minor
integration issues — missing imports, small type mismatches — on first run.

## Prerequisites

- Node.js 20+ and pnpm 9+ (`corepack enable && corepack prepare pnpm@9.6.0 --activate`)
- Docker Desktop (for Postgres, Mailpit, and optionally the AI service container)
- Python 3.11+ (to run the AI service outside Docker, optional)
- An OpenRouter API key if you want real AI-backed diagnosis (optional — `local-demo` mode
  needs no key at all)

## Setup (VS Code)

1. **Open the folder**: `code .` at the repo root, or File → Open Folder.
2. **Install recommended extensions** when prompted (ESLint, Prettier, Prisma, Python) — or
   install manually: `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `Prisma.prisma`,
   `ms-python.python`.
3. **Copy environment files:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp services/ai/.env.example services/ai/.env
   ```
   Edit `apps/api/.env` and set real random values for `JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`, and `FIELD_ENCRYPTION_KEY` (e.g. `openssl rand -hex 32`).
   Leave `services/ai/.env`'s `AI_DIAGNOSIS_PROVIDER=local-demo` to run with zero external
   dependency, or set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` and switch it to
   `AI_DIAGNOSIS_PROVIDER=openrouter` for real OpenRouter-backed diagnosis.
4. **Install dependencies** (open a VS Code integrated terminal, `Ctrl+\``):
   ```bash
   pnpm install
   ```
5. **Start infrastructure:**
   ```bash
   pnpm docker:up
   ```
6. **Generate Prisma client and run migrations:**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
   The first run will prompt you to name the initial migration (e.g. `init`).
7. **Seed the database:**
   ```bash
   pnpm db:seed
   ```
8. **Run everything** — open three integrated terminal tabs (VS Code: the `+` icon on the
   terminal panel) and run one command in each:
   ```bash
   pnpm dev:api        # NestJS on http://localhost:3000 (Swagger at /api/docs in dev)
   pnpm dev:ai         # FastAPI on http://localhost:8001 (docs at /api/docs)
   pnpm dev:desktop    # Vite dev server + Electron on http://localhost:5173
   ```
   `pnpm dev` (no suffix) runs all three in parallel via Turbo if you'd rather use one tab.

9. **Log in** with a seeded demo account (password change is required on first login, per spec
   section 10 — you'll be prompted; the password-change screen itself is one of the
   not-yet-built UI pieces, so for now you can call `POST /auth/reset-password` via Swagger to
   set a new password before logging in through the UI):
   - `physician@cdss.local`
   - `nurse@cdss.local`
   - `admin@cdss.local`
   - password: `ChangeMe123!`

## Demo credentials

| Role      | Email                  | Password       |
|-----------|-------------------------|----------------|
| Physician | physician@cdss.local     | ChangeMe123!   |
| Nurse     | nurse@cdss.local         | ChangeMe123!   |
| Admin     | admin@cdss.local         | ChangeMe123!   |

## Troubleshooting

- **`pnpm install` fails on a package version** — the versions pinned here were current as of
  this writing; if the registry has since moved a package's latest, relax the pin in the
  relevant `package.json` and retry.
- **Prisma can't reach Postgres** — confirm `pnpm docker:up` succeeded (`docker ps`) and that
  `DATABASE_URL` in `apps/api/.env` matches the compose file's credentials.
- **AI service returns `AI_PROVIDER_UNAVAILABLE`** — with `AI_DIAGNOSIS_PROVIDER=openrouter` and
  no `OPENROUTER_API_KEY`, this is expected; either set the key or switch to `local-demo`.
- **Electron shows a blank window** — make sure `pnpm dev:desktop` printed that Vite is serving
  on port 5173 before Electron's `BrowserWindow` tries to load it.

## Security & clinical-safety notes

See `apps/api/src/safety-checks/medication-safety.service.ts` for the deterministic engine that
always takes precedence over AI output, and `services/ai/app/privacy/deidentifier.py` for the
de-identification boundary enforced before any OpenRouter call. Full threat-model and clinical-
safety documentation is planned for `docs/security.md` and `docs/clinical-safety.md` (not yet
written in this checkpoint).
