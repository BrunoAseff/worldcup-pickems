import { and, asc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  bestThirdSlotOverrides,
  groupStandings,
  groups,
  matches,
  officialResults,
} from "@/lib/db/schema";
import { getBestThirdStatus } from "@/lib/knockout/best-third";
import { knockoutOfficialResultRequestSchema } from "@/lib/knockout/result-schema";
import { buildOfficialKnockoutParticipants, GroupStandingRecord, MatchRecord } from "@/lib/recalculation/core-logic";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem lançar resultados." }, { status: 403 });
  }

  const parsedBody = knockoutOfficialResultRequestSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Payload inválido." },
      { status: 400 },
    );
  }

  const [match, knockoutMatchRecords, knockoutOfficialResultRecords, standingRecords, bestThirdOverrideRecords] =
    await Promise.all([
      db
        .select({
          id: matches.id,
          stage: matches.stage,
          homeTeamId: matches.homeTeamId,
          awayTeamId: matches.awayTeamId,
        })
        .from(matches)
        .where(and(eq(matches.id, parsedBody.data.matchId), ne(matches.stage, "group_stage")))
        .limit(1)
        .then((records) => records[0]),
      db
        .select({
          id: matches.id,
          matchNumber: matches.matchNumber,
          bracketCode: matches.bracketCode,
          stage: matches.stage,
          stageMatchNumber: matches.stageMatchNumber,
          scheduledAt: matches.scheduledAt,
          groupId: matches.groupId,
          homeTeamId: matches.homeTeamId,
          awayTeamId: matches.awayTeamId,
          homeSourceType: matches.homeSourceType,
          homeSourceRef: matches.homeSourceRef,
          awaySourceType: matches.awaySourceType,
          awaySourceRef: matches.awaySourceRef,
        })
        .from(matches)
        .where(ne(matches.stage, "group_stage"))
        .orderBy(asc(matches.matchNumber)),
      db
        .select({
          matchId: officialResults.matchId,
          homeScore: officialResults.homeScore,
          awayScore: officialResults.awayScore,
          advancingTeamId: officialResults.advancingTeamId,
        })
        .from(officialResults)
        .innerJoin(matches, eq(officialResults.matchId, matches.id))
        .where(ne(matches.stage, "group_stage")),
      db
        .select({
          groupId: groupStandings.groupId,
          groupCode: groups.code,
          teamId: groupStandings.teamId,
          position: groupStandings.position,
          points: groupStandings.points,
          played: groupStandings.played,
          wins: groupStandings.wins,
          draws: groupStandings.draws,
          losses: groupStandings.losses,
          goalsFor: groupStandings.goalsFor,
          goalsAgainst: groupStandings.goalsAgainst,
          goalDifference: groupStandings.goalDifference,
          recentResults: groupStandings.recentResults,
          qualificationStatus: groupStandings.qualificationStatus,
        })
        .from(groupStandings)
        .innerJoin(groups, eq(groupStandings.groupId, groups.id)),
      db
        .select({
          slotKey: bestThirdSlotOverrides.slotKey,
          teamId: bestThirdSlotOverrides.teamId,
        })
        .from(bestThirdSlotOverrides),
    ]);

  if (!match) {
    return NextResponse.json({ error: "Partida inválida." }, { status: 404 });
  }

  const [existingResult] = await db
    .select({ id: officialResults.id })
    .from(officialResults)
    .where(eq(officialResults.matchId, parsedBody.data.matchId))
    .limit(1);

  if (parsedBody.data.homeScore === null && parsedBody.data.awayScore === null) {
    if (!existingResult) {
      return NextResponse.json({ ok: true, action: "noop" });
    }

    await db.delete(officialResults).where(eq(officialResults.matchId, parsedBody.data.matchId));
    return NextResponse.json({ ok: true, action: "deleted" });
  }

  const { homeScore, awayScore } = parsedBody.data;

  if (homeScore === null || awayScore === null) {
    return NextResponse.json({ error: "Preencha os dois placares." }, { status: 400 });
  }

  const officialResultByMatchId = new Map(
    knockoutOfficialResultRecords.map((result) => [result.matchId, result]),
  );
  const standingByGroupPosition = new Map(
    standingRecords.map((standing) => [`${standing.groupCode}${standing.position}`, standing]),
  );
  const bestThirdSlotAssignments = new Map(
    bestThirdOverrideRecords.map((override) => [override.slotKey, override.teamId]),
  );
  const bestThirdQualifiedGroupCodes =
    bestThirdSlotAssignments.size > 0
      ? []
      : getBestThirdStatus(standingRecords).qualifiedGroupCodes;
  const participantsByMatchId = buildOfficialKnockoutParticipants(
    knockoutMatchRecords as MatchRecord[],
    standingByGroupPosition as Map<string, GroupStandingRecord>,
    officialResultByMatchId,
    bestThirdQualifiedGroupCodes,
    bestThirdSlotAssignments.size > 0 ? bestThirdSlotAssignments : undefined,
  );
  const resolvedParticipants = participantsByMatchId.get(match.id) ?? {
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  };

  const advancingTeamId =
    homeScore === awayScore
      ? parsedBody.data.advancingTeamId
      : homeScore > awayScore
        ? resolvedParticipants.homeTeamId
        : resolvedParticipants.awayTeamId;

  if (homeScore === awayScore) {
    if (!resolvedParticipants.homeTeamId || !resolvedParticipants.awayTeamId) {
      return NextResponse.json(
        { error: "Os participantes da partida ainda não estão definidos." },
        { status: 409 },
      );
    }

    if (
      advancingTeamId !== resolvedParticipants.homeTeamId &&
      advancingTeamId !== resolvedParticipants.awayTeamId
    ) {
      return NextResponse.json(
        { error: "A seleção classificada precisa ser uma das duas da partida." },
        { status: 400 },
      );
    }
  }

  await db
    .insert(officialResults)
    .values({
      matchId: parsedBody.data.matchId,
      homeScore,
      awayScore,
      advancingTeamId: advancingTeamId ?? null,
      enteredByUserId: session.user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: officialResults.matchId,
      set: {
        homeScore,
        awayScore,
        advancingTeamId: advancingTeamId ?? null,
        enteredByUserId: session.user.id,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true, action: existingResult ? "updated" : "created" });
}
