import { z } from "zod";

const nullableScore = z
  .number()
  .int("Use apenas números inteiros.")
  .min(0, "O placar não pode ser negativo.")
  .max(99, "Use no máximo 2 dígitos.")
  .nullable();

export const knockoutOfficialResultRequestSchema = z
  .object({
    matchId: z.uuid(),
    homeScore: nullableScore,
    awayScore: nullableScore,
    advancingTeamId: z.uuid().nullable(),
  })
  .superRefine((value, context) => {
    const bothEmpty = value.homeScore === null && value.awayScore === null;
    const bothFilled = value.homeScore !== null && value.awayScore !== null;

    if (!bothEmpty && !bothFilled) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["homeScore"],
        message: "Preencha os dois placares.",
      });
    }

    if (bothEmpty) {
      return;
    }

    if (value.homeScore === value.awayScore && !value.advancingTeamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["advancingTeamId"],
        message: "Escolha quem avançou nos pênaltis.",
      });
    }
  });
