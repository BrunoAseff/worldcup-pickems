CREATE TABLE "best_third_slot_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_key" varchar(8) NOT NULL,
	"team_id" uuid NOT NULL,
	"decided_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "best_third_slot_overrides" ADD CONSTRAINT "best_third_slot_overrides_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "best_third_slot_overrides" ADD CONSTRAINT "best_third_slot_overrides_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "best_third_slot_overrides_slot_key_idx" ON "best_third_slot_overrides" USING btree ("slot_key");--> statement-breakpoint
CREATE UNIQUE INDEX "best_third_slot_overrides_team_id_idx" ON "best_third_slot_overrides" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "best_third_slot_overrides_decided_by_user_id_idx" ON "best_third_slot_overrides" USING btree ("decided_by_user_id");