CREATE TABLE "user_score_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_points" integer NOT NULL,
	"rank_position" integer NOT NULL,
	"recalculation_run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_score_snapshots" ADD CONSTRAINT "user_score_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_score_snapshots" ADD CONSTRAINT "user_score_snapshots_recalculation_run_id_recalculation_runs_id_fk" FOREIGN KEY ("recalculation_run_id") REFERENCES "public"."recalculation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_score_snapshots_user_id_idx" ON "user_score_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_score_snapshots_rank_position_idx" ON "user_score_snapshots" USING btree ("rank_position");--> statement-breakpoint
CREATE INDEX "user_score_snapshots_recalculation_run_id_idx" ON "user_score_snapshots" USING btree ("recalculation_run_id");