# MyCity Platform

Production-oriented monorepo for a smart city complaint and service-request platform.

## Repository Layout
- `backend`: NestJS API, PostgreSQL/PostGIS persistence, Redis-backed runtime coordination, notifications, queue jobs
- `apps/mobile`: Flutter mobile client for citizens and district operators
- `infra/docker`: default local Docker stack
- `infra/k8s`: baseline deployment manifests
- `.github/workflows`: GitHub CI validation

## Git And GitHub Setup
This folder is now initialized as a Git repository with `main` as the default branch.

Recommended branch strategy:
- protect `main`
- create feature branches as `feature/<name>`
- merge through pull requests only

Repository governance files included:
- [CODEOWNERS](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/.github/CODEOWNERS)
- [Pull Request Template](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/.github/pull_request_template.md)
- [Issue Templates](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/.github/ISSUE_TEMPLATE)

Typical GitHub bootstrap:
```bash
git remote add origin <your-github-repo-url>
git add .
git commit -m "chore: bootstrap mycity platform"
git push -u origin main
```

## Default Local Workflow
Docker is the default backend workflow. The mobile app stays outside Docker.

Start the full backend stack:
```bash
npm run infra:dev
```

That stack includes:
- `backend` on `http://localhost:4000`
- API base on `http://localhost:4000/api/v1`
- health endpoint on `http://localhost:4000/api/v1/health`
- `postgres` on `localhost:5433`
- `redis` on `localhost:6380`
- `pgadmin` on `http://localhost:5050`

pgAdmin bootstrap credentials come from [infra/docker/compose.env](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/infra/docker/compose.env).

Detached mode:
```bash
npm run infra:up
```

Stop it:
```bash
npm run infra:down
```

## Backend Setup
Create the backend env file first:
```bash
cd backend
copy .env.example .env
cd ..
```

The committed backend example env matches the default Docker-published ports:
- `POSTGRES_PORT=5433`
- `REDIS_PORT=6380`

Inside Docker, the backend service still uses internal hostnames `postgres:5432` and `redis:6379`.

Important defaults:
- `DB_SYNC=false`
- migrations are the primary schema path
- Redis is required by default

Run migrations manually:
```bash
npm run backend:migrate
```

Seed demo data:
```bash
npm run backend:seed
```

Run backend directly without Docker if needed:
```bash
npm run backend:dev
```

## Docker Port Configuration
Published ports for the local stack are controlled through [infra/docker/compose.env](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/infra/docker/compose.env):
- `BACKEND_PUBLISH_PORT=4000`
- `POSTGRES_PUBLISH_PORT=5433`
- `REDIS_PUBLISH_PORT=6380`
- `PGADMIN_PUBLISH_PORT=5050`

These defaults avoid the common local collisions on `5432` and `6379`.

## PostgreSQL And Redis
### PostgreSQL
- primary system of record
- uses PostGIS
- schema managed through TypeORM migrations
- demo data loaded through the seed script

### Redis
- required runtime dependency
- used for queue reservation locks
- used for lightweight hot-read caching
- exposed through health checks and startup validation

## Uploads And Storage
Upload sessions are now environment-driven and presigned through S3-compatible configuration.

Required storage env surface:
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`

Optional storage env surface:
- `STORAGE_ENDPOINT`
- `STORAGE_PUBLIC_BASE_URL`
- `STORAGE_FORCE_PATH_STYLE`
- `STORAGE_SIGNED_URL_EXPIRES_SECONDS`

## Mobile App
Install Flutter locally, then:
```bash
cd apps/mobile
flutter pub get
flutter run
```

Default API targets:
- Android emulator: `http://10.0.2.2:4000/api/v1`
- desktop / iOS simulator: `http://127.0.0.1:4000/api/v1`

Start order for end-to-end local work:
1. `npm run infra:dev`
2. `flutter run`

## Validation And CI
GitHub workflows included:
- backend build + migrate + seed + test
- Docker Compose validation
- Flutter analyze

Local validation commands:
```bash
npm run backend:build
npm run backend:test
```

## Kubernetes Baseline
Baseline Kubernetes manifests now include:
- [API ConfigMap](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/infra/k8s/api-configmap.yaml)
- [API Secret Template](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/infra/k8s/api-secret.example.yaml)
- [API Service](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/infra/k8s/api-service.yaml)
- [API Deployment](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/infra/k8s/api-deployment.yaml)
- [Migration Job](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/infra/k8s/api-migrate-job.yaml)

Release guidance:
- run schema changes before the API rollout
- keep `DB_SYNC=false` outside local development
- use health checks on `/api/v1/health`
- keep all secrets out of the repo and provide them through your runtime secret store

Detailed operational steps are in [docs/release-checklist.md](C:/Users/xamse/OneDrive/Desktop/hamze.apps/my-city/docs/release-checklist.md).

## Notes
- Kubernetes manifests now expose PostgreSQL, Redis, JWT, FCM, and storage-related environment variables.
- The platform remains a modular monolith. This setup does not split services.
