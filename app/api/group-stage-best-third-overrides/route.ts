import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  bestThirdSlotOverrides,
  groupTeams,
  groupTiebreakOverrides,
  groups,
  matches,
  officialResults,
  teams,
} from "@/lib/db/schema";
import { computeGroupStandings } from "@/lib/group-stage/standings";
import { groupStageBestThirdSlotOverrideRequestSchema } from "@/lib/group-stage/best-third-slot-override-schema";
import { getBestThirdSlotKey, getBestThirdStatus } from "@/lib/knockout/best-third";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Apenas administradores podem definir terceiros colocados." },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsedBody = groupStageBestThirdSlotOverrideRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Payload inválido." },
      { status: 400 },
    );
  }

  const [
    groupRecords,
    groupTeamRecords,
    groupMatchRecords,
    officialResultRecords,
    tiebreakOverrideRecords,
    slotRecords,
  ] = await Promise.all([
    db.select({ id: groups.id, code: groups.code }).from(groups),
    db
      .select({
        groupId: groupTeams.groupId,
        teamId: groupTeams.teamId,
        code: teams.code,
        namePt: teams.namePt,
        flagCode: teams.flagCode,
      })
      .from(groupTeams)
      .innerJoin(teams, eq(groupTeams.teamId, teams.id)),
    db
      .select({
        id: matches.id,
        groupId: matches.groupId,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        scheduledAt: matches.scheduledAt,
      })
      .from(matches)
      .where(eq(matches.stage, "group_stage")),
    db
      .select({
        matchId: officialResults.matchId,
        homeScore: officialResults.homeScore,
        awayScore: officialResults.awayScore,
      })
      .from(officialResults)
      .innerJoin(matches, eq(officialResults.matchId, matches.id))
      .where(eq(matches.stage, "group_stage")),
    db.select().from(groupTiebreakOverrides),
    db
      .select({
        stage: matches.stage,
        homeSourceType: matches.homeSourceType,
        homeSourceRef: matches.homeSourceRef,
        awaySourceType: matches.awaySourceType,
        awaySourceRef: matches.awaySourceRef,
      })
      .from(matches)
      .where(eq(matches.stage, "round_of_32"))
      .orderBy(asc(matches.matchNumber)),
  ]);

  const officialMatchIds = new Set(officialResultRecords.map((result) => result.matchId));
  const allGroupsComplete =
    groupRecords.length > 0 &&
    groupRecords.every((group) => {
      const matchIds = groupMatchRecords
        .filter((match) => match.groupId === group.id)
        .map((match) => match.id);

      return matchIds.length > 0 && matchIds.every((matchId) => officialMatchIds.has(matchId));
    });

  if (!allGroupsComplete) {
    return NextResponse.json(
      { error: "Os terceiros colocados só podem ser definidos após o fim de todos os grupos." },
      { status: 409 },
    );
  }

  const officialResultByMatchId = new Map(
    officialResultRecords.map((result) => [
      result.matchId,
      {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
      },
    ]),
  );
  const tiebreakOverrideByGroupId = new Map(
    tiebreakOverrideRecords.map((override) => [
      override.groupId,
      override.orderedTeamIds.split(",").filter(Boolean),
    ]),
  );
  const computedThirdPlaced = groupRecords.flatMap((group) => {
    const teamsInGroup = groupTeamRecords
      .filter((record) => record.groupId === group.id)
      .map((record) => ({
        id: record.teamId,
        code: record.code,
        namePt: record.namePt,
        flagCode: record.flagCode,
      }));
    const matchesInGroup = groupMatchRecords
      .map((match) => {
        if (match.groupId !== group.id) {
          return null;
        }

        const result = officialResultByMatchId.get(match.id);

        if (!match.homeTeamId || !match.awayTeamId || !result) {
          return null;
        }

        return {
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          scheduledAt: match.scheduledAt,
        };
      })
      .filter((match): match is NonNullable<typeof match> => Boolean(match));
    const standings = computeGroupStandings(
      teamsInGroup,
      matchesInGroup,
      tiebreakOverrideByGroupId.get(group.id) ?? null,
    ).standings;

    return standings
      .filter((standing) => standing.position === 3)
      .map((standing) => ({
        groupCode: group.code,
        teamId: standing.teamId,
        position: standing.position,
        points: standing.points,
        goalDifference: standing.goalDifference,
        goalsFor: standing.goalsFor,
      }));
  });

  const bestThirdStatus = getBestThirdStatus(computedThirdPlaced);

  if (!bestThirdStatus.hasBoundaryTie) {
    return NextResponse.json(
      { error: "Não existe empate global entre terceiros pendente de decisão manual." },
      { status: 400 },
    );
  }

  const expectedSlotKeys = slotRecords
    .flatMap((match) => {
      const slotKeys: string[] = [];

      if (match.homeSourceType === "best_third_place") {
        slotKeys.push(getBestThirdSlotKey(match.awaySourceRef));
      }

      if (match.awaySourceType === "best_third_place") {
        slotKeys.push(getBestThirdSlotKey(match.homeSourceRef));
      }

      return slotKeys;
    })
    .sort();
  const receivedSlotKeys = parsedBody.data.assignments
    .map((assignment) => assignment.slotKey)
    .sort();

  if (
    expectedSlotKeys.length !== receivedSlotKeys.length ||
    expectedSlotKeys.some((slotKey, index) => slotKey !== receivedSlotKeys[index])
  ) {
    return NextResponse.json(
      { error: "Os slots enviados não correspondem às vagas de terceiros do mata-mata." },
      { status: 400 },
    );
  }

  const allowedThirdTeamIds = new Set(computedThirdPlaced.map((standing) => standing.teamId));
  const selectedTeamIds = parsedBody.data.assignments.map((assignment) => assignment.teamId);
  const hasUniqueTeams = new Set(selectedTeamIds).size === selectedTeamIds.length;

  if (!hasUniqueTeams) {
    return NextResponse.json(
      { error: "Cada seleção só pode ocupar uma vaga de terceiro colocado." },
      { status: 400 },
    );
  }

  if (!selectedTeamIds.every((teamId) => allowedThirdTeamIds.has(teamId))) {
    return NextResponse.json(
      { error: "As seleções escolhidas precisam ser terceiros colocados válidos." },
      { status: 400 },
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(bestThirdSlotOverrides);

    for (const assignment of parsedBody.data.assignments) {
      await tx.insert(bestThirdSlotOverrides).values({
        slotKey: assignment.slotKey,
        teamId: assignment.teamId,
        decidedByUserId: session.user.id,
        updatedAt: new Date(),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
