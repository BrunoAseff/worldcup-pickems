import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { groupTeams, groupTiebreakOverrides, matches, officialResults, teams } from "@/lib/db/schema";
import {
  computeGroupStandings,
  isValidManualOverrideWithinConflicts,
} from "@/lib/group-stage/standings";
import { groupStageTiebreakOverrideRequestSchema } from "@/lib/group-stage/tiebreak-schema";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem definir desempates." }, { status: 403 });
  }

  const parsedBody = groupStageTiebreakOverrideRequestSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: parsedBody.error.issues[0]?.message ?? "Payload inválido.",
      },
      { status: 400 },
    );
  }

  const [groupTeamRecords, groupMatchRecords, officialResultRecords] =
    await Promise.all([
      db
        .select({
          teamId: groupTeams.teamId,
          code: teams.code,
          namePt: teams.namePt,
          flagCode: teams.flagCode,
        })
        .from(groupTeams)
        .innerJoin(teams, eq(groupTeams.teamId, teams.id))
        .where(eq(groupTeams.groupId, parsedBody.data.groupId)),
      db
        .select({
          id: matches.id,
          homeTeamId: matches.homeTeamId,
          awayTeamId: matches.awayTeamId,
          scheduledAt: matches.scheduledAt,
        })
        .from(matches)
        .where(eq(matches.groupId, parsedBody.data.groupId)),
      db
        .select({
          matchId: officialResults.matchId,
          homeScore: officialResults.homeScore,
          awayScore: officialResults.awayScore,
        })
        .from(officialResults)
        .innerJoin(matches, eq(officialResults.matchId, matches.id))
        .where(eq(matches.groupId, parsedBody.data.groupId)),
    ]);

  const expectedTeamIds = groupTeamRecords.map((record) => record.teamId).sort();
  const receivedTeamIds = [...parsedBody.data.orderedTeamIds].sort();

  if (
    expectedTeamIds.length !== receivedTeamIds.length ||
    expectedTeamIds.some((teamId, index) => teamId !== receivedTeamIds[index])
  ) {
    return NextResponse.json(
      { error: "A ordem enviada não corresponde às seleções do grupo." },
      { status: 400 },
    );
  }

  const officialResultByMatchId = new Map(
    officialResultRecords.map((result) => [result.matchId, result]),
  );
  const groupIsComplete =
    groupMatchRecords.length > 0 &&
    groupMatchRecords.every((match) => officialResultByMatchId.has(match.id));

  if (!groupIsComplete) {
    return NextResponse.json(
      { error: "Só é possível definir desempate manual depois do fim de todos os jogos do grupo." },
      { status: 409 },
    );
  }

  const computed = computeGroupStandings(
    groupTeamRecords.map((record) => ({
      id: record.teamId,
      code: record.code,
      namePt: record.namePt,
      flagCode: record.flagCode,
    })),
    groupMatchRecords
      .map((match) => {
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
      .filter((match): match is NonNullable<typeof match> => Boolean(match)),
  );

  if (computed.unresolvedConflicts.length === 0) {
    return NextResponse.json(
      { error: "Este grupo não precisa de desempate manual." },
      { status: 400 },
    );
  }

  if (
    !isValidManualOverrideWithinConflicts(
      computed.autoOrderedTeamIds,
      computed.unresolvedConflicts,
      parsedBody.data.orderedTeamIds,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "A decisão manual só pode reordenar as seleções realmente empatadas, sem alterar o restante da tabela.",
      },
      { status: 400 },
    );
  }

  await db
    .insert(groupTiebreakOverrides)
    .values({
      groupId: parsedBody.data.groupId,
      orderedTeamIds: parsedBody.data.orderedTeamIds.join(","),
      decidedByUserId: session.user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: groupTiebreakOverrides.groupId,
      set: {
        orderedTeamIds: parsedBody.data.orderedTeamIds.join(","),
        decidedByUserId: session.user.id,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
