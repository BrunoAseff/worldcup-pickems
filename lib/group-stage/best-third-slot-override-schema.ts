import { z } from "zod";

export const groupStageBestThirdSlotOverrideRequestSchema = z.object({
  assignments: z
    .array(
      z.object({
        slotKey: z.string().min(2, "Slot inválido."),
        teamId: z.uuid("Seleção inválida."),
      }),
    )
    .min(1, "Defina ao menos um terceiro colocado."),
});
