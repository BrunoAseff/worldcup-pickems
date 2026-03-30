import "dotenv/config";
import { getNormalizedTeams } from "./lib/tournament-source";

const isDryRun = process.argv.includes("--dry-run");

const values = getNormalizedTeams().map((team) => ({
  code: team.code,
  nameEn: team.nameEn,
  namePt: team.namePt,
  flagCode: team.flagCode,
  federation: team.federation,
  isPlaceholder: team.isPlaceholder,
  placeholderType: team.placeholderType,
  updatedAt: new Date(),
}));

const main = async () => {
  if (isDryRun) {
    console.log(JSON.stringify({ teams: values.length }, null, 2));
    return;
  }

  const [{ db }, { teams }] = await Promise.all([
    import("@/lib/db/client"),
    import("@/lib/db/schema"),
  ]);

  for (const value of values) {
    await db
      .insert(teams)
      .values(value)
      .onConflictDoUpdate({
        target: teams.code,
        set: value,
      });
  }

  console.log(`Seeded ${values.length} teams`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
