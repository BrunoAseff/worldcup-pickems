import { z } from "zod";

const nullableScore = z
  .number()
  .int("Use apenas números inteiros.")
  .min(0, "O placar não pode ser negativo.")
  .max(99, "Use no máximo 2 dígitos.")
  .nullable();

const nullableTeamId = z.uuid().nullable();

export const knockoutPredictionRequestSchema = z
  .object({
    matchId: z.uuid(),
    predictedHomeTeamId: nullableTeamId,
    predictedAwayTeamId: nullableTeamId,
    homeScore: nullableScore,
    awayScore: nullableScore,
    predictedAdvancingTeamId: nullableTeamId,
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

    if (!value.predictedHomeTeamId || !value.predictedAwayTeamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["predictedHomeTeamId"],
        message: "As duas seleções precisam estar definidas para salvar o palpite.",
      });
      return;
    }

    if (value.predictedHomeTeamId === value.predictedAwayTeamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["predictedAwayTeamId"],
        message: "As seleções do confronto precisam ser diferentes.",
      });
    }

    if (value.homeScore === value.awayScore && !value.predictedAdvancingTeamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["predictedAdvancingTeamId"],
        message: "Escolha quem avança em caso de empate.",
      });
    }

    if (
      value.predictedAdvancingTeamId &&
      value.predictedAdvancingTeamId !== value.predictedHomeTeamId &&
      value.predictedAdvancingTeamId !== value.predictedAwayTeamId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["predictedAdvancingTeamId"],
        message: "O time que avança precisa ser um dos dois do confronto.",
      });
    }
  });
