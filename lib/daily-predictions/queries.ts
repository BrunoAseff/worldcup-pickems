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
  stage:
    | "group_stage"
    | "round_of_32"
    | "round_of_16"
    | "quarterfinal"
    | "semifinal"
    | "third_place"
    | "final";
  stageLabel: string;
  scheduledAt: string;
  venueName: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamFlagCode: string | null;
  awayTeamFlagCode: string | null;
  officialResult: {
    homeScore: number;
    awayScore: number;
    advancingTeamId: string | null;
  } | null;
  submittedPredictions: number;
  predictions: Array<{
    userId: string;
    displayName: string;
    username: string;
    homeScore: number | null;
    awayScore: number | null;
    predictedHomeTeamId: string | null;
    predictedAwayTeamId: string | null;
    predictedAdvancingTeamId: string | null;
    predictedHomeTeamName: string | null;
    predictedAwayTeamName: string | null;
    predictedAdvancingTeamName: string | null;
    predictedHomeTeamFlagCode: string | null;
    predictedAwayTeamFlagCode: string | null;
    isCurrentUser: boolean;
  }>;
};

export type DailyPredictionsPageView = {
  availableDates: string[];
  selectedDate: string | null;
  matches: DailyPredictionsMatchView[];
  matchesByDate: Record<string, DailyPredictionsMatchView[]>;
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
  const matchIds = matchRecords.map((match) => match.id);

  const [predictionRecords, officialResultRecords] = await Promise.all([
    matchIds.length > 0
      ? db
          .select({
            matchId: matchPredictions.matchId,
            userId: users.id,
            username: users.username,
            displayName: users.displayName,
            homeScore: matchPredictions.predictedHomeScore,
            awayScore: matchPredictions.predictedAwayScore,
            predictedHomeTeamId: matchPredictions.predictedHomeTeamId,
            predictedAwayTeamId: matchPredictions.predictedAwayTeamId,
            predictedAdvancingTeamId: matchPredictions.predictedAdvancingTeamId,
          })
          .from(matchPredictions)
          .innerJoin(users, eq(matchPredictions.userId, users.id))
          .where(inArray(matchPredictions.matchId, matchIds))
      : Promise.resolve([]),
    matchIds.length > 0
      ? db
          .select({
            matchId: officialResults.matchId,
            homeScore: officialResults.homeScore,
            awayScore: officialResults.awayScore,
            advancingTeamId: officialResults.advancingTeamId,
          })
          .from(officialResults)
          .where(inArray(officialResults.matchId, matchIds))
      : Promise.resolve([]),
  ]);

  const predictionTeamIds = Array.from(
    new Set(
      predictionRecords
        .flatMap((prediction) => [
          prediction.predictedHomeTeamId,
          prediction.predictedAwayTeamId,
          prediction.predictedAdvancingTeamId,
        ])
        .filter((teamId): teamId is string => Boolean(teamId))
        .filter((teamId) => !teamById.has(teamId)),
    ),
  );

  if (predictionTeamIds.length > 0) {
    const predictionTeamRecords = await db
      .select({
        id: teams.id,
        namePt: teams.namePt,
        flagCode: teams.flagCode,
      })
      .from(teams)
      .where(inArray(teams.id, predictionTeamIds));

    for (const team of predictionTeamRecords) {
      teamById.set(team.id, team);
    }
  }

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
        advancingTeamId: result.advancingTeamId,
      },
    ]),
  );

  const matchesByDate = matchRecords.reduce<Record<string, DailyPredictionsMatchView[]>>((accumulator, match) => {
    const dateKey = toBrazilDateKey(match.scheduledAt);
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
        predictedHomeTeamId: prediction?.predictedHomeTeamId ?? null,
        predictedAwayTeamId: prediction?.predictedAwayTeamId ?? null,
        predictedAdvancingTeamId: prediction?.predictedAdvancingTeamId ?? null,
        predictedHomeTeamName: prediction?.predictedHomeTeamId
          ? teamById.get(prediction.predictedHomeTeamId)?.namePt ?? null
          : null,
        predictedAwayTeamName: prediction?.predictedAwayTeamId
          ? teamById.get(prediction.predictedAwayTeamId)?.namePt ?? null
          : null,
        predictedAdvancingTeamName: prediction?.predictedAdvancingTeamId
          ? teamById.get(prediction.predictedAdvancingTeamId)?.namePt ?? null
          : null,
        predictedHomeTeamFlagCode: prediction?.predictedHomeTeamId
          ? teamById.get(prediction.predictedHomeTeamId)?.flagCode ?? null
          : null,
        predictedAwayTeamFlagCode: prediction?.predictedAwayTeamId
          ? teamById.get(prediction.predictedAwayTeamId)?.flagCode ?? null
          : null,
        isCurrentUser: player.id === viewerUserId,
      };
    });
    const matchView = {
      id: match.id,
      matchNumber: match.matchNumber,
      stage: match.stage,
      stageLabel: stageLabelByStage[match.stage],
      scheduledAt: match.scheduledAt.toISOString(),
      venueName: match.venueName,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
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

    accumulator[dateKey] = [...(accumulator[dateKey] ?? []), matchView];
    return accumulator;
  }, {});

  return {
    availableDates,
    selectedDate,
    playerCount: playerRecords.length,
    matchesByDate,
    matches: selectedDate ? matchesByDate[selectedDate] ?? [] : [],
  };
};
