import "dotenv/config";
import {
  getNormalizedGroupTeams,
  getNormalizedGroups,
  getNormalizedMatches,
  getNormalizedVenues,
} from "./lib/tournament-source";

const isDryRun = process.argv.includes("--dry-run");

const now = new Date();
const groupValues = getNormalizedGroups().map((code) => ({
  code,
  updatedAt: now,
}));
const venueValues = getNormalizedVenues().map((venue) => ({
  code: venue.code,
  name: venue.name,
  cityName: venue.cityName,
  countryName: venue.countryName,
  updatedAt: now,
}));
const normalizedMatches = getNormalizedMatches();

const main = async () => {
  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          groups: groupValues.length,
          venues: venueValues.length,
          matches: normalizedMatches.length,
          groupTeams: getNormalizedGroupTeams().length,
        },
        null,
        2
      )
    );
    return;
  }

  const [{ db }, schema] = await Promise.all([
    import("@/lib/db/client"),
    import("@/lib/db/schema"),
  ]);
  const { groupTeams, groups, matches, teams, venues } = schema;

  await db.transaction(async (tx) => {
    for (const value of groupValues) {
      await tx.insert(groups).values(value).onConflictDoUpdate({
        target: groups.code,
        set: value,
      });
    }

    for (const value of venueValues) {
      await tx.insert(venues).values(value).onConflictDoUpdate({
        target: venues.code,
        set: value,
      });
    }
  });

  const groupRecords = await db.select().from(groups);
  const teamRecords = await db.select().from(teams);
  const venueRecords = await db.select().from(venues);

  const groupIdByCode = new Map(
    groupRecords.map((record) => [record.code, record.id])
  );
  const teamIdByCode = new Map(
    teamRecords.map((record) => [record.code, record.id])
  );
  const venueIdByCode = new Map(
    venueRecords.map((record) => [record.code, record.id])
  );

  const groupTeamValues = getNormalizedGroupTeams().map((value) => {
    const groupId = groupIdByCode.get(value.groupCode);
    const teamId = teamIdByCode.get(value.teamCode);

    if (!groupId || !teamId) {
      throw new Error(
        `Missing group/team relation for ${value.groupCode}:${value.teamCode}`
      );
    }

    return {
      groupId,
      teamId,
      updatedAt: now,
    };
  });

  const matchValues = normalizedMatches.map((match) => {
    const venueId = venueIdByCode.get(match.venueCode);

    if (!venueId) {
      throw new Error(`Missing venue ${match.venueCode}`);
    }

    return {
      matchNumber: match.matchNumber,
      bracketCode: match.bracketCode,
      stage: match.stage,
      stageMatchNumber: match.stageMatchNumber,
      groupRound: match.groupRound,
      groupId: match.groupCode
        ? groupIdByCode.get(match.groupCode) ?? null
        : null,
      venueId,
      scheduledAt: match.scheduledAt,
      homeTeamId: match.homeSource.teamCode
        ? teamIdByCode.get(match.homeSource.teamCode) ?? null
        : null,
      awayTeamId: match.awaySource.teamCode
        ? teamIdByCode.get(match.awaySource.teamCode) ?? null
        : null,
      homeSourceType: match.homeSource.sourceType,
      homeSourceRef: match.homeSource.sourceRef,
      awaySourceType: match.awaySource.sourceType,
      awaySourceRef: match.awaySource.sourceRef,
      sourceLabel: match.sourceLabel,
      updatedAt: now,
    };
  });

  await db.transaction(async (tx) => {
    for (const value of groupTeamValues) {
      await tx.insert(groupTeams).values(value).onConflictDoNothing();
    }

    for (const value of matchValues) {
      await tx.insert(matches).values(value).onConflictDoUpdate({
        target: matches.matchNumber,
        set: value,
      });
    }
  });

  console.log(
    `Seeded ${groupValues.length} groups, ${venueValues.length} venues, ${groupTeamValues.length} group-team relations, and ${matchValues.length} matches`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
