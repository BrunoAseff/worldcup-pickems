import { and, asc, eq, inArray } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db/client";
import { matchPredictions, matches, officialResults, teams, users, venues } from "@/lib/db/schema";

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

const stageLabelByStage: Record<
  typeof matches.$inferSelect.stage,
  string
> = {
  group_stage: "Fase de grupos",
  round_of_32: "16-avos",
  round_of_16: "Oitavas",
  quarterfinal: "Quartas",
  semifinal: "Semifinal",
  third_place: "3º lugar",
  final: "Final",
};

export type DailyPredictionsMatchView = {
  id: string;
  matchNumber: number;
  stageLabel: string;
  scheduledAt: string;
  venueName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamFlagCode: string | null;
  awayTeamFlagCode: string | null;
  officialResult: {
    homeScore: number;
    awayScore: number;
  } | null;
  submittedPredictions: number;
  predictions: Array<{
    userId: string;
    displayName: string;
    username: string;
    homeScore: number | null;
    awayScore: number | null;
    isCurrentUser: boolean;
  }>;
};

export type DailyPredictionsPageView = {
  availableDates: string[];
  selectedDate: string | null;
  matches: DailyPredictionsMatchView[];
  playerCount: number;
};

const toBrazilDateKey = (scheduledAt: Date) =>
  formatInTimeZone(scheduledAt, BRAZIL_TIME_ZONE, "yyyy-MM-dd");

const selectDefaultDate = (availableDates: string[], requestedDate?: string | null) => {
  if (requestedDate && availableDates.includes(requestedDate)) {
    return requestedDate;
  }

  if (availableDates.length === 0) {
    return null;
  }

  const today = formatInTimeZone(new Date(), BRAZIL_TIME_ZONE, "yyyy-MM-dd");

  if (availableDates.includes(today)) {
    return today;
  }

  const nextUpcomingDate = availableDates.find((dateKey) => dateKey >= today);

  if (nextUpcomingDate) {
    return nextUpcomingDate;
  }

  return availableDates[availableDates.length - 1] ?? null;
};

export const getDailyPredictionsPageView = async ({
  requestedDate,
  viewerUserId,
}: {
  requestedDate?: string | null;
  viewerUserId: string;
}): Promise<DailyPredictionsPageView> => {
  const [matchRecords, playerRecords] = await Promise.all([
    db
      .select({
        id: matches.id,
        matchNumber: matches.matchNumber,
        stage: matches.stage,
        scheduledAt: matches.scheduledAt,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        venueName: venues.name,
      })
      .from(matches)
      .innerJoin(venues, eq(matches.venueId, venues.id))
      .orderBy(asc(matches.scheduledAt), asc(matches.matchNumber)),
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
      })
      .from(users)
      .where(and(eq(users.role, "player"), eq(users.isActive, true)))
      .orderBy(asc(users.displayName)),
  ]);

  const teamIds = Array.from(
    new Set(
      matchRecords
        .flatMap((match) => [match.homeTeamId, match.awayTeamId])
        .filter((teamId): teamId is string => Boolean(teamId)),
    ),
  );
  const teamRecords =
    teamIds.length > 0
      ? await db
          .select({
            id: teams.id,
            namePt: teams.namePt,
            flagCode: teams.flagCode,
          })
          .from(teams)
          .where(inArray(teams.id, teamIds))
      : [];

  const teamById = new Map(teamRecords.map((team) => [team.id, team]));
  const availableDates = Array.from(
    new Set(matchRecords.map((match) => toBrazilDateKey(match.scheduledAt))),
  );
  const selectedDate = selectDefaultDate(availableDates, requestedDate);
  const selectedMatches = selectedDate
    ? matchRecords.filter((match) => toBrazilDateKey(match.scheduledAt) === selectedDate)
    : [];
  const selectedMatchIds = selectedMatches.map((match) => match.id);

  const [predictionRecords, officialResultRecords] = await Promise.all([
    selectedMatchIds.length > 0
      ? db
          .select({
            matchId: matchPredictions.matchId,
            userId: users.id,
            username: users.username,
            displayName: users.displayName,
            homeScore: matchPredictions.predictedHomeScore,
            awayScore: matchPredictions.predictedAwayScore,
          })
          .from(matchPredictions)
          .innerJoin(users, eq(matchPredictions.userId, users.id))
          .where(inArray(matchPredictions.matchId, selectedMatchIds))
      : Promise.resolve([]),
    selectedMatchIds.length > 0
      ? db
          .select({
            matchId: officialResults.matchId,
            homeScore: officialResults.homeScore,
            awayScore: officialResults.awayScore,
          })
          .from(officialResults)
          .where(inArray(officialResults.matchId, selectedMatchIds))
      : Promise.resolve([]),
  ]);

  const predictionsByMatchId = new Map<
    string,
    Map<string, (typeof predictionRecords)[number]>
  >();

  for (const prediction of predictionRecords) {
    const matchBucket = predictionsByMatchId.get(prediction.matchId) ?? new Map();
    matchBucket.set(prediction.userId, prediction);
    predictionsByMatchId.set(prediction.matchId, matchBucket);
  }

  const officialResultByMatchId = new Map(
    officialResultRecords.map((result) => [
      result.matchId,
      {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
      },
    ]),
  );

  return {
    availableDates,
    selectedDate,
    playerCount: playerRecords.length,
    matches: selectedMatches.map((match) => {
      const homeTeam = match.homeTeamId ? teamById.get(match.homeTeamId) : null;
      const awayTeam = match.awayTeamId ? teamById.get(match.awayTeamId) : null;
      const predictions = playerRecords.map((player) => {
        const prediction = predictionsByMatchId.get(match.id)?.get(player.id);

        return {
          userId: player.id,
          displayName: player.displayName,
          username: player.username,
          homeScore: prediction?.homeScore ?? null,
          awayScore: prediction?.awayScore ?? null,
          isCurrentUser: player.id === viewerUserId,
        };
      });

      return {
        id: match.id,
        matchNumber: match.matchNumber,
        stageLabel: stageLabelByStage[match.stage],
        scheduledAt: match.scheduledAt.toISOString(),
        venueName: match.venueName,
        homeTeamName: homeTeam?.namePt ?? "A definir",
        awayTeamName: awayTeam?.namePt ?? "A definir",
        homeTeamFlagCode: homeTeam?.flagCode ?? null,
        awayTeamFlagCode: awayTeam?.flagCode ?? null,
        officialResult: officialResultByMatchId.get(match.id) ?? null,
        submittedPredictions: predictions.filter(
          (prediction) =>
            prediction.homeScore !== null && prediction.awayScore !== null,
        ).length,
        predictions,
      } satisfies DailyPredictionsMatchView;
    }),
  };
};
