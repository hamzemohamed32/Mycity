# Release Checklist

## Pre-release
- confirm `main` is green on:
  - backend
  - validate-compose
- confirm the Docker image tag for this release
- confirm production PostgreSQL and Redis endpoints are reachable
- confirm production secrets are present:
  - `POSTGRES_PASSWORD`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `FCM_*` if push delivery is enabled
  - `STORAGE_ACCESS_KEY_ID`
  - `STORAGE_SECRET_ACCESS_KEY`
- confirm object storage bucket and public base URL are correct

## Database
- apply the config map and secret updates first
- run the migration job:
  - `infra/k8s/api-migrate-job.yaml`
- verify the job completes successfully before rolling the API deployment

## API rollout
- apply:
  - `infra/k8s/api-configmap.yaml`
  - `infra/k8s/api-service.yaml`
  - `infra/k8s/api-deployment.yaml`
- verify deployment health on `/api/v1/health`
- confirm queue stats and Redis connectivity from the health payload

## Application checks
- register or sign in through the mobile app
- create a complaint
- add a comment
- add a support reaction
- verify notifications can be listed for the user

## Post-release
- check API latency and error rate
- check queue backlog and failed jobs
- check notification delivery state distribution
- confirm there are no repeated migration job failures
