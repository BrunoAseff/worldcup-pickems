CREATE TYPE "public"."match_stage" AS ENUM('group_stage', 'round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final');--> statement-breakpoint
CREATE TYPE "public"."participant_source_type" AS ENUM('team', 'group_position', 'best_third_place', 'match_winner', 'match_loser');--> statement-breakpoint
CREATE TABLE "group_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_number" integer NOT NULL,
	"bracket_code" varchar(8) NOT NULL,
	"stage" "match_stage" NOT NULL,
	"stage_match_number" integer NOT NULL,
	"group_round" integer,
	"group_id" uuid,
	"venue_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"home_team_id" uuid,
	"away_team_id" uuid,
	"home_source_type" "participant_source_type" NOT NULL,
	"home_source_ref" varchar(64) NOT NULL,
	"away_source_type" "participant_source_type" NOT NULL,
	"away_source_ref" varchar(64) NOT NULL,
	"source_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name_en" text NOT NULL,
	"name_pt" text NOT NULL,
	"flag_code" varchar(16),
	"federation" varchar(32),
	"is_placeholder" boolean DEFAULT false NOT NULL,
	"placeholder_type" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(96) NOT NULL,
	"name" text NOT NULL,
	"city_name" text NOT NULL,
	"country_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_teams_group_team_idx" ON "group_teams" USING btree ("group_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_code_idx" ON "groups" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_match_number_idx" ON "matches" USING btree ("match_number");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_bracket_code_idx" ON "matches" USING btree ("bracket_code");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_code_idx" ON "teams" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_code_idx" ON "venues" USING btree ("code");