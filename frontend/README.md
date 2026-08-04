# CPSM Frontend

Next.js App Router + TypeScript interface for Cloud Security Posture Management.

## Architecture

- `app/`: route tree and layout.
- `components/`: responsive shell and domain UI components.
- `services/`: API contracts; components never call `fetch` directly.
- `types/`: domain models for scans, findings and AWS accounts.
- `hooks/`: Socket.IO scan subscription with polling fallback.
- `mocks/`: backend-independent AWS Account data until its CRUD API exists.
- `lib/validation/`: Zod form schemas.

The former Vite pages were retained under `src/legacy-pages/` and are excluded from the Next build.

## Environment

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_*` values are browser-safe URLs; the Google secret and `CPSM_API_INTERNAL_URL` are server-only values used by Next Route Handlers:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001/api/v1
NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:5001
CPSM_API_INTERNAL_URL=http://127.0.0.1:5001/api/v1
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:3001/api/auth/google/callback
```

Do not prefix any secret with `NEXT_PUBLIC_`, and never commit `.env.local`.


## Authentication

- Email/password requests and Google OAuth are handled by Next.js server routes.
- Google uses Authorization Code + PKCE. The browser never receives the Google client secret or the CPSM JWT.
- The API verifies Google ID token signatures against Google's signing certificates and accepts only this project's Client ID.
- CPSM JWTs are stored in a Secure (in production), HttpOnly, SameSite=Lax cookie. The session expires after 8 hours by default.
- Add the same `GOOGLE_OAUTH_CLIENT_ID` to `backend/.env`, then restart the backend containers. Do not add `GOOGLE_OAUTH_CLIENT_SECRET` to `backend/.env`.
- The Settings page can sign out of this browser or all devices; the latter invalidates existing JWTs through `sessionVersion`.

Before testing Google locally, configure the Google Console with:

- Authorized JavaScript origin: `http://127.0.0.1:3001`
- Authorized redirect URI: `http://127.0.0.1:3001/api/auth/google/callback`


## Observability

No external logging service is required. The application writes structured JSON logs to its runtime output and never records credentials, tokens, passwords or form values.

- `GET /api/health` reports the Next.js website and API dependency status.
- `GET http://127.0.0.1:5001/api/v1/health` reports API, MongoDB and Redis readiness.
- The header displays `System online` or `System degraded`; the browser polls health every 30 seconds and reports only status changes and generic runtime-error categories.
- View API logs with `docker compose logs -f backend` from `backend/`. Local Next.js logs are in `frontend/logs/`.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:3001`. The backend API must be available at `http://127.0.0.1:5001` by default.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Docker

Development with live reload:

```bash
docker compose up --build
```

Production image:

```bash
docker build -t cpsm-frontend .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1 \
  -e NEXT_PUBLIC_SOCKET_URL=http://localhost:5001 \
  cpsm-frontend
```

The production Dockerfile uses a pinned Node image, a multi-stage standalone build, a non-root runtime user and excludes `.env`/`node_modules`.

## API currently used

- `POST /api/v1/scans/scan` with `Idempotency-Key`
- `GET /api/v1/scans/runs`
- `GET /api/v1/scans/runs/:scanId`
- `POST /api/v1/scans/runs/:scanId/cancel`
- `GET /api/v1/scans/scans`
- `POST /api/v1/scans/fix/:id` for confirmed S3 auto-fix
- Socket.IO event `scan.status.changed`

## API currently mocked

AWS Accounts list/create/test-connection uses `services/accounts.service.ts` and `mocks/aws-accounts.ts`. The following UI routes deliberately show backend dependency states until their contracts exist: remediation, policies, reports, notifications, team and settings.

## Manual test checklist

1. Open Dashboard and confirm cards/charts load.
2. Create a scan; the UI redirects with the returned `scanId`.
3. Disconnect Socket.IO temporarily; the scan page reports the state and polls every four seconds.
4. Cancel an active scan and confirm the worker status updates.
5. Filter findings, open a finding and inspect safe JSON evidence.
6. For an S3 finding, confirm the destructive action before applying auto-fix.
7. Add a mock AWS account and verify Zod validation errors are shown next to inputs.

## Backend gaps

AWS Account CRUD, remediation approvals/execution, policies, report jobs, notifications, team/RBAC persistence and settings APIs remain backend work. The UI does not pretend these operations succeeded and does not expose secret values.