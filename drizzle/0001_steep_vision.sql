CREATE TABLE "class_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"last_name" varchar(60) NOT NULL,
	"first_name" varchar(60) NOT NULL,
	"group_name" varchar(40) NOT NULL,
	"normalized_identity" varchar(180) NOT NULL,
	"join_token_hash" varchar(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_clerk_id" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"subject" varchar(120),
	"invite_code" varchar(12) NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_test_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"variant_code" varchar(16) NOT NULL,
	"variant_data" jsonb NOT NULL,
	"answers" jsonb,
	"score" integer,
	"max_score" integer NOT NULL,
	"violations" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teacher_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_clerk_id" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"language" varchar(8) DEFAULT 'ru' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"duration_minutes" smallint DEFAULT 30 NOT NULL,
	"calculator_allowed" boolean DEFAULT true NOT NULL,
	"shuffle_questions" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source_filename" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "test_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"owner_clerk_id" varchar(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"order_no" integer NOT NULL,
	"section" varchar(160),
	"difficulty" varchar(20),
	"kind" varchar(20) NOT NULL,
	"prompt" text NOT NULL,
	"points" smallint DEFAULT 1 NOT NULL,
	"config" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_class_id_teacher_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."teacher_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_test_attempts" ADD CONSTRAINT "teacher_test_attempts_assignment_id_test_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."test_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_test_attempts" ADD CONSTRAINT "teacher_test_attempts_student_id_class_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."class_students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_assignments" ADD CONSTRAINT "test_assignments_test_id_teacher_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."teacher_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_assignments" ADD CONSTRAINT "test_assignments_class_id_teacher_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."teacher_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_test_id_teacher_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."teacher_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_students_class_idx" ON "class_students" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_students_identity_idx" ON "class_students" USING btree ("class_id","normalized_identity");--> statement-breakpoint
CREATE UNIQUE INDEX "class_students_token_idx" ON "class_students" USING btree ("join_token_hash");--> statement-breakpoint
CREATE INDEX "teacher_classes_owner_idx" ON "teacher_classes" USING btree ("owner_clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_classes_invite_idx" ON "teacher_classes" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "teacher_test_attempts_assignment_idx" ON "teacher_test_attempts" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "teacher_test_attempts_student_idx" ON "teacher_test_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_test_attempts_assignment_student_idx" ON "teacher_test_attempts" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_test_attempts_variant_idx" ON "teacher_test_attempts" USING btree ("variant_code");--> statement-breakpoint
CREATE INDEX "teacher_tests_owner_idx" ON "teacher_tests" USING btree ("owner_clerk_id");--> statement-breakpoint
CREATE INDEX "teacher_tests_status_idx" ON "teacher_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_assignments_owner_idx" ON "test_assignments" USING btree ("owner_clerk_id");--> statement-breakpoint
CREATE INDEX "test_assignments_class_idx" ON "test_assignments" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_assignments_test_class_idx" ON "test_assignments" USING btree ("test_id","class_id");--> statement-breakpoint
CREATE INDEX "test_questions_test_idx" ON "test_questions" USING btree ("test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_questions_order_idx" ON "test_questions" USING btree ("test_id","order_no");