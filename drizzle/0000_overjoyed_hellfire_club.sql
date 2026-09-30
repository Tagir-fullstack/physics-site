CREATE TABLE IF NOT EXISTS "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_key" varchar(64) NOT NULL,
	"clerk_user_id" varchar(64) NOT NULL,
	"variant_code" varchar(16) NOT NULL,
	"variant_fingerprint" varchar(255) NOT NULL,
	"variant_data" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"answers" jsonb,
	"score" smallint,
	"violations" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_attempts_user_key_idx" ON "assessment_attempts" USING btree ("clerk_user_id","assessment_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_attempts_variant_code_idx" ON "assessment_attempts" USING btree ("variant_code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_attempts_fingerprint_idx" ON "assessment_attempts" USING btree ("variant_fingerprint");
