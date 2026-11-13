import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_attendance_how" AS ENUM('staff', 'card');
  CREATE TYPE "public"."enum_serve_slots_team" AS ENUM('greeters', 'coffee', 'kids', 'tech', 'parking', 'pantry');
  CREATE TYPE "public"."enum_recaps_status" AS ENUM('draft', 'sent');
  ALTER TYPE "public"."enum_people_source" ADD VALUE 'card' BEFORE 'event';
  ALTER TYPE "public"."enum_people_source" ADD VALUE 'serve' BEFORE 'event';
  ALTER TYPE "public"."enum_inbox_form_type" ADD VALUE 'card';
  CREATE TABLE "sermons_clips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"at" varchar NOT NULL
  );
  
  CREATE TABLE "attendance" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"person_id" integer NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"how" "enum_attendance_how" DEFAULT 'staff',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "serve_slots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"team" "enum_serve_slots_team" NOT NULL,
  	"spots" numeric DEFAULT 2 NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"time" varchar,
  	"notes" varchar,
  	"label" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "signups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"what" varchar,
  	"event_id" integer,
  	"slot_id" integer,
  	"guests" numeric DEFAULT 1,
  	"date" timestamp(3) with time zone,
  	"person_id" integer,
  	"reminder_sent" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "recaps" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject" varchar NOT NULL,
  	"pastor_note" varchar,
  	"sermon_id" integer,
  	"week_of" timestamp(3) with time zone NOT NULL,
  	"announcement" varchar,
  	"show_serve" boolean DEFAULT true,
  	"status" "enum_recaps_status" DEFAULT 'draft' NOT NULL,
  	"sent_at" timestamp(3) with time zone,
  	"sent_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "recaps_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"events_id" integer
  );
  
  ALTER TABLE "events" ADD COLUMN "sign_up" boolean DEFAULT false;
  ALTER TABLE "events" ADD COLUMN "capacity" numeric;
  ALTER TABLE "sermons" ADD COLUMN "series" varchar;
  ALTER TABLE "people" ADD COLUMN "last_seen" timestamp(3) with time zone;
  ALTER TABLE "inbox" ADD COLUMN "meta" jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "attendance_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "serve_slots_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "signups_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "recaps_id" integer;
  ALTER TABLE "sermons_clips" ADD CONSTRAINT "sermons_clips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sermons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "attendance" ADD CONSTRAINT "attendance_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "signups" ADD CONSTRAINT "signups_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "signups" ADD CONSTRAINT "signups_slot_id_serve_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."serve_slots"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "signups" ADD CONSTRAINT "signups_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recaps" ADD CONSTRAINT "recaps_sermon_id_sermons_id_fk" FOREIGN KEY ("sermon_id") REFERENCES "public"."sermons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recaps_rels" ADD CONSTRAINT "recaps_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."recaps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "recaps_rels" ADD CONSTRAINT "recaps_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sermons_clips_order_idx" ON "sermons_clips" USING btree ("_order");
  CREATE INDEX "sermons_clips_parent_id_idx" ON "sermons_clips" USING btree ("_parent_id");
  CREATE INDEX "attendance_person_idx" ON "attendance" USING btree ("person_id");
  CREATE INDEX "attendance_date_idx" ON "attendance" USING btree ("date");
  CREATE INDEX "attendance_updated_at_idx" ON "attendance" USING btree ("updated_at");
  CREATE INDEX "attendance_created_at_idx" ON "attendance" USING btree ("created_at");
  CREATE INDEX "serve_slots_updated_at_idx" ON "serve_slots" USING btree ("updated_at");
  CREATE INDEX "serve_slots_created_at_idx" ON "serve_slots" USING btree ("created_at");
  CREATE INDEX "signups_event_idx" ON "signups" USING btree ("event_id");
  CREATE INDEX "signups_slot_idx" ON "signups" USING btree ("slot_id");
  CREATE INDEX "signups_person_idx" ON "signups" USING btree ("person_id");
  CREATE INDEX "signups_updated_at_idx" ON "signups" USING btree ("updated_at");
  CREATE INDEX "signups_created_at_idx" ON "signups" USING btree ("created_at");
  CREATE INDEX "recaps_sermon_idx" ON "recaps" USING btree ("sermon_id");
  CREATE INDEX "recaps_updated_at_idx" ON "recaps" USING btree ("updated_at");
  CREATE INDEX "recaps_created_at_idx" ON "recaps" USING btree ("created_at");
  CREATE INDEX "recaps_rels_order_idx" ON "recaps_rels" USING btree ("order");
  CREATE INDEX "recaps_rels_parent_idx" ON "recaps_rels" USING btree ("parent_id");
  CREATE INDEX "recaps_rels_path_idx" ON "recaps_rels" USING btree ("path");
  CREATE INDEX "recaps_rels_events_id_idx" ON "recaps_rels" USING btree ("events_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attendance_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_serve_slots_fk" FOREIGN KEY ("serve_slots_id") REFERENCES "public"."serve_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_signups_fk" FOREIGN KEY ("signups_id") REFERENCES "public"."signups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recaps_fk" FOREIGN KEY ("recaps_id") REFERENCES "public"."recaps"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_attendance_id_idx" ON "payload_locked_documents_rels" USING btree ("attendance_id");
  CREATE INDEX "payload_locked_documents_rels_serve_slots_id_idx" ON "payload_locked_documents_rels" USING btree ("serve_slots_id");
  CREATE INDEX "payload_locked_documents_rels_signups_id_idx" ON "payload_locked_documents_rels" USING btree ("signups_id");
  CREATE INDEX "payload_locked_documents_rels_recaps_id_idx" ON "payload_locked_documents_rels" USING btree ("recaps_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sermons_clips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "attendance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "serve_slots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "signups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recaps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recaps_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "sermons_clips" CASCADE;
  DROP TABLE "attendance" CASCADE;
  DROP TABLE "serve_slots" CASCADE;
  DROP TABLE "signups" CASCADE;
  DROP TABLE "recaps" CASCADE;
  DROP TABLE "recaps_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_attendance_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_serve_slots_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_signups_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_recaps_fk";
  
  ALTER TABLE "people" ALTER COLUMN "source" SET DATA TYPE text;
  DROP TYPE "public"."enum_people_source";
  CREATE TYPE "public"."enum_people_source" AS ENUM('visit', 'member', 'salvation', 'connect', 'event', 'in-person', 'other');
  ALTER TABLE "people" ALTER COLUMN "source" SET DATA TYPE "public"."enum_people_source" USING "source"::"public"."enum_people_source";
  ALTER TABLE "inbox" ALTER COLUMN "form_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_inbox_form_type";
  CREATE TYPE "public"."enum_inbox_form_type" AS ENUM('visit', 'member', 'salvation', 'prayer', 'connect');
  ALTER TABLE "inbox" ALTER COLUMN "form_type" SET DATA TYPE "public"."enum_inbox_form_type" USING "form_type"::"public"."enum_inbox_form_type";
  DROP INDEX "payload_locked_documents_rels_attendance_id_idx";
  DROP INDEX "payload_locked_documents_rels_serve_slots_id_idx";
  DROP INDEX "payload_locked_documents_rels_signups_id_idx";
  DROP INDEX "payload_locked_documents_rels_recaps_id_idx";
  ALTER TABLE "events" DROP COLUMN "sign_up";
  ALTER TABLE "events" DROP COLUMN "capacity";
  ALTER TABLE "sermons" DROP COLUMN "series";
  ALTER TABLE "people" DROP COLUMN "last_seen";
  ALTER TABLE "inbox" DROP COLUMN "meta";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "attendance_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "serve_slots_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "signups_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "recaps_id";
  DROP TYPE "public"."enum_attendance_how";
  DROP TYPE "public"."enum_serve_slots_team";
  DROP TYPE "public"."enum_recaps_status";`)
}
