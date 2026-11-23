# Architecture

## API module list

The NestJS application is organized into `health`, `common`, `prisma`, `auth`, `users`, `employees`, `projects`, `sites`, `attendance`, `equipment`, `telemetry`, `uploads`, `verification`, and `audit` modules.

Monorepo: `apps/web` (Next.js admin), `apps/api` (NestJS), `apps/mobile` (Flutter Android, workers and supervisors), `services/ai` (FastAPI).

- Mobile and web call the NestJS REST API (`/api/v1`). OpenAPI spec at `/api/docs`; Dart client is generated from it.
- API owns PostgreSQL/PostGIS, Redis/BullMQ, S3 storage and Socket.IO. Images live in S3, never in Postgres.
- AI service is internal-only (bearer token). It returns `image_validated` or `needs_review`; it never confirms identity.
- GPS ingestion (`POST /api/v1/telemetry/gps`) is independent of verification. Ignition, movement, connectivity and engine hours are stored separately.
- Timestamps stored in UTC; displayed in the company timezone (Asia/Kolkata).
- Tenant isolation: every business table carries `company_id`.

## Core relationships (Phase 1)
companies 1-N users, employees, projects, sites · users 0-1 employees · projects 1-N sites · employees N-M sites (employee_site_assignments) · audit_logs reference company and actor user.

## Project progress
- `progress_milestones` belong to a company and project, and may reference a project site. Planned/actual dates, completion percent and status are stored per milestone.
- `progress_updates` are append-only project reports authored by an authenticated user, optionally linked to a milestone and site. Milestone updates can also advance its current completion and status.
- Project progress routes are nested under `/api/v1/projects/:projectId`; handlers validate company ownership and use role guards. Mutations are written to `audit_logs`.
- Web workspace: `/progress`. Values come from authenticated API/database requests; no simulated progress is displayed.

## Advanced modules roadmap
Project progress and timeline is the first advanced module. Materials/inventory, procurement, project finance, safety, quality, vendor/subcontractor management, documents, client portal, vehicle/rental tracking, billing, approval workflows, and AI enhancements remain future work. Add each as a separate module with tenant-scoped persistence, role checks and explicit empty/error states before exposing it as live functionality.
