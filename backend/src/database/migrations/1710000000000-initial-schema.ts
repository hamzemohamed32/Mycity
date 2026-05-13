import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "postgis"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('citizen', 'district_admin', 'city_admin', 'system_admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."complaints_category_enum" AS ENUM('waste', 'water', 'roads', 'lighting', 'drainage', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."complaints_status_enum" AS ENUM('pending', 'in_progress', 'resolved')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_events_deliverystatus_enum" AS ENUM('pending', 'delivered', 'failed', 'no_devices')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."queue_jobs_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying,
        "phone" character varying,
        "fullName" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'citizen',
        "districtId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_phone" ON "users" ("phone")`);

    await queryRunner.query(`
      CREATE TABLE "districts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "code" character varying,
        "boundary" geometry(Polygon,4326),
        "supportedCategories" text NOT NULL DEFAULT '',
        CONSTRAINT "PK_districts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_districts_name" ON "districts" ("name")`);

    await queryRunner.query(`
      CREATE TABLE "complaints" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "description" character varying(2000) NOT NULL,
        "imageUrl" character varying,
        "clientRequestId" character varying(120),
        "category" "public"."complaints_category_enum" NOT NULL,
        "status" "public"."complaints_status_enum" NOT NULL DEFAULT 'pending',
        "districtId" uuid,
        "assignedAdminId" uuid,
        "location" geometry(Point,4326) NOT NULL,
        "supportCount" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "createdById" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_complaints_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_complaints_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_complaints_district" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_complaints_status" ON "complaints" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_complaints_districtId" ON "complaints" ("districtId")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_complaints_createdBy_clientRequestId" ON "complaints" ("createdById", "clientRequestId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "body" character varying(1000) NOT NULL,
        "complaintId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_comments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_comments_complaint" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_comments_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "reactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" character varying NOT NULL DEFAULT 'support',
        "complaintId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reactions_complaint" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_reactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_reactions_complaint_user" ON "reactions" ("complaintId", "userId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_devices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "platform" character varying NOT NULL,
        "appVersion" character varying NOT NULL,
        "fcmToken" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_devices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_devices_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_devices_user_token" ON "user_devices" ("userId", "fcmToken")`,
    );

    await queryRunner.query(`
      CREATE TABLE "notification_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "complaintId" uuid,
        "title" character varying(120) NOT NULL,
        "body" character varying(500) NOT NULL,
        "type" character varying(60) NOT NULL DEFAULT 'general',
        "isRead" boolean NOT NULL DEFAULT false,
        "deliveryStatus" "public"."notification_events_deliverystatus_enum" NOT NULL DEFAULT 'pending',
        "deliveryAttempts" integer NOT NULL DEFAULT 0,
        "deliveredAt" TIMESTAMPTZ,
        "lastDeliveryError" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_events_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_notification_events_complaint" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notification_events_userId" ON "notification_events" ("userId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_events_complaintId" ON "notification_events" ("complaintId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "queue_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" character varying(120) NOT NULL,
        "dedupeKey" character varying(200),
        "payload" jsonb NOT NULL,
        "status" "public"."queue_jobs_status_enum" NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 5,
        "runAfter" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lockedAt" TIMESTAMPTZ,
        "processedAt" TIMESTAMPTZ,
        "lastError" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_queue_jobs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_queue_jobs_type" ON "queue_jobs" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_queue_jobs_status" ON "queue_jobs" ("status")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_queue_jobs_dedupeKey" ON "queue_jobs" ("dedupeKey")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_queue_jobs_dedupeKey"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_queue_jobs_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_queue_jobs_type"`);
    await queryRunner.query(`DROP TABLE "queue_jobs"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_notification_events_complaintId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_events_userId"`);
    await queryRunner.query(`DROP TABLE "notification_events"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_user_devices_user_token"`);
    await queryRunner.query(`DROP TABLE "user_devices"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_reactions_complaint_user"`);
    await queryRunner.query(`DROP TABLE "reactions"`);

    await queryRunner.query(`DROP TABLE "comments"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_complaints_createdBy_clientRequestId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_complaints_districtId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_complaints_status"`);
    await queryRunner.query(`DROP TABLE "complaints"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_districts_name"`);
    await queryRunner.query(`DROP TABLE "districts"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_users_phone"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "public"."queue_jobs_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notification_events_deliverystatus_enum"`);
    await queryRunner.query(`DROP TYPE "public"."complaints_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."complaints_category_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
