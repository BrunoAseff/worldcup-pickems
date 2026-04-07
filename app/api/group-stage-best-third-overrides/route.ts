import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  bestThirdSlotOverrides,
  groupStandings,
  groups,
  matches,
} from "@/lib/db/schema";
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

  const [standingRecords, slotRecords] = await Promise.all([
    db
      .select({
        groupCode: groups.code,
        teamId: groupStandings.teamId,
        position: groupStandings.position,
        points: groupStandings.points,
        goalDifference: groupStandings.goalDifference,
        goalsFor: groupStandings.goalsFor,
      })
      .from(groupStandings)
      .innerJoin(groups, eq(groupStandings.groupId, groups.id)),
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

  const bestThirdStatus = getBestThirdStatus(standingRecords);

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

  const allowedThirdTeamIds = new Set(
    standingRecords.filter((standing) => standing.position === 3).map((standing) => standing.teamId),
  );
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
