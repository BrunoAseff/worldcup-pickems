import { z } from "zod";

export const predictionInputSchema = z.object({
  homeScore: z.string().regex(/^$|^\d{1,2}$/, "Use até 2 dígitos."),
  awayScore: z.string().regex(/^$|^\d{1,2}$/, "Use até 2 dígitos."),
});

export const groupStagePredictionRequestSchema = z
  .object({
    matchId: z.uuid(),
    homeScore: z.number().int().min(0).max(99).nullable(),
    awayScore: z.number().int().min(0).max(99).nullable(),
  })
  .superRefine((value, context) => {
    const bothEmpty = value.homeScore === null && value.awayScore === null;
    const bothFilled = value.homeScore !== null && value.awayScore !== null;

    if (!bothEmpty && !bothFilled) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Preencha os dois placares para salvar.",
      });
    }
  });
