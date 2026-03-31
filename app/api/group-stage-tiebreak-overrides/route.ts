import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { groupTeams, groupTiebreakOverrides } from "@/lib/db/schema";
import { groupStageTiebreakOverrideRequestSchema } from "@/lib/group-stage/tiebreak-schema";
import { eq } from "drizzle-orm";

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

  const groupTeamRecords = await db
    .select({
      teamId: groupTeams.teamId,
    })
    .from(groupTeams)
    .where(eq(groupTeams.groupId, parsedBody.data.groupId));

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
