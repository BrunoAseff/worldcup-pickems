import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { matches, officialResults } from "@/lib/db/schema";
import { knockoutOfficialResultRequestSchema } from "@/lib/knockout/result-schema";

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

  const [match] = await db
    .select({
      id: matches.id,
      stage: matches.stage,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matches)
    .where(and(eq(matches.id, parsedBody.data.matchId), ne(matches.stage, "group_stage")))
    .limit(1);

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

  const advancingTeamId =
    homeScore === awayScore
      ? parsedBody.data.advancingTeamId
      : homeScore > awayScore
        ? match.homeTeamId
        : match.awayTeamId;

  if (homeScore === awayScore) {
    if (!match.homeTeamId || !match.awayTeamId) {
      return NextResponse.json(
        { error: "Os participantes da partida ainda não estão definidos." },
        { status: 409 },
      );
    }

    if (
      advancingTeamId !== match.homeTeamId &&
      advancingTeamId !== match.awayTeamId
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
