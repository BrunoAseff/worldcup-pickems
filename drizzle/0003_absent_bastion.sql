CREATE TYPE "public"."qualification_status" AS ENUM('qualified', 'third_place', 'eliminated');--> statement-breakpoint
CREATE TABLE "group_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"points" integer NOT NULL,
	"played" integer NOT NULL,
	"wins" integer NOT NULL,
	"draws" integer NOT NULL,
	"losses" integer NOT NULL,
	"goals_for" integer NOT NULL,
	"goals_against" integer NOT NULL,
	"goal_difference" integer NOT NULL,
	"recent_results" varchar(8) DEFAULT '' NOT NULL,
	"qualification_status" "qualification_status" NOT NULL,
	"recalculation_run_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"entered_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recalculation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_key" varchar(64) NOT NULL,
	"triggered_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_standings" ADD CONSTRAINT "group_standings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_standings" ADD CONSTRAINT "group_standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_standings" ADD CONSTRAINT "group_standings_recalculation_run_id_recalculation_runs_id_fk" FOREIGN KEY ("recalculation_run_id") REFERENCES "public"."recalculation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_results" ADD CONSTRAINT "official_results_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_results" ADD CONSTRAINT "official_results_entered_by_user_id_users_id_fk" FOREIGN KEY ("entered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recalculation_runs" ADD CONSTRAINT "recalculation_runs_triggered_by_user_id_users_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_standings_group_team_idx" ON "group_standings" USING btree ("group_id","team_id");--> statement-breakpoint
CREATE INDEX "group_standings_group_id_idx" ON "group_standings" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_standings_team_id_idx" ON "group_standings" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "group_standings_recalculation_run_id_idx" ON "group_standings" USING btree ("recalculation_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "official_results_match_id_idx" ON "official_results" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "official_results_entered_by_user_id_idx" ON "official_results" USING btree ("entered_by_user_id");--> statement-breakpoint
CREATE INDEX "recalculation_runs_pipeline_key_idx" ON "recalculation_runs" USING btree ("pipeline_key");--> statement-breakpoint
CREATE INDEX "recalculation_runs_triggered_by_user_id_idx" ON "recalculation_runs" USING btree ("triggered_by_user_id");