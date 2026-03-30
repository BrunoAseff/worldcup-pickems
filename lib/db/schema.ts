import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const matchStageEnum = pgEnum("match_stage", [
  "group_stage",
  "round_of_32",
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "third_place",
  "final",
]);

export const participantSourceTypeEnum = pgEnum("participant_source_type", [
  "team",
  "group_position",
  "best_third_place",
  "match_winner",
  "match_loser",
]);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    nameEn: text("name_en").notNull(),
    namePt: text("name_pt").notNull(),
    flagCode: varchar("flag_code", { length: 16 }),
    federation: varchar("federation", { length: 32 }),
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    placeholderType: varchar("placeholder_type", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("teams_code_idx").on(table.code)],
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 1 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("groups_code_idx").on(table.code)],
);

export const groupTeams = pgTable(
  "group_teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("group_teams_group_team_idx").on(table.groupId, table.teamId)],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 96 }).notNull(),
    name: text("name").notNull(),
    cityName: text("city_name").notNull(),
    countryName: text("country_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("venues_code_idx").on(table.code)],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchNumber: integer("match_number").notNull(),
    bracketCode: varchar("bracket_code", { length: 8 }).notNull(),
    stage: matchStageEnum("stage").notNull(),
    stageMatchNumber: integer("stage_match_number").notNull(),
    groupRound: integer("group_round"),
    groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    homeTeamId: uuid("home_team_id").references(() => teams.id, { onDelete: "set null" }),
    awayTeamId: uuid("away_team_id").references(() => teams.id, { onDelete: "set null" }),
    homeSourceType: participantSourceTypeEnum("home_source_type").notNull(),
    homeSourceRef: varchar("home_source_ref", { length: 64 }).notNull(),
    awaySourceType: participantSourceTypeEnum("away_source_type").notNull(),
    awaySourceRef: varchar("away_source_ref", { length: 64 }).notNull(),
    sourceLabel: text("source_label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("matches_match_number_idx").on(table.matchNumber),
    uniqueIndex("matches_bracket_code_idx").on(table.bracketCode),
  ],
);
