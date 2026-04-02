import { formatInTimeZone } from "date-fns-tz";

export const formatKickoff = (scheduledAt: string | Date) =>
  formatInTimeZone(new Date(scheduledAt), "America/Sao_Paulo", "dd/MM • HH:mm");
