ALTER TABLE "match_predictions" ADD COLUMN "predicted_home_team_id" uuid;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD COLUMN "predicted_away_team_id" uuid;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD COLUMN "predicted_advancing_team_id" uuid;--> statement-breakpoint
ALTER TABLE "official_results" ADD COLUMN "advancing_team_id" uuid;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_predicted_home_team_id_teams_id_fk" FOREIGN KEY ("predicted_home_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_predicted_away_team_id_teams_id_fk" FOREIGN KEY ("predicted_away_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_predicted_advancing_team_id_teams_id_fk" FOREIGN KEY ("predicted_advancing_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_results" ADD CONSTRAINT "official_results_advancing_team_id_teams_id_fk" FOREIGN KEY ("advancing_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;