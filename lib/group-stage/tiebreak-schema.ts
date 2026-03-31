import { z } from "zod";

export const groupStageTiebreakOverrideRequestSchema = z.object({
  groupId: z.uuid("Grupo inválido."),
  orderedTeamIds: z.array(z.uuid("Seleção inválida.")).length(4, "Defina a ordem completa do grupo."),
});
