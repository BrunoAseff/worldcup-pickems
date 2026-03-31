import { z } from "zod";

const scoreSchema = z
  .number()
  .int("O placar deve ser um número inteiro.")
  .min(0, "O placar não pode ser negativo.")
  .max(99, "O placar deve ter no máximo dois dígitos.");

export const groupStageOfficialResultRequestSchema = z
  .object({
    matchId: z.uuid("Partida inválida."),
    homeScore: scoreSchema.nullable(),
    awayScore: scoreSchema.nullable(),
  })
  .superRefine((value, context) => {
    const bothEmpty = value.homeScore === null && value.awayScore === null;
    const bothFilled = value.homeScore !== null && value.awayScore !== null;

    if (bothEmpty || bothFilled) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: "Preencha os dois placares.",
      path: ["homeScore"],
    });
  });
