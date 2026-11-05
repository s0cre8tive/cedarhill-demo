import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_people_source" ADD VALUE 'connect' BEFORE 'event';
  ALTER TYPE "public"."enum_inbox_form_type" ADD VALUE 'connect';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people" ALTER COLUMN "source" SET DATA TYPE text;
  DROP TYPE "public"."enum_people_source";
  CREATE TYPE "public"."enum_people_source" AS ENUM('visit', 'member', 'salvation', 'event', 'in-person', 'other');
  ALTER TABLE "people" ALTER COLUMN "source" SET DATA TYPE "public"."enum_people_source" USING "source"::"public"."enum_people_source";
  ALTER TABLE "inbox" ALTER COLUMN "form_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_inbox_form_type";
  CREATE TYPE "public"."enum_inbox_form_type" AS ENUM('visit', 'member', 'salvation', 'prayer');
  ALTER TABLE "inbox" ALTER COLUMN "form_type" SET DATA TYPE "public"."enum_inbox_form_type" USING "form_type"::"public"."enum_inbox_form_type";`)
}
