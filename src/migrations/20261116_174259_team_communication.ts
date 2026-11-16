import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_team_announcements_audience" AS ENUM('all', 'teams', 'campus');
  CREATE TYPE "public"."enum_notifications_type" AS ENUM('mention', 'reply', 'announcement', 'reminder');
  CREATE TYPE "public"."enum_users_notify" AS ENUM('instant', 'daily', 'off');
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'volunteer';
  CREATE TABLE "team_announcements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar,
  	"link" varchar,
  	"attachment_id" integer,
  	"audience" "enum_team_announcements_audience" DEFAULT 'all' NOT NULL,
  	"campus_id" integer,
  	"pinned_until" timestamp(3) with time zone,
  	"author_id" integer,
  	"reminder_sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_announcements_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"teams_id" integer
  );
  
  CREATE TABLE "teams" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"leader_id" integer,
  	"campus_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "teams_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "campuses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"team_id" integer,
  	"author_id" integer,
  	"body" varchar NOT NULL,
  	"parent_id" integer,
  	"attachment_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"body" varchar NOT NULL,
  	"author_id" integer,
  	"record_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comments_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"events_id" integer,
  	"people_id" integer,
  	"sermons_id" integer
  );
  
  CREATE TABLE "notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"recipient_id" integer,
  	"type" "enum_notifications_type" NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar,
  	"from" varchar,
  	"link" varchar,
  	"read_at" timestamp(3) with time zone,
  	"emailed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "read_receipts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer,
  	"announcement_id" integer,
  	"read_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "users" ADD COLUMN "notify" "enum_users_notify" DEFAULT 'instant' NOT NULL;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "team_announcements_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "teams_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "campuses_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "team_posts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "notifications_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "read_receipts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "team_files_id" integer;
  ALTER TABLE "team_announcements" ADD CONSTRAINT "team_announcements_attachment_id_team_files_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."team_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_announcements" ADD CONSTRAINT "team_announcements_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_announcements" ADD CONSTRAINT "team_announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_announcements_rels" ADD CONSTRAINT "team_announcements_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."team_announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_announcements_rels" ADD CONSTRAINT "team_announcements_rels_teams_fk" FOREIGN KEY ("teams_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_users_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teams" ADD CONSTRAINT "teams_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "teams_rels" ADD CONSTRAINT "teams_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "teams_rels" ADD CONSTRAINT "teams_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_posts" ADD CONSTRAINT "team_posts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_posts" ADD CONSTRAINT "team_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_posts" ADD CONSTRAINT "team_posts_parent_id_team_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."team_posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_posts" ADD CONSTRAINT "team_posts_attachment_id_team_files_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."team_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comments_rels" ADD CONSTRAINT "comments_rels_sermons_fk" FOREIGN KEY ("sermons_id") REFERENCES "public"."sermons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_announcement_id_team_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."team_announcements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_files" ADD CONSTRAINT "team_files_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "team_announcements_attachment_idx" ON "team_announcements" USING btree ("attachment_id");
  CREATE INDEX "team_announcements_campus_idx" ON "team_announcements" USING btree ("campus_id");
  CREATE INDEX "team_announcements_author_idx" ON "team_announcements" USING btree ("author_id");
  CREATE INDEX "team_announcements_updated_at_idx" ON "team_announcements" USING btree ("updated_at");
  CREATE INDEX "team_announcements_created_at_idx" ON "team_announcements" USING btree ("created_at");
  CREATE INDEX "team_announcements_rels_order_idx" ON "team_announcements_rels" USING btree ("order");
  CREATE INDEX "team_announcements_rels_parent_idx" ON "team_announcements_rels" USING btree ("parent_id");
  CREATE INDEX "team_announcements_rels_path_idx" ON "team_announcements_rels" USING btree ("path");
  CREATE INDEX "team_announcements_rels_teams_id_idx" ON "team_announcements_rels" USING btree ("teams_id");
  CREATE INDEX "teams_leader_idx" ON "teams" USING btree ("leader_id");
  CREATE INDEX "teams_campus_idx" ON "teams" USING btree ("campus_id");
  CREATE INDEX "teams_updated_at_idx" ON "teams" USING btree ("updated_at");
  CREATE INDEX "teams_created_at_idx" ON "teams" USING btree ("created_at");
  CREATE INDEX "teams_rels_order_idx" ON "teams_rels" USING btree ("order");
  CREATE INDEX "teams_rels_parent_idx" ON "teams_rels" USING btree ("parent_id");
  CREATE INDEX "teams_rels_path_idx" ON "teams_rels" USING btree ("path");
  CREATE INDEX "teams_rels_users_id_idx" ON "teams_rels" USING btree ("users_id");
  CREATE INDEX "campuses_updated_at_idx" ON "campuses" USING btree ("updated_at");
  CREATE INDEX "campuses_created_at_idx" ON "campuses" USING btree ("created_at");
  CREATE INDEX "team_posts_team_idx" ON "team_posts" USING btree ("team_id");
  CREATE INDEX "team_posts_author_idx" ON "team_posts" USING btree ("author_id");
  CREATE INDEX "team_posts_parent_idx" ON "team_posts" USING btree ("parent_id");
  CREATE INDEX "team_posts_attachment_idx" ON "team_posts" USING btree ("attachment_id");
  CREATE INDEX "team_posts_updated_at_idx" ON "team_posts" USING btree ("updated_at");
  CREATE INDEX "team_posts_created_at_idx" ON "team_posts" USING btree ("created_at");
  CREATE INDEX "comments_author_idx" ON "comments" USING btree ("author_id");
  CREATE INDEX "comments_record_key_idx" ON "comments" USING btree ("record_key");
  CREATE INDEX "comments_updated_at_idx" ON "comments" USING btree ("updated_at");
  CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");
  CREATE INDEX "comments_rels_order_idx" ON "comments_rels" USING btree ("order");
  CREATE INDEX "comments_rels_parent_idx" ON "comments_rels" USING btree ("parent_id");
  CREATE INDEX "comments_rels_path_idx" ON "comments_rels" USING btree ("path");
  CREATE INDEX "comments_rels_users_id_idx" ON "comments_rels" USING btree ("users_id");
  CREATE INDEX "comments_rels_events_id_idx" ON "comments_rels" USING btree ("events_id");
  CREATE INDEX "comments_rels_people_id_idx" ON "comments_rels" USING btree ("people_id");
  CREATE INDEX "comments_rels_sermons_id_idx" ON "comments_rels" USING btree ("sermons_id");
  CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id");
  CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");
  CREATE INDEX "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
  CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
  CREATE INDEX "read_receipts_user_idx" ON "read_receipts" USING btree ("user_id");
  CREATE INDEX "read_receipts_announcement_idx" ON "read_receipts" USING btree ("announcement_id");
  CREATE INDEX "read_receipts_updated_at_idx" ON "read_receipts" USING btree ("updated_at");
  CREATE INDEX "read_receipts_created_at_idx" ON "read_receipts" USING btree ("created_at");
  CREATE INDEX "team_files_uploaded_by_idx" ON "team_files" USING btree ("uploaded_by_id");
  CREATE INDEX "team_files_updated_at_idx" ON "team_files" USING btree ("updated_at");
  CREATE INDEX "team_files_created_at_idx" ON "team_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "team_files_filename_idx" ON "team_files" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_announcements_fk" FOREIGN KEY ("team_announcements_id") REFERENCES "public"."team_announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_teams_fk" FOREIGN KEY ("teams_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campuses_fk" FOREIGN KEY ("campuses_id") REFERENCES "public"."campuses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_posts_fk" FOREIGN KEY ("team_posts_id") REFERENCES "public"."team_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comments_fk" FOREIGN KEY ("comments_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_read_receipts_fk" FOREIGN KEY ("read_receipts_id") REFERENCES "public"."read_receipts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_files_fk" FOREIGN KEY ("team_files_id") REFERENCES "public"."team_files"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_team_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("team_announcements_id");
  CREATE INDEX "payload_locked_documents_rels_teams_id_idx" ON "payload_locked_documents_rels" USING btree ("teams_id");
  CREATE INDEX "payload_locked_documents_rels_campuses_id_idx" ON "payload_locked_documents_rels" USING btree ("campuses_id");
  CREATE INDEX "payload_locked_documents_rels_team_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("team_posts_id");
  CREATE INDEX "payload_locked_documents_rels_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("comments_id");
  CREATE INDEX "payload_locked_documents_rels_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("notifications_id");
  CREATE INDEX "payload_locked_documents_rels_read_receipts_id_idx" ON "payload_locked_documents_rels" USING btree ("read_receipts_id");
  CREATE INDEX "payload_locked_documents_rels_team_files_id_idx" ON "payload_locked_documents_rels" USING btree ("team_files_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "team_announcements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "team_announcements_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "teams" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "teams_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "campuses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "team_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "comments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "comments_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "read_receipts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "team_files" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "team_announcements" CASCADE;
  DROP TABLE "team_announcements_rels" CASCADE;
  DROP TABLE "teams" CASCADE;
  DROP TABLE "teams_rels" CASCADE;
  DROP TABLE "campuses" CASCADE;
  DROP TABLE "team_posts" CASCADE;
  DROP TABLE "comments" CASCADE;
  DROP TABLE "comments_rels" CASCADE;
  DROP TABLE "notifications" CASCADE;
  DROP TABLE "read_receipts" CASCADE;
  DROP TABLE "team_files" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_team_announcements_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_teams_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_campuses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_team_posts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_comments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_notifications_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_read_receipts_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_team_files_fk";
  
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'leader');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
  DROP INDEX "payload_locked_documents_rels_team_announcements_id_idx";
  DROP INDEX "payload_locked_documents_rels_teams_id_idx";
  DROP INDEX "payload_locked_documents_rels_campuses_id_idx";
  DROP INDEX "payload_locked_documents_rels_team_posts_id_idx";
  DROP INDEX "payload_locked_documents_rels_comments_id_idx";
  DROP INDEX "payload_locked_documents_rels_notifications_id_idx";
  DROP INDEX "payload_locked_documents_rels_read_receipts_id_idx";
  DROP INDEX "payload_locked_documents_rels_team_files_id_idx";
  ALTER TABLE "users" DROP COLUMN "notify";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "team_announcements_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "teams_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "campuses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "team_posts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "notifications_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "read_receipts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "team_files_id";
  DROP TYPE "public"."enum_team_announcements_audience";
  DROP TYPE "public"."enum_notifications_type";
  DROP TYPE "public"."enum_users_notify";`)
}
