# Construction ERP & Heavy Equipment Monitoring

## Project structure

```text
.
├── apps/
│   ├── api/                 NestJS API and Prisma
│   ├── mobile/              Flutter worker/supervisor app
│   └── web/                 Next.js web application
├── services/
│   └── ai/                  FastAPI validation service
├── docs/
├── .github/workflows/
└── docker-compose.yml
```

Android platform files are intentionally not generated in this repository. Generate them once with `cd apps/mobile && flutter create . --platforms=android`, then commit the generated `android/` directory.

Monorepo: `apps/web` (Next.js), `apps/api` (NestJS + Prisma), `apps/mobile` (Flutter), `services/ai` (FastAPI). See `docs/architecture.md`.

## Web experience
- Public company website: http://localhost:3000
- Team sign-in: http://localhost:3000/login
- The login page offers a public interactive demo with fictional records stored only in each visitor's browser; it has no company API access. A no-password `SUPER_ADMIN` demo is available only on localhost when `DEV_LOGIN_ENABLED=true`; it is disabled in production.
- Operations dashboard: http://localhost:3000/dashboard
- Project progress workspace: http://localhost:3000/progress
- Public site service cards expand into accessible capability details; project records remain in the authenticated team workspace.
- The public site includes an interactive capability-concept gallery. Its engineering diagrams are illustrative visuals, not verified project photography or claims of completed work.
- Scroll-aware navigation, mobile menu, progress indicator, animated section reveals, and back-to-top control are available on the public site.
- Workforce and Projects are API-backed workspaces with tenant-scoped server-side search, status filters, sorting, pagination, CSV export for the visible page, guarded create actions, and employee/project detail drawers.
- `GET /api/v1/employees` supports `search`, `status`, `page`, `pageSize`, `sortBy`, and `sortOrder`; `GET /api/v1/projects` supports the same filters and searches linked site names as well as project names. Both return counts for the active filters.
- Equipment categories use illustrative images. Maintenance schedules and fuel entries can be recorded in the browser for local review; they are not shared or API-backed. Project progress charts use recorded milestone percentages, not sample data.
- Sites starts with clearly marked illustrative examples and supports local additions without API calls or authentication tokens; all site entries stay in the current browser.
- Settings shows the current browser session and API health status and provides sign-out.
- Attendance and AI Verification remain unavailable until their APIs, persistent records, evidence storage and review permissions are implemented. The UI explicitly avoids simulated check-ins and AI outputs.

## Project progress (Phase 1)
- Create and order project milestones with planned dates.
- Record field progress notes and optional milestone completion percentages.
- View project-scoped milestone status, average progress, and update history.
- API routes: `GET /api/v1/projects/:projectId/progress`, `POST /api/v1/projects/:projectId/milestones`, `PATCH /api/v1/projects/:projectId/milestones/:milestoneId`, and `POST /api/v1/projects/:projectId/progress-updates`.
- Apply the database migration with `cd apps/api && npx prisma migrate deploy` after PostgreSQL/PostGIS is available.

## Phase 2 — attendance and field verification
- Models: work shifts, immutable GPS attendance events, three-hour verification rounds and tasks, separately keyed worker/supervisor images, and employee rotation state.
- API: `GET /api/v1/attendance`, `GET /api/v1/attendance/current`, `GET|POST /api/v1/attendance/shifts`, `POST /api/v1/attendance/geofence-check`, `POST /api/v1/attendance/check-in`, `POST /api/v1/attendance/check-out`, `POST /api/v1/attendance/breaks/start`, `POST /api/v1/attendance/breaks/end`, and role-gated `POST /api/v1/attendance/manual-correction`.
- Set a site boundary with `PATCH /api/v1/sites/:id/geofence`, passing a closed array of `{longitude, latitude}` vertices. A worker check-in or break is rejected unless the site boundary is configured and the GPS point is inside it.
- Verification API: `GET /api/v1/verification/tasks`, worker-only `POST /api/v1/verification/tasks/:taskId/selfie`, and supervisor-only `POST /api/v1/verification/tasks/:taskId/supervisor-capture`. Uploads are private, separately keyed, and limited to JPEG/PNG/WebP images up to 5 MB.
- BullMQ uses `REDIS_URL` to schedule a round every three hours. It selects `ceil(25% of active, linked, assigned workers)`, prioritizing the least-recently selected workers and persisting rotation counts. A user's employee account must be linked to their worker login.
- `/attendance` now supports GPS check-in/out, breaks, history, and supervisor corrections. `/verification` supports scheduled task review, live camera capture and a browser IndexedDB offline upload queue. The Flutter worker app uses the camera plugin (web platform uses `navigator.mediaDevices.getUserMedia`) and a Hive queue (IndexedDB on Flutter Web; local storage on native platforms). Neither flow exposes gallery selection for live verification captures.
- No facial recognition, face identification, biometric matching, confidence scores, or AI verification decisions are implemented. Captured images and capture metadata are stored only for potential Phase 3 person-detection processing.
- The seed script creates demo-only worker logins linked to sample employees and illustrative site geofences/shifts. Those sample geographic boundaries are not real operating site boundaries; configure actual site polygons before using attendance outside a demo.
- Apply the new database migration after PostgreSQL/PostGIS is running: `cd apps/api && npx prisma migrate deploy`. The recurring scheduler starts when the API and Redis are available.

## Run backend stack
    cp .env.example .env      # if .env does not already exist; replace local passwords first
    docker compose up --build -d
- API docs: http://localhost:4000/api/docs · health: /api/v1/health
- Web: http://localhost:3000 · AI health: http://localhost:8000/health
- PostgreSQL includes PostGIS; Redis is available at `localhost:6379`.
- MinIO API: http://localhost:9000 · console: http://localhost:9001. Compose creates the private `construction-erp-media` bucket.
- The `.env` values and Compose defaults are for local development only. Replace passwords and JWT secrets before exposing any service.

## Database and sample records
After Compose reports PostgreSQL healthy:

    cd apps/api
    set -a
    . ../../.env
    set +a
    npx prisma generate
    npx prisma migrate deploy
    npx prisma db seed

Set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` (at least 12 characters) in `.env` before seeding. The seed creates clearly identifiable local sample records for the RT Infratech company, admin, projects, sites, and employees; do not treat these as production data.

## Private image uploads
- `POST /api/v1/uploads/image` accepts multipart fields `file`, `purpose` (`employee-photo` or `verification`), and `employeeId` for employee photos.
- JPEG, PNG, and WebP files up to 5 MB are accepted after content-signature validation. The bucket remains private; responses contain short-lived signed read URLs.
- Employee profile photo upload is available from the Workforce employee create form and profile drawer. Verification images can be uploaded to private storage, but the AI Verification workflow is not connected yet.
- Static machine-category, site, verification-guide, and avatar SVGs are illustrative UI assets, not live equipment or project data. The sidebar continues to use the supplied lotus emblem.

## Tests
    cd apps/api && npm install && npm test
    cd services/ai && pip install -r requirements.txt && pytest

## Flutter APK
    cd apps/mobile
    flutter create . --platforms=android   # generates android/ folder once
    flutter pub get
    flutter build apk --release --dart-define=API_URL=https://your-api/api/v1
Android needs `<uses-permission android:name="android.permission.INTERNET"/>` (added by default in debug only; add for release).

## Status
The public company website, interactive service details, admin shell, initial API modules, temporary development login, and Project Progress milestone/timeline APIs are implemented. The public website uses illustrative engineering diagrams rather than project photographs; public project case studies and verified achievement metrics have not been supplied. PostgreSQL-backed features require the database migration and a configured database. The remaining advanced modules and AI enhancements are planned for later phases; they are not yet implemented.
