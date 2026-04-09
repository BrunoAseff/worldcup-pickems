import "./lib/load-env";
import { and, asc, eq, ne } from "drizzle-orm";
import {
  ApplicationRecalculationConflictError,
  recalculateApplicationCore,
} from "@/lib/recalculation/core";

type ScenarioName =
  | "group-tiebreak"
  | "best-third-boundary-tie"
  | "knockout-draw"
  | "full-tournament-edge-cases";

type MatchScore = {
  homeScore: number;
  awayScore: number;
};

type GroupTemplate = Record<`${number}-${number}`, MatchScore>;

const parseArgument = (name: string) => {
  const prefix = `--${name}=`;
  const entry = process.argv.find((value) => value.startsWith(prefix));

  return entry ? entry.slice(prefix.length) : undefined;
};

const scenarioNames = new Set<ScenarioName>([
  "group-tiebreak",
  "best-third-boundary-tie",
  "knockout-draw",
  "full-tournament-edge-cases",
]);

const groupTiebreakTemplate: GroupTemplate = {
  "0-1": { homeScore: 0, awayScore: 0 },
  "0-2": { homeScore: 0, awayScore: 0 },
  "0-3": { homeScore: 0, awayScore: 0 },
  "1-2": { homeScore: 0, awayScore: 0 },
  "1-3": { homeScore: 0, awayScore: 0 },
  "2-3": { homeScore: 0, awayScore: 0 },
};

const strongThirdTemplate: GroupTemplate = {
  "0-1": { homeScore: 1, awayScore: 0 },
  "0-2": { homeScore: 1, awayScore: 0 },
  "0-3": { homeScore: 0, awayScore: 0 },
  "1-2": { homeScore: 0, awayScore: 0 },
  "1-3": { homeScore: 2, awayScore: 0 },
  "2-3": { homeScore: 1, awayScore: 0 },
};

const boundaryThirdTemplate: GroupTemplate = {
  "0-1": { homeScore: 1, awayScore: 0 },
  "0-2": { homeScore: 1, awayScore: 0 },
  "0-3": { homeScore: 1, awayScore: 0 },
  "1-2": { homeScore: 1, awayScore: 0 },
  "1-3": { homeScore: 1, awayScore: 0 },
  "2-3": { homeScore: 1, awayScore: 0 },
};

const weakThirdTemplate: GroupTemplate = {
  "0-1": { homeScore: 0, awayScore: 0 },
  "0-2": { homeScore: 1, awayScore: 0 },
  "0-3": { homeScore: 1, awayScore: 0 },
  "1-2": { homeScore: 1, awayScore: 0 },
  "1-3": { homeScore: 0, awayScore: 0 },
  "2-3": { homeScore: 0, awayScore: 0 },
};

const secondThirdTieTemplate: GroupTemplate = {
  "0-1": { homeScore: 1, awayScore: 0 },
  "0-2": { homeScore: 1, awayScore: 0 },
  "0-3": { homeScore: 1, awayScore: 0 },
  "1-2": { homeScore: 0, awayScore: 0 },
  "1-3": { homeScore: 1, awayScore: 0 },
  "2-3": { homeScore: 1, awayScore: 0 },
};

const resetKnockoutParticipants = async ({
  db,
  matches,
  teamIdByCode,
}: {
  db: Awaited<typeof import("@/lib/db/client")>["db"];
  matches: Array<{
    id: string;
    homeSourceType: "team" | "group_position" | "best_third_place" | "match_winner" | "match_loser";
    homeSourceRef: string;
    awaySourceType: "team" | "group_position" | "best_third_place" | "match_winner" | "match_loser";
    awaySourceRef: string;
  }>;
  teamIdByCode: Map<string, string>;
}) => {
  const { matches: matchesTable } = await import("@/lib/db/schema");

  for (const match of matches) {
    await db
      .update(matchesTable)
      .set({
        homeTeamId:
          match.homeSourceType === "team"
            ? (teamIdByCode.get(match.homeSourceRef) ?? null)
            : null,
        awayTeamId:
          match.awaySourceType === "team"
            ? (teamIdByCode.get(match.awaySourceRef) ?? null)
            : null,
        updatedAt: new Date(),
      })
      .where(eq(matchesTable.id, match.id));
  }
};

const resolveGroupThirdTeamId = ({
  groupCode,
  groupByCode,
  groupTeamsByGroupId,
}: {
  groupCode: string;
  groupByCode: Map<string, { id: string; code: string }>;
  groupTeamsByGroupId: Map<string, Array<{ teamId: string; teamName: string }>>;
}) => {
  const group = groupByCode.get(groupCode);

  if (!group) {
    throw new Error(`Grupo ${groupCode} não encontrado.`);
  }

  const teamsInGroup = [...(groupTeamsByGroupId.get(group.id) ?? [])].sort((left, right) =>
    left.teamName.localeCompare(right.teamName),
  );
  const thirdTeam = teamsInGroup[2];

  if (!thirdTeam) {
    throw new Error(`Não foi possível resolver o terceiro colocado do grupo ${groupCode}.`);
  }

  return thirdTeam.teamId;
};

const officialKnockoutScoreForMatch = (
  matchNumber: number,
  homeTeamId: string,
  awayTeamId: string,
) => {
  if (matchNumber % 5 === 0) {
    return {
      homeScore: 1,
      awayScore: 1,
      advancingTeamId: matchNumber % 10 === 0 ? awayTeamId : homeTeamId,
    };
  }

  if (matchNumber % 2 === 0) {
    return {
      homeScore: 2,
      awayScore: 0,
      advancingTeamId: homeTeamId,
    };
  }

  return {
    homeScore: 0,
    awayScore: 1,
    advancingTeamId: awayTeamId,
  };
};

type PlayerStrategy = "exact" | "winner_only" | "mixed" | "wrong";

const groupPredictionForStrategy = (
  strategy: PlayerStrategy,
  official: MatchScore,
  matchNumber: number,
) => {
  if (strategy === "exact") {
    return official;
  }

  if (strategy === "winner_only") {
    if (official.homeScore === official.awayScore) {
      return {
        homeScore: official.homeScore + 1,
        awayScore: official.awayScore + 1,
      };
    }

    return official.homeScore > official.awayScore
      ? { homeScore: 1, awayScore: 0 }
      : { homeScore: 0, awayScore: 1 };
  }

  if (strategy === "mixed") {
    if (matchNumber % 3 === 0) {
      return official;
    }

    if (official.homeScore === official.awayScore) {
      return { homeScore: 1, awayScore: 0 };
    }

    return official.homeScore > official.awayScore
      ? { homeScore: 2, awayScore: 1 }
      : { homeScore: 1, awayScore: 2 };
  }

  if (official.homeScore === official.awayScore) {
    return { homeScore: 1, awayScore: 0 };
  }

  return official.homeScore > official.awayScore
    ? { homeScore: 0, awayScore: 1 }
    : { homeScore: 1, awayScore: 0 };
};

const knockoutPredictionForStrategy = ({
  strategy,
  officialHomeScore,
  officialAwayScore,
  officialAdvancingTeamId,
  homeTeamId,
  awayTeamId,
  matchNumber,
}: {
  strategy: PlayerStrategy;
  officialHomeScore: number;
  officialAwayScore: number;
  officialAdvancingTeamId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchNumber: number;
}) => {
  if (strategy === "exact") {
    return {
      homeScore: officialHomeScore,
      awayScore: officialAwayScore,
      advancingTeamId: officialAdvancingTeamId,
    };
  }

  if (strategy === "winner_only") {
    if (officialHomeScore === officialAwayScore) {
      return {
        homeScore: 0,
        awayScore: 0,
        advancingTeamId: officialAdvancingTeamId,
      };
    }

    return officialAdvancingTeamId === homeTeamId
      ? { homeScore: 1, awayScore: 0, advancingTeamId: homeTeamId }
      : { homeScore: 0, awayScore: 1, advancingTeamId: awayTeamId };
  }

  if (strategy === "mixed") {
    if (matchNumber % 4 === 0) {
      return {
        homeScore: officialHomeScore,
        awayScore: officialAwayScore,
        advancingTeamId: officialAdvancingTeamId,
      };
    }

    if (officialHomeScore === officialAwayScore) {
      return {
        homeScore: 0,
        awayScore: 0,
        advancingTeamId:
          officialAdvancingTeamId === homeTeamId ? awayTeamId : homeTeamId,
      };
    }

    return officialAdvancingTeamId === homeTeamId
      ? { homeScore: 2, awayScore: 1, advancingTeamId: homeTeamId }
      : { homeScore: 1, awayScore: 2, advancingTeamId: awayTeamId };
  }

  if (officialHomeScore === officialAwayScore) {
    return {
      homeScore: 0,
      awayScore: 0,
      advancingTeamId:
        officialAdvancingTeamId === homeTeamId ? awayTeamId : homeTeamId,
    };
  }

  return officialAdvancingTeamId === homeTeamId
    ? { homeScore: 0, awayScore: 1, advancingTeamId: awayTeamId }
    : { homeScore: 1, awayScore: 0, advancingTeamId: homeTeamId };
};

const main = async () => {
  const scenario = parseArgument("scenario") as ScenarioName | undefined;
  const triggeredByUserId = parseArgument("triggered-by");

  if (!scenario || !scenarioNames.has(scenario)) {
    throw new Error(
      "Usage: pnpm seed:scenario --scenario=<group-tiebreak|best-third-boundary-tie|knockout-draw|full-tournament-edge-cases> [--triggered-by=<admin-user-id>]",
    );
  }

  const [{ db, postgresClient }, schema] = await Promise.all([
    import("@/lib/db/client"),
    import("@/lib/db/schema"),
  ]);

  const {
    bestThirdSlotOverrides,
    groupStandings,
    groupTeams,
    groupTiebreakOverrides,
    groups,
    matchPredictions,
    matches,
    officialResults,
    recalculationRuns,
    teams,
    userScoreSnapshots,
    users,
  } = schema;

  try {
    const [adminUser, playerRecords, groupRecords, groupTeamRecords, groupMatchRecords, knockoutMatchRecords, teamRecords] =
      await Promise.all([
        triggeredByUserId
          ? db
              .select({ id: users.id })
              .from(users)
              .where(and(eq(users.id, triggeredByUserId), eq(users.role, "admin")))
              .then((rows) => rows[0] ?? null)
          : db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.role, "admin"))
              .orderBy(asc(users.createdAt))
              .then((rows) => rows[0] ?? null),
        db
          .select({
            id: users.id,
            username: users.username,
          })
          .from(users)
          .where(eq(users.role, "player"))
          .orderBy(asc(users.username)),
        db.select({ id: groups.id, code: groups.code }).from(groups).orderBy(asc(groups.code)),
        db
          .select({
            groupId: groupTeams.groupId,
            teamId: groupTeams.teamId,
            teamName: teams.namePt,
          })
          .from(groupTeams)
          .innerJoin(teams, eq(groupTeams.teamId, teams.id)),
        db
          .select({
            id: matches.id,
            groupId: matches.groupId,
            homeTeamId: matches.homeTeamId,
            awayTeamId: matches.awayTeamId,
          })
          .from(matches)
          .where(eq(matches.stage, "group_stage")),
        db
          .select({
            id: matches.id,
            homeSourceType: matches.homeSourceType,
            homeSourceRef: matches.homeSourceRef,
            awaySourceType: matches.awaySourceType,
            awaySourceRef: matches.awaySourceRef,
          })
          .from(matches)
          .where(ne(matches.stage, "group_stage")),
        db.select({ id: teams.id, code: teams.code }).from(teams),
      ]);

    if (!adminUser) {
      throw new Error("Crie um usuário admin antes de rodar um cenário.");
    }

    const groupByCode = new Map(groupRecords.map((group) => [group.code, group]));
    const teamIdByCode = new Map(teamRecords.map((team) => [team.code, team.id]));
    const groupTeamsByGroupId = new Map<string, Array<{ teamId: string; teamName: string }>>();

    for (const record of groupTeamRecords) {
      const bucket = groupTeamsByGroupId.get(record.groupId) ?? [];
      bucket.push({
        teamId: record.teamId,
        teamName: record.teamName,
      });
      groupTeamsByGroupId.set(record.groupId, bucket);
    }

    await db.transaction(async (tx) => {
      await tx.delete(bestThirdSlotOverrides);
      await tx.delete(groupTiebreakOverrides);
      await tx.delete(matchPredictions);
      await tx.delete(officialResults);
      await tx.delete(groupStandings);
      await tx.delete(userScoreSnapshots);
      await tx.delete(recalculationRuns);
    });

    await resetKnockoutParticipants({
      db,
      matches: knockoutMatchRecords,
      teamIdByCode,
    });

    const insertGroupTemplate = async (groupCode: string, template: GroupTemplate) => {
      const group = groupByCode.get(groupCode);

      if (!group) {
        throw new Error(`Grupo ${groupCode} não encontrado.`);
      }

      const teamsInGroup = [...(groupTeamsByGroupId.get(group.id) ?? [])].sort((left, right) =>
        left.teamName.localeCompare(right.teamName),
      );
      const teamIndexById = new Map(teamsInGroup.map((team, index) => [team.teamId, index]));
      const matchesInGroup = groupMatchRecords.filter((match) => match.groupId === group.id);

      if (teamsInGroup.length !== 4 || matchesInGroup.length !== 6) {
        throw new Error(`Grupo ${groupCode} não está em um formato esperado de 4 seleções e 6 jogos.`);
      }

      for (const match of matchesInGroup) {
        const homeIndex = match.homeTeamId ? teamIndexById.get(match.homeTeamId) : undefined;
        const awayIndex = match.awayTeamId ? teamIndexById.get(match.awayTeamId) : undefined;

        if (homeIndex === undefined || awayIndex === undefined) {
          throw new Error(`Partida do grupo ${groupCode} sem seleções resolvidas.`);
        }

        const [leftIndex, rightIndex] =
          homeIndex < awayIndex ? [homeIndex, awayIndex] : [awayIndex, homeIndex];
        const result = template[`${leftIndex}-${rightIndex}`];

        if (!result) {
          throw new Error(`Template sem resultado para ${groupCode}:${leftIndex}-${rightIndex}.`);
        }

        const orientedResult =
          homeIndex < awayIndex
            ? result
            : {
                homeScore: result.awayScore,
                awayScore: result.homeScore,
              };

        await db.insert(officialResults).values({
          matchId: match.id,
          homeScore: orientedResult.homeScore,
          awayScore: orientedResult.awayScore,
          advancingTeamId: null,
          enteredByUserId: adminUser.id,
          updatedAt: new Date(),
        });
      }
    };

    if (scenario === "group-tiebreak") {
      await insertGroupTemplate("A", groupTiebreakTemplate);

      try {
        await recalculateApplicationCore(adminUser.id);
        throw new Error("O cenário deveria exigir desempate manual de grupo, mas o recálculo passou.");
      } catch (error) {
        if (!(error instanceof ApplicationRecalculationConflictError)) {
          throw error;
        }
      }

      console.log("Cenário aplicado: empate extremo no Grupo A.");
      console.log("Esperado: o recálculo exige desempate manual do grupo.");
      return;
    }

    const slotAssignments =
      scenario === "full-tournament-edge-cases"
        ? ([
            { slotKey: "1A", groupCode: "I" },
            { slotKey: "1B", groupCode: "A" },
            { slotKey: "1D", groupCode: "C" },
            { slotKey: "1E", groupCode: "D" },
            { slotKey: "1G", groupCode: "E" },
            { slotKey: "1I", groupCode: "F" },
            { slotKey: "1K", groupCode: "G" },
            { slotKey: "1L", groupCode: "H" },
          ] as const)
        : ([
            { slotKey: "1A", groupCode: "H" },
            { slotKey: "1B", groupCode: "A" },
            { slotKey: "1D", groupCode: "B" },
            { slotKey: "1E", groupCode: "C" },
            { slotKey: "1G", groupCode: "D" },
            { slotKey: "1I", groupCode: "E" },
            { slotKey: "1K", groupCode: "F" },
            { slotKey: "1L", groupCode: "G" },
          ] as const);

    if (scenario === "full-tournament-edge-cases") {
      await insertGroupTemplate("A", secondThirdTieTemplate);
      await insertGroupTemplate("B", groupTiebreakTemplate);

      for (const code of ["C", "D", "E", "F", "G", "H"] as const) {
        await insertGroupTemplate(code, strongThirdTemplate);
      }

      for (const code of ["I", "J"] as const) {
        await insertGroupTemplate(code, boundaryThirdTemplate);
      }

      for (const code of ["K", "L"] as const) {
        await insertGroupTemplate(code, weakThirdTemplate);
      }
    } else {
      for (const code of ["A", "B", "C", "D", "E", "F", "G"] as const) {
        await insertGroupTemplate(code, strongThirdTemplate);
      }

      for (const code of ["H", "I"] as const) {
        await insertGroupTemplate(code, boundaryThirdTemplate);
      }

      for (const code of ["J", "K", "L"] as const) {
        await insertGroupTemplate(code, weakThirdTemplate);
      }
    }

    if (scenario === "best-third-boundary-tie") {
      try {
        await recalculateApplicationCore(adminUser.id);
        throw new Error("O cenário deveria exigir definição manual dos melhores terceiros, mas o recálculo passou.");
      } catch (error) {
        if (!(error instanceof ApplicationRecalculationConflictError)) {
          throw error;
        }
      }

      console.log("Cenário aplicado: empate na fronteira do 8º/9º melhor terceiro.");
      console.log("Esperado: o recálculo exige seleção manual dos melhores terceiros.");
      return;
    }

    await db.transaction(async (tx) => {
      if (scenario === "full-tournament-edge-cases") {
        for (const groupCode of ["A", "B"] as const) {
          const group = groupByCode.get(groupCode);

          if (!group) {
            throw new Error(`Grupo ${groupCode} não encontrado para o cenário completo.`);
          }

          const orderedTeamIds = [...(groupTeamsByGroupId.get(group.id) ?? [])]
            .sort((left, right) => left.teamName.localeCompare(right.teamName))
            .map((team) => team.teamId);

          await tx.insert(groupTiebreakOverrides).values({
            groupId: group.id,
            orderedTeamIds: orderedTeamIds.join(","),
            decidedByUserId: adminUser.id,
            updatedAt: new Date(),
          });
        }
      }

      for (const assignment of slotAssignments) {
        await tx.insert(bestThirdSlotOverrides).values({
          slotKey: assignment.slotKey,
          teamId: resolveGroupThirdTeamId({
            groupCode: assignment.groupCode,
            groupByCode,
            groupTeamsByGroupId,
          }),
          decidedByUserId: adminUser.id,
          updatedAt: new Date(),
        });
      }
    });

    await recalculateApplicationCore(adminUser.id);

    if (scenario === "full-tournament-edge-cases") {
      const knockoutStageOrder = [
        "round_of_32",
        "round_of_16",
        "quarterfinal",
        "semifinal",
        "third_place",
        "final",
      ] as const;

      for (const stage of knockoutStageOrder) {
        const stageMatches = await db
          .select({
            id: matches.id,
            matchNumber: matches.matchNumber,
            homeTeamId: matches.homeTeamId,
            awayTeamId: matches.awayTeamId,
          })
          .from(matches)
          .where(eq(matches.stage, stage))
          .orderBy(asc(matches.matchNumber));

        for (const match of stageMatches) {
          if (!match.homeTeamId || !match.awayTeamId) {
            throw new Error(`Participantes não resolvidos para ${stage} no jogo ${match.matchNumber}.`);
          }

          const official = officialKnockoutScoreForMatch(
            match.matchNumber,
            match.homeTeamId,
            match.awayTeamId,
          );

          await db
            .insert(officialResults)
            .values({
              matchId: match.id,
              homeScore: official.homeScore,
              awayScore: official.awayScore,
              advancingTeamId: official.advancingTeamId,
              enteredByUserId: adminUser.id,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: officialResults.matchId,
              set: {
                homeScore: official.homeScore,
                awayScore: official.awayScore,
                advancingTeamId: official.advancingTeamId,
                enteredByUserId: adminUser.id,
                updatedAt: new Date(),
              },
            });
        }

        await recalculateApplicationCore(adminUser.id);
      }

      const playerStrategyByUserId = new Map(
        playerRecords.map((player, index) => [
          player.id,
          (["exact", "winner_only", "mixed", "wrong"][index] ?? "mixed") as PlayerStrategy,
        ]),
      );

      const allMatches = await db
        .select({
          id: matches.id,
          matchNumber: matches.matchNumber,
          bracketCode: matches.bracketCode,
          stage: matches.stage,
          homeTeamId: matches.homeTeamId,
          awayTeamId: matches.awayTeamId,
          homeSourceType: matches.homeSourceType,
          homeSourceRef: matches.homeSourceRef,
          awaySourceType: matches.awaySourceType,
          awaySourceRef: matches.awaySourceRef,
        })
        .from(matches)
        .orderBy(asc(matches.matchNumber));
      const officialResultRecords = await db
        .select({
          matchId: officialResults.matchId,
          homeScore: officialResults.homeScore,
          awayScore: officialResults.awayScore,
          advancingTeamId: officialResults.advancingTeamId,
        })
        .from(officialResults);
      const officialResultByMatchId = new Map(
        officialResultRecords.map((result) => [result.matchId, result]),
      );

      for (const player of playerRecords) {
        const strategy = playerStrategyByUserId.get(player.id) ?? "mixed";
        const predictedByBracketCode = new Map<
          string,
          {
            homeTeamId: string | null;
            awayTeamId: string | null;
            advancingTeamId: string | null;
          }
        >();

        for (const match of allMatches) {
          const officialResult = officialResultByMatchId.get(match.id);

          if (!officialResult) {
            continue;
          }

          if (match.stage === "group_stage") {
            const prediction = groupPredictionForStrategy(
              strategy,
              {
                homeScore: officialResult.homeScore,
                awayScore: officialResult.awayScore,
              },
              match.matchNumber,
            );

            await db.insert(matchPredictions).values({
              userId: player.id,
              matchId: match.id,
              predictedHomeScore: prediction.homeScore,
              predictedAwayScore: prediction.awayScore,
              updatedAt: new Date(),
            });
            continue;
          }

          const resolvePredictionParticipant = (
            sourceType: typeof match.homeSourceType,
            sourceRef: string,
            officialTeamId: string | null,
          ) => {
            if (
              sourceType === "team" ||
              sourceType === "group_position" ||
              sourceType === "best_third_place"
            ) {
              return officialTeamId;
            }

            const referenced = predictedByBracketCode.get(sourceRef);

            if (!referenced) {
              return null;
            }

            if (sourceType === "match_winner") {
              return referenced.advancingTeamId;
            }

            if (
              !referenced.advancingTeamId ||
              !referenced.homeTeamId ||
              !referenced.awayTeamId
            ) {
              return null;
            }

            return referenced.advancingTeamId === referenced.homeTeamId
              ? referenced.awayTeamId
              : referenced.homeTeamId;
          };

          const predictedHomeTeamId = resolvePredictionParticipant(
            match.homeSourceType,
            match.homeSourceRef,
            match.homeTeamId,
          );
          const predictedAwayTeamId = resolvePredictionParticipant(
            match.awaySourceType,
            match.awaySourceRef,
            match.awayTeamId,
          );

          if (!predictedHomeTeamId || !predictedAwayTeamId) {
            throw new Error(
              `Não foi possível montar o palpite do jogador ${player.username} para ${match.bracketCode}.`,
            );
          }

          const prediction = knockoutPredictionForStrategy({
            strategy,
            officialHomeScore: officialResult.homeScore,
            officialAwayScore: officialResult.awayScore,
            officialAdvancingTeamId:
              officialResult.advancingTeamId ??
              (officialResult.homeScore > officialResult.awayScore
                ? (match.homeTeamId ?? predictedHomeTeamId)
                : officialResult.awayScore > officialResult.homeScore
                  ? (match.awayTeamId ?? predictedAwayTeamId)
                  : predictedHomeTeamId),
            homeTeamId: predictedHomeTeamId,
            awayTeamId: predictedAwayTeamId,
            matchNumber: match.matchNumber,
          });

          predictedByBracketCode.set(match.bracketCode, {
            homeTeamId: predictedHomeTeamId,
            awayTeamId: predictedAwayTeamId,
            advancingTeamId: prediction.advancingTeamId,
          });

          await db.insert(matchPredictions).values({
            userId: player.id,
            matchId: match.id,
            predictedHomeTeamId,
            predictedAwayTeamId,
            predictedHomeScore: prediction.homeScore,
            predictedAwayScore: prediction.awayScore,
            predictedAdvancingTeamId: prediction.advancingTeamId,
            updatedAt: new Date(),
          });
        }
      }

      await recalculateApplicationCore(adminUser.id);

      console.log("Cenário aplicado: torneio completo com edge cases e palpites dos 4 players.");
      console.log("Inclui: empate entre 2º e 3º no Grupo A, empate extremo no Grupo B e empate na fronteira dos melhores terceiros.");
      console.log("Também semeia resultados oficiais até a final e palpites completos para todos os players.");
      return;
    }

    const [firstKnockoutMatch] = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
      })
      .from(matches)
      .where(eq(matches.stage, "round_of_32"))
      .orderBy(asc(matches.matchNumber))
      .limit(1);

    if (!firstKnockoutMatch?.homeTeamId || !firstKnockoutMatch.awayTeamId) {
      throw new Error("Não foi possível resolver a primeira partida do mata-mata para o cenário de empate.");
    }

    await db.insert(officialResults).values({
      matchId: firstKnockoutMatch.id,
      homeScore: 1,
      awayScore: 1,
      advancingTeamId: firstKnockoutMatch.homeTeamId,
      enteredByUserId: adminUser.id,
      updatedAt: new Date(),
    });

    await recalculateApplicationCore(adminUser.id);

    console.log("Cenário aplicado: mata-mata com empate e vencedor nos pênaltis.");
    console.log("Esperado: a primeira partida do round of 32 termina 1x1 e o mandante avança.");
  } finally {
    await postgresClient.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
