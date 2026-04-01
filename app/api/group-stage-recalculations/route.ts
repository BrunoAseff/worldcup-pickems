import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  ApplicationRecalculationConflictError,
  recalculateApplicationCore,
} from "@/lib/recalculation/core";

export async function POST() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Apenas administradores podem recalcular." }, { status: 403 });
  }

  try {
    const recalculatedAt = await recalculateApplicationCore(session.user.id);

    return NextResponse.json({ ok: true, recalculatedAt });
  } catch (error) {
    if (error instanceof ApplicationRecalculationConflictError) {
      return NextResponse.json(
        {
          error: `Defina manualmente o desempate dos grupos: ${error.groupCodes.join(", ")}.`,
          groupCodes: error.groupCodes,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Não foi possível recalcular agora." }, { status: 500 });
  }
}
