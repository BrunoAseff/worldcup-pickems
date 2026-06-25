import { readFileSync } from "node:fs";
import { parse as parseCsv } from "csv-parse/sync";
import { parse as parseDate } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import {
  teamNormalizationBySourceName,
  teamNormalizations,
} from "./team-normalization";

export type RawMatchRow = {
  fase: string;
  jogo: string;
  data: string;
  dia_semana: string;
  horario_brasilia: string;
  mandante: string;
  visitante: string;
  estadio: string;
  cidade: string;
  pais_sede: string;
};

export type NormalizedVenue = {
  code: string;
  name: string;
  cityName: string;
  countryName: string;
};

export type ParticipantSourceType =
  | "team"
  | "group_position"
  | "best_third_place"
  | "match_winner"
  | "match_loser";

export type NormalizedParticipantSource = {
  sourceType: ParticipantSourceType;
  sourceRef: string;
  teamCode: string | null;
};

export type NormalizedMatch = {
  matchNumber: number;
  bracketCode: string;
  stage:
    | "group_stage"
    | "round_of_32"
    | "round_of_16"
    | "quarterfinal"
    | "semifinal"
    | "third_place"
    | "final";
  stageMatchNumber: number;
  groupRound: number | null;
  groupCode: string | null;
  venueCode: string;
  scheduledAt: Date;
  homeSource: NormalizedParticipantSource;
  awaySource: NormalizedParticipantSource;
  sourceLabel: string;
};

const csvPath = "data/copa_do_mundo_2026.csv";

const stageMap = {
  "Fase de Grupos": "group_stage",
  "Dezesseis-avos de Final": "round_of_32",
  "Oitavas de Final": "round_of_16",
  "Quartas de Final": "quarterfinal",
  Semifinal: "semifinal",
  "Disputa 3º Lugar": "third_place",
  Final: "final",
} as const;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

const parseKickoff = (dateValue: string, timeValue: string) => {
  const match = timeValue.match(/^(\d{1,2})h(?:([0-5]?\d))?$/);

  if (!match) {
    throw new Error(`Unable to parse kickoff time "${timeValue}"`);
  }

  const [, hour, minute = "00"] = match;
  const normalizedTime = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

  const parsed = parseDate(
    `${dateValue} ${normalizedTime}`,
    "dd/MM/yyyy HH:mm",
    new Date()
  );

  return fromZonedTime(parsed, "America/Sao_Paulo");
};

const parseStageMatchNumber = (row: RawMatchRow) => {
  if (row.fase === "Fase de Grupos") {
    const match = row.jogo.match(/Jogo (\d+)/);

    if (!match) {
      throw new Error(
        `Unable to parse group-stage match number from "${row.jogo}"`
      );
    }

    return Number(match[1]);
  }

  const match = row.jogo.match(/(\d+)$/);

  if (!match) {
    if (row.jogo === "3º Lugar" || row.jogo === "Final") {
      return 1;
    }

    throw new Error(`Unable to parse stage match number from "${row.jogo}"`);
  }

  return Number(match[1]);
};

const resolveStage = (value: string) => {
  const stage = stageMap[value as keyof typeof stageMap];

  if (!stage) {
    throw new Error(`Unknown stage label "${value}"`);
  }

  return stage;
};

const resolveGroupCode = (row: RawMatchRow) => {
  if (row.fase !== "Fase de Grupos") {
    return null;
  }

  const match = row.jogo.match(/Grupo ([A-L])/);

  if (!match) {
    throw new Error(`Unable to parse group code from "${row.jogo}"`);
  }

  return match[1];
};

const resolveGroupRound = (row: RawMatchRow) => {
  if (row.fase !== "Fase de Grupos") {
    return null;
  }

  const stageMatchNumber = parseStageMatchNumber(row);

  return Math.ceil(stageMatchNumber / 2);
};

const resolveKnockoutMatchReference = (label: string, matchIndex: number) => {
  const normalized = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (normalized === "Segunda fase") {
    const matchNumberBySlot: Record<number, number> = {
      1: 74,
      2: 77,
      3: 73,
      4: 75,
      5: 83,
      6: 84,
      7: 81,
      8: 82,
      9: 76,
      10: 78,
      11: 79,
      12: 80,
      13: 86,
      14: 88,
      15: 85,
      16: 87,
    };
    const matchNumber = matchNumberBySlot[matchIndex];

    if (!matchNumber) {
      throw new Error(`Unknown round-of-32 slot "${matchIndex}"`);
    }

    return matchNumber;
  }

  if (normalized === "Oitavas") {
    const matchNumberBySlot: Record<number, number> = {
      1: 90,
      2: 89,
      3: 93,
      4: 94,
      5: 91,
      6: 92,
      7: 95,
      8: 96,
    };
    const matchNumber = matchNumberBySlot[matchIndex];

    if (!matchNumber) {
      throw new Error(`Unknown round-of-16 slot "${matchIndex}"`);
    }

    return matchNumber;
  }

  if (normalized === "Quartas") {
    return 96 + matchIndex;
  }

  if (normalized === "Semifinal") {
    return 100 + matchIndex;
  }

  throw new Error(`Unknown knockout reference label "${label}"`);
};

const resolveOfficialMatchNumber = (row: RawMatchRow, fallbackMatchNumber: number) => {
  if (row.fase === "Fase de Grupos") {
    return fallbackMatchNumber;
  }

  if (row.jogo === "3º Lugar") {
    return 103;
  }

  if (row.jogo === "Final") {
    return 104;
  }

  const match = row.jogo.match(/^(.+) (\d+)$/);

  if (!match) {
    throw new Error(`Unable to parse official match number from "${row.jogo}"`);
  }

  return resolveKnockoutMatchReference(match[1], Number(match[2]));
};

const parseParticipantSource = (value: string): NormalizedParticipantSource => {
  const normalizedTeam = teamNormalizationBySourceName.get(value);

  if (normalizedTeam) {
    return {
      sourceType: "team",
      sourceRef: normalizedTeam.code,
      teamCode: normalizedTeam.code,
    };
  }

  const groupPositionMatch = value.match(/^([12])º ([A-L])$/);

  if (groupPositionMatch) {
    return {
      sourceType: "group_position",
      sourceRef: `${groupPositionMatch[2]}${groupPositionMatch[1]}`,
      teamCode: null,
    };
  }

  const bestThirdMatch = value.match(/^3º ([A-L]{5})$/);

  if (bestThirdMatch) {
    return {
      sourceType: "best_third_place",
      sourceRef: bestThirdMatch[1],
      teamCode: null,
    };
  }

  const winnerMatch = value.match(
    /^Venc\. (Segunda fase|Oitavas|Quartas|Semifinal) (\d+)$/
  );

  if (winnerMatch) {
    const matchNumber = resolveKnockoutMatchReference(
      winnerMatch[1],
      Number(winnerMatch[2])
    );

    return {
      sourceType: "match_winner",
      sourceRef: `M${String(matchNumber).padStart(3, "0")}`,
      teamCode: null,
    };
  }

  const loserMatch = value.match(/^Perd\. Semifinal (\d+)$/);

  if (loserMatch) {
    const matchNumber = resolveKnockoutMatchReference(
      "Semifinal",
      Number(loserMatch[1])
    );

    return {
      sourceType: "match_loser",
      sourceRef: `M${String(matchNumber).padStart(3, "0")}`,
      teamCode: null,
    };
  }

  throw new Error(`Unknown participant source "${value}"`);
};

export const loadRawMatchRows = (): RawMatchRow[] => {
  const source = readFileSync(csvPath, "utf-8");

  return parseCsv(source, {
    columns: true,
    skip_empty_lines: true,
  }) as RawMatchRow[];
};

export const getNormalizedVenues = (): NormalizedVenue[] => {
  const rows = loadRawMatchRows();
  const venueMap = new Map<string, NormalizedVenue>();

  for (const row of rows) {
    const code = slugify(`${row.estadio}_${row.cidade}_${row.pais_sede}`);

    venueMap.set(code, {
      code,
      name: row.estadio,
      cityName: row.cidade,
      countryName: row.pais_sede,
    });
  }

  return [...venueMap.values()].sort((left, right) =>
    left.code.localeCompare(right.code)
  );
};

export const getNormalizedGroups = () =>
  [
    ...new Set(
      loadRawMatchRows().map(resolveGroupCode).filter(Boolean) as string[]
    ),
  ].sort();

export const getNormalizedGroupTeams = () => {
  const rows = loadRawMatchRows().filter(
    (row) => row.fase === "Fase de Grupos"
  );
  const seen = new Set<string>();
  const values: { groupCode: string; teamCode: string }[] = [];

  for (const row of rows) {
    const groupCode = resolveGroupCode(row);
    const home = parseParticipantSource(row.mandante);
    const away = parseParticipantSource(row.visitante);

    for (const participant of [home, away]) {
      if (
        participant.sourceType !== "team" ||
        !participant.teamCode ||
        !groupCode
      ) {
        continue;
      }

      const key = `${groupCode}:${participant.teamCode}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      values.push({
        groupCode,
        teamCode: participant.teamCode,
      });
    }
  }

  return values.sort((left, right) =>
    `${left.groupCode}:${left.teamCode}`.localeCompare(
      `${right.groupCode}:${right.teamCode}`
    )
  );
};

export const getNormalizedMatches = (): NormalizedMatch[] =>
  loadRawMatchRows().map((row, index) => {
    const matchNumber = resolveOfficialMatchNumber(row, index + 1);
    const stage = resolveStage(row.fase);
    const stageMatchNumber = parseStageMatchNumber(row);
    const homeSource = parseParticipantSource(row.mandante);
    const awaySource = parseParticipantSource(row.visitante);
    const shouldSwapParticipants = row.jogo === "Quartas 1";

    return {
      matchNumber,
      bracketCode: `M${String(matchNumber).padStart(3, "0")}`,
      stage,
      stageMatchNumber,
      groupRound: resolveGroupRound(row),
      groupCode: resolveGroupCode(row),
      venueCode: slugify(`${row.estadio}_${row.cidade}_${row.pais_sede}`),
      scheduledAt: parseKickoff(row.data, row.horario_brasilia),
      homeSource: shouldSwapParticipants ? awaySource : homeSource,
      awaySource: shouldSwapParticipants ? homeSource : awaySource,
      sourceLabel: row.jogo,
    };
  });

export const getNormalizedTeams = () => teamNormalizations;
