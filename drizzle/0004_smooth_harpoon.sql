CREATE TABLE "group_tiebreak_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"ordered_team_ids" text NOT NULL,
	"decided_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_tiebreak_overrides" ADD CONSTRAINT "group_tiebreak_overrides_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_tiebreak_overrides" ADD CONSTRAINT "group_tiebreak_overrides_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_tiebreak_overrides_group_id_idx" ON "group_tiebreak_overrides" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_tiebreak_overrides_decided_by_user_id_idx" ON "group_tiebreak_overrides" USING btree ("decided_by_user_id");