# MyCity Project Report

**Date:** May 16, 2026  
**Status:** Active development, end-to-end validation phase

## Summary

MyCity is a smart city complaint and service-request platform. The current implementation is no longer a scaffold: it has a working backend foundation, Docker-first infrastructure, GitHub governance, CI checks, and a Flutter mobile client with Android, iOS, and web runners.

The main remaining work is runtime validation of the mobile app against the live local backend, followed by native Android build hardening and production map tile configuration.

## Current Stack

| Area | Technology |
| --- | --- |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL with PostGIS |
| Runtime coordination | Redis |
| ORM | TypeORM with migrations |
| Queue | Database-backed queue with Redis coordination |
| Notifications | Persisted notification events, queue delivery, optional FCM |
| Uploads | S3-compatible signed upload sessions |
| Mobile | Flutter |
| Mobile map | `flutter_map` with OpenStreetMap tiles |
| Local infra | Docker Compose |
| CI | GitHub Actions |
| Deployment baseline | Kubernetes manifests |

## Repository Shape

```text
my-city/
  backend/
    src/
      auth/
      comments/
      complaints/
      database/
      districts/
      health/
      notifications/
      queue/
      reactions/
      redis/
      uploads/
      users/
    test/
  apps/
    mobile/
      android/
      ios/
      lib/
        app/
        features/
        shared/
      test/
      web/
  infra/
    docker/
    k8s/
  docs/
  .github/
```

## Completed Work

| Workstream | Status |
| --- | --- |
| Git/GitHub setup | Complete |
| Branch protection and PR workflow | Complete |
| Docker local backend stack | Complete |
| PostgreSQL and Redis integration | Complete |
| TypeORM migrations and seed data | Complete |
| Backend auth and complaint flow | Complete |
| Comments and support reactions | Complete |
| Queue-backed notification delivery | Complete |
| Upload session hardening | Complete |
| Backend test expansion | Complete |
| Kubernetes baseline | Complete |
| Mobile feature structure | Complete |
| Android, iOS, and web Flutter runners | Complete |
| Leaflet-style map implementation | Complete |
| Flutter analyze/test CI | Complete |

## Mobile Map Decision

The app originally used Google Maps, which required platform-specific API keys and Google Cloud billing. That was unnecessary friction for local development.

Current approach:
- `flutter_map` provides the Flutter map widget.
- OpenStreetMap raster tiles are used for development.
- No Google Maps API key is required for local development.
- Production should use a dedicated tile provider or self-hosted tiles to avoid depending on public demo tile servers.

## Validation Status

Passed:
- Backend build and tests in CI
- Docker Compose validation in CI
- Flutter analyze in CI
- Local `flutter analyze`
- Local `flutter test`
- Local `flutter build web`

Still pending:
- Live mobile app run against `http://127.0.0.1:4000/api/v1`
- Full end-to-end mobile flow validation
- Android debug APK build completion
- iOS runtime validation on macOS/Xcode

## Known Issues And Risks

| Risk | Status | Action |
| --- | --- | --- |
| Mobile runtime not fully validated | Open | Run web/mobile app against local backend and test the full user path |
| Android debug APK build was slow locally | Open | Re-run with full Gradle output and keep Gradle wrapper committed |
| Public OpenStreetMap tiles are not production infrastructure | Open | Configure a production tile provider before real launch |
| No staff/admin dashboard yet | Open | Build after citizen app flow is stable |
| No SLA/escalation workflow yet | Open | Add as a backend workflow after validation |
| No audit log for admin actions | Open | Add before production admin use |

## What Went Wrong Earlier

- We considered Google Maps before confirming whether API keys and billing were acceptable.
- The mobile project initially had no platform runners, so real runtime validation was blocked.
- The generated Android project ignored Gradle wrapper files, which weakens build reproducibility.
- This report had stale and broken content after the project moved forward.

## Immediate Next Plan

1. Keep the mobile project clean and reproducible.
2. Run the backend stack locally.
3. Launch the Flutter web app against the backend.
4. Validate sign-in, registration, complaint submission, map display, detail actions, offline queue behavior, and notifications.
5. Re-run Android debug build with visible Gradle output and fix any native build issue found.
6. Close GitHub issue `#4` only after the live mobile flow is verified.

## Production Notes

Before production release:
- Keep `DB_SYNC=false`.
- Use migrations for every schema change.
- Use production-grade JWT secrets.
- Restrict CORS to real client origins.
- Use real S3-compatible object storage.
- Use a real map tile provider.
- Configure FCM credentials if push delivery is required.
- Add release smoke tests for auth, complaint creation, upload, and notifications.
