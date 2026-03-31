import "./lib/load-env";
import { asc, eq } from "drizzle-orm";
import { GROUP_STAGE_RECALCULATION_PIPELINE_KEY } from "@/lib/group-stage/recalculation";

type StandingSeed = {
  position: 1 | 2 | 3 | 4;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  recentResults: string;
  qualificationStatus: "qualified" | "third_place" | "eliminated";
};

const buildStandingSeeds = (groupIndex: number): StandingSeed[] => {
  const topEightThird = groupIndex < 8;
  const thirdPoints = topEightThird ? 4 : 1;
  const thirdGoalDifference = topEightThird ? 3 - groupIndex : -3 - (groupIndex - 8);
  const thirdGoalsFor = topEightThird ? 4 : 1;

  return [
    {
      position: 1,
      points: 7,
      played: 3,
      wins: 2,
      draws: 1,
      losses: 0,
      goalsFor: 6,
      goalsAgainst: 2,
      goalDifference: 4,
      recentResults: "WDW",
      qualificationStatus: "qualified",
    },
    {
      position: 2,
      points: 5,
      played: 3,
      wins: 1,
      draws: 2,
      losses: 0,
      goalsFor: 3,
      goalsAgainst: 2,
      goalDifference: 1,
      recentResults: "DWD",
      qualificationStatus: "qualified",
    },
    {
      position: 3,
      points: thirdPoints,
      played: 3,
      wins: topEightThird ? 1 : 0,
      draws: topEightThird ? 1 : 1,
      losses: topEightThird ? 1 : 2,
      goalsFor: thirdGoalsFor,
      goalsAgainst: thirdGoalsFor - thirdGoalDifference,
      goalDifference: thirdGoalDifference,
      recentResults: topEightThird ? "LDW" : "DLL",
      qualificationStatus: "third_place",
    },
    {
      position: 4,
      points: 0,
      played: 3,
      wins: 0,
      draws: 0,
      losses: 3,
      goalsFor: 1,
      goalsAgainst: 6,
      goalDifference: -5,
      recentResults: "LLL",
      qualificationStatus: "eliminated",
    },
  ];
};

const main = async () => {
  const [{ db, postgresClient }, schema] = await Promise.all([
    import("@/lib/db/client"),
    import("@/lib/db/schema"),
  ]);

  const { groups, groupTeams, teams, users, recalculationRuns, groupStandings } = schema;

  try {
    const [adminUser, groupRecords, groupTeamRecords] = await Promise.all([
      db
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.role, "admin"))
        .then((rows) => rows[0] ?? null),
      db.select().from(groups).orderBy(asc(groups.code)),
      db
        .select({
          groupId: groupTeams.groupId,
          teamId: groupTeams.teamId,
          teamName: teams.namePt,
        })
        .from(groupTeams)
        .innerJoin(teams, eq(groupTeams.teamId, teams.id))
        .orderBy(asc(groupTeams.groupId), asc(teams.namePt)),
    ]);

    if (!adminUser) {
      throw new Error("Crie um usuário admin antes de rodar o mock do mata-mata.");
    }

    const [run] = await db
      .insert(recalculationRuns)
      .values({
        pipelineKey: GROUP_STAGE_RECALCULATION_PIPELINE_KEY,
        triggeredByUserId: adminUser.id,
      })
      .returning({ id: recalculationRuns.id });

    for (const [groupIndex, group] of groupRecords.entries()) {
      const teamsInGroup = groupTeamRecords
        .filter((record) => record.groupId === group.id)
        .sort((left, right) => left.teamName.localeCompare(right.teamName));

      if (teamsInGroup.length !== 4) {
        throw new Error(`Grupo ${group.code} deveria ter 4 seleções, mas possui ${teamsInGroup.length}.`);
      }

      const seeds = buildStandingSeeds(groupIndex);

      for (const [index, teamRecord] of teamsInGroup.entries()) {
        const seed = seeds[index];

        await db
          .insert(groupStandings)
          .values({
            groupId: group.id,
            teamId: teamRecord.teamId,
            position: seed.position,
            points: seed.points,
            played: seed.played,
            wins: seed.wins,
            draws: seed.draws,
            losses: seed.losses,
            goalsFor: seed.goalsFor,
            goalsAgainst: seed.goalsAgainst,
            goalDifference: seed.goalDifference,
            recentResults: seed.recentResults,
            qualificationStatus: seed.qualificationStatus,
            recalculationRunId: run.id,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [groupStandings.groupId, groupStandings.teamId],
            set: {
              position: seed.position,
              points: seed.points,
              played: seed.played,
              wins: seed.wins,
              draws: seed.draws,
              losses: seed.losses,
              goalsFor: seed.goalsFor,
              goalsAgainst: seed.goalsAgainst,
              goalDifference: seed.goalDifference,
              recentResults: seed.recentResults,
              qualificationStatus: seed.qualificationStatus,
              recalculationRunId: run.id,
              updatedAt: new Date(),
            },
          });
      }
    }

    console.log("Mock do mata-mata aplicado com sucesso.");
    console.log("Os grupos A-H fornecem os 8 melhores terceiros neste cenário.");
  } finally {
    await postgresClient.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
