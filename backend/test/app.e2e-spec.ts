import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

process.env.POSTGRES_HOST = process.env.POSTGRES_HOST ?? 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT ?? '5433';
process.env.POSTGRES_USER = process.env.POSTGRES_USER ?? 'postgres';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD ?? 'postgres';
process.env.POSTGRES_DB = process.env.POSTGRES_DB ?? 'my_city';
process.env.DB_SYNC = 'false';
process.env.DB_MIGRATIONS_RUN = 'false';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6380';
process.env.REDIS_REQUIRED = 'true';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'replace-me-access';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'replace-me-refresh';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'my-city-mobile';
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'my-city';
process.env.ENABLE_NOTIFICATION_WORKER = 'false';

jest.setTimeout(120_000);

// Load the data source only after the test environment has been pinned.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dataSource = require('../src/database/data-source').default as typeof import('../src/database/data-source').default;

describe('MyCity API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.query(
      'TRUNCATE TABLE "queue_jobs", "notification_events", "user_devices", "reactions", "comments", "complaints", "users", "districts" RESTART IDENTITY CASCADE',
    );
    await dataSource.destroy();

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('runs the citizen complaint flow and exposes queue state', async () => {
    const unique = Date.now();

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Citizen Demo',
        email: `citizen-${unique}@mycity.local`,
        password: 'Password123!',
      })
      .expect(201);

    const accessToken = registerResponse.body.tokens.accessToken as string;
    expect(accessToken).toBeTruthy();

    const complaintResponse = await request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        description: 'Water leak near the school entrance',
        category: 'water',
        clientRequestId: `e2e-${unique}`,
        location: {
          lat: -1.286389,
          lng: 36.817223,
        },
      })
      .expect(201);

    const complaintId = complaintResponse.body.id as string;
    expect(complaintId).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/v1/complaints/${complaintId}/comments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        body: 'Flooding is getting worse after the rain.',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/complaints/${complaintId}/reactions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'support',
      })
      .expect(201);

    const notificationsResponse = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(notificationsResponse.body)).toBe(true);
    expect(notificationsResponse.body.length).toBeGreaterThan(0);

    const healthResponse = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(healthResponse.body.status).toBe('ok');
    expect(healthResponse.body.database).toBe('ok');
    expect(healthResponse.body.redis).toBe('PONG');
    expect(healthResponse.body.queue).toBeDefined();
    expect(healthResponse.body.notifications).toBeDefined();
  });
});
