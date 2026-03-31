import { and, asc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { matchPredictions, matches } from "@/lib/db/schema";
import { knockoutPredictionRequestSchema } from "@/lib/knockout/prediction-schema";

const getFirstKnockoutKickoff = async () => {
  const [firstMatch] = await db
    .select({ scheduledAt: matches.scheduledAt })
    .from(matches)
    .where(ne(matches.stage, "group_stage"))
    .orderBy(asc(matches.scheduledAt))
    .limit(1);

  return firstMatch?.scheduledAt ?? null;
};

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (session.user.role !== "player") {
    return NextResponse.json({ error: "Apenas players podem palpitar." }, { status: 403 });
  }

  const firstKickoff = await getFirstKnockoutKickoff();

  if (firstKickoff && firstKickoff.getTime() <= Date.now()) {
    return NextResponse.json({ error: "O mata-mata já foi travado." }, { status: 423 });
  }

  const parsedBody = knockoutPredictionRequestSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Payload inválido." },
      { status: 400 },
    );
  }

  const [match] = await db
    .select({
      id: matches.id,
      stage: matches.stage,
    })
    .from(matches)
    .where(and(eq(matches.id, parsedBody.data.matchId), ne(matches.stage, "group_stage")))
    .limit(1);

  if (!match) {
    return NextResponse.json({ error: "Partida inválida." }, { status: 404 });
  }

  const [existingPrediction] = await db
    .select({ id: matchPredictions.id })
    .from(matchPredictions)
    .where(
      and(
        eq(matchPredictions.matchId, parsedBody.data.matchId),
        eq(matchPredictions.userId, session.user.id),
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
          eq(matchPredictions.matchId, parsedBody.data.matchId),
          eq(matchPredictions.userId, session.user.id),
        ),
      );

    return NextResponse.json({ ok: true, action: "deleted" });
  }

  const { homeScore, awayScore, predictedHomeTeamId, predictedAwayTeamId } = parsedBody.data;

  if (
    homeScore === null ||
    awayScore === null ||
    !predictedHomeTeamId ||
    !predictedAwayTeamId
  ) {
    return NextResponse.json({ error: "Preencha o palpite completo." }, { status: 400 });
  }

  const predictedAdvancingTeamId =
    homeScore === awayScore
      ? parsedBody.data.predictedAdvancingTeamId
      : homeScore > awayScore
        ? predictedHomeTeamId
        : predictedAwayTeamId;

  await db
    .insert(matchPredictions)
    .values({
      userId: session.user.id,
      matchId: parsedBody.data.matchId,
      predictedHomeTeamId,
      predictedAwayTeamId,
      predictedHomeScore: homeScore,
      predictedAwayScore: awayScore,
      predictedAdvancingTeamId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [matchPredictions.userId, matchPredictions.matchId],
      set: {
        predictedHomeTeamId,
        predictedAwayTeamId,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
        predictedAdvancingTeamId,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true, action: existingPrediction ? "updated" : "created" });
}
