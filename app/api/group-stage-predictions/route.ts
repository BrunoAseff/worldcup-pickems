import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { groupStagePredictionRequestSchema } from "@/lib/group-stage/prediction-schema";
import { db } from "@/lib/db/client";
import { matchPredictions, matches } from "@/lib/db/schema";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (session.user.role !== "player") {
    return NextResponse.json({ error: "Apenas jogadores podem salvar palpites." }, { status: 403 });
  }

  const parsedBody = groupStagePredictionRequestSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: parsedBody.error.issues[0]?.message ?? "Payload inválido.",
      },
      { status: 400 },
    );
  }

  const [match] = await db
    .select({
      id: matches.id,
      stage: matches.stage,
      scheduledAt: matches.scheduledAt,
    })
    .from(matches)
    .where(eq(matches.id, parsedBody.data.matchId))
    .limit(1);

  if (!match || match.stage !== "group_stage") {
    return NextResponse.json({ error: "Partida inválida." }, { status: 404 });
  }

  if (match.scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Esta partida já foi bloqueada." }, { status: 409 });
  }

  const [existingPrediction] = await db
    .select({ id: matchPredictions.id })
    .from(matchPredictions)
    .where(
      and(
        eq(matchPredictions.userId, session.user.id),
        eq(matchPredictions.matchId, parsedBody.data.matchId),
      ),
    )
    .limit(1);

  if (parsedBody.data.homeScore === null && parsedBody.data.awayScore === null) {
    if (!existingPrediction) {
      return NextResponse.json({ ok: true, action: "noop" });
    }

    await db
      .delete(matchPredictions)
      .where(
        and(
          eq(matchPredictions.userId, session.user.id),
          eq(matchPredictions.matchId, parsedBody.data.matchId),
        ),
      );

    return NextResponse.json({ ok: true, action: "deleted" });
  }

  await db
    .insert(matchPredictions)
    .values({
      userId: session.user.id,
      matchId: parsedBody.data.matchId,
      predictedHomeScore: parsedBody.data.homeScore!,
      predictedAwayScore: parsedBody.data.awayScore!,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [matchPredictions.userId, matchPredictions.matchId],
      set: {
        predictedHomeScore: parsedBody.data.homeScore!,
        predictedAwayScore: parsedBody.data.awayScore!,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true, action: existingPrediction ? "updated" : "created" });
}
