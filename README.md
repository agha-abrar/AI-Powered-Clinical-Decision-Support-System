# AI-Powered Clinical Decision Support System

This monorepo contains a working demo for a clinical decision-support workflow with:

- a NestJS API for auth, patient management, diagnoses, reports, and audit logging
- a React + Vite desktop shell with real login and dashboard flows
- a FastAPI AI service for diagnosis and response orchestration
- Prisma + Postgres persistence with seeded demo data

> Educational prototype only. This is not clinically validated and should not replace professional judgment.

## Local run

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start Postgres/Mailpit:
   ```bash
   pnpm docker:up
   ```
3. Configure the API environment file if needed:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
   Then set strong values for the JWT and encryption secrets.
4. Generate Prisma client and apply schema:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```
5. Seed demo data:
   ```bash
   pnpm db:seed
   ```
6. Start the services in separate terminals:
   ```bash
   pnpm dev:api
   pnpm dev:ai
   pnpm dev:desktop
   ```

The working local endpoints in this repo are:

- API: http://localhost:3000
- Desktop app: http://localhost:5173
- AI service: http://localhost:8001

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Physician | physician@cdss.local | ChangeMe123! |
| Nurse | nurse@cdss.local | ChangeMe123! |
| Admin | admin@cdss.local | ChangeMe123! |

## Verified workflow

The implementation includes:

- login + MFA challenge flow
- role-based dashboard access
- patient listing, create, edit, and detail views
- report generation and audit log viewer
- physician-side manual diagnosis workflow
- seeded sample patients and medication data

## Validation

The repo was validated with:

```bash
pnpm --filter @cdss/api test:unit
pnpm --filter @cdss/desktop run typecheck
curl -sS http://localhost:3000/api/v1/health
```

The health endpoint is expected to return a JSON status payload with `"status": "ok"` when the API is running.

## Notes

- The NestJS backend is the source of truth for RBAC, safety checks, and audit logging.
- The AI service is optional for local demo usage and can run against the bundled local provider.
- See the workspace apps and services directories for the actual implementation modules and route files.
