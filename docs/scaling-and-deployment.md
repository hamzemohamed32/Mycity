# Scaling And Deployment

## Target Load
- Registered users: up to `10,000,000`
- Concurrent users: up to `1,000,000`
- Primary hot paths:
  - map feed reads
  - complaint detail reads
  - complaint creation
  - status updates from district admins
  - push notification fan-out

## Deployment Shape
- API tier:
  - stateless NestJS replicas behind a global load balancer
  - separate autoscaling pools for read-heavy traffic and admin traffic if needed
  - readiness and liveness should use `/api/v1/health`
- Data tier:
  - PostgreSQL primary for writes
  - read replicas for complaint feeds, map browsing, and dashboards
  - PostGIS for district boundary checks and nearby complaint queries
- Cache tier:
  - Redis cluster for hot query cache, rate limits, idempotency keys, and job coordination
- Async tier:
  - queue workers for media processing, search sync, analytics export, and FCM fan-out
- Storage tier:
  - object storage plus CDN for complaint media

## Read Path Strategy
- Serve public and citizen complaint list reads through cached geo tiles or bounded map windows.
- Use cursor pagination for all large lists.
- Keep map payloads compact: summary fields only, not full complaint bodies.
- Cache district/category/status combinations with short TTLs.

## Write Path Strategy
- Use direct-to-object-storage uploads for images.
- Keep `POST /complaints` focused on validation, district lookup, durable write, and event emission.
- Make offline client retries safe with client request IDs and idempotency keys.
- Move notifications, analytics, and search indexing out of the request path.

## Database Strategy
- Partition `complaints` by time once volume grows beyond single-table comfort.
- Index:
  - `status`
  - `category`
  - `districtId`
  - `createdAt`
  - geospatial `location`
- Store only current workflow state on the main row; keep detailed audit/state history append-only.

## Security
- JWT access and refresh rotation
- RBAC on all admin paths
- district scoping enforced server-side
- throttling by user, IP, and device token
- signed upload sessions for media
- audit logging for admin actions

## Production Config Surface
- non-secret runtime config belongs in:
  - `infra/k8s/api-configmap.yaml`
- secrets belong in:
  - `infra/k8s/api-secret.example.yaml`
- one-off schema changes should run through:
  - `infra/k8s/api-migrate-job.yaml`
- traffic entrypoint should target:
  - `infra/k8s/api-service.yaml`

## Observability
- tracing from request to DB call to async job
- dashboards for:
  - p95/p99 API latency
  - DB saturation
  - Redis hit ratio
  - queue lag
  - FCM delivery success
  - complaint creation failure rate
- alerts on:
  - replica lag
  - queue backlog spikes
  - auth failure anomalies
  - sustained 5xx rate

## Rollout Order
1. core auth + complaint write path
2. district assignment + admin workflow
3. comments + reactions
4. FCM registration + status notifications
5. offline sync and upload hardening
6. read replicas, queue workers, search, and analytics separation

## Release Discipline
- do not roll the deployment before migrations succeed
- keep `DB_SYNC=false` in every non-local environment
- treat Redis as required for production startup
- keep object storage credentials and FCM credentials outside the repo
