import { TeamFlag } from "@/components/teams/team-flag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GroupStandingRow } from "@/lib/group-stage/queries";

type StandingsTableProps = {
  standings: GroupStandingRow[];
};

const trimTeamName = (name: string, maxLength: number) =>
  name.length > maxLength ? `${name.slice(0, maxLength).trimEnd()}...` : name;

const resultColorByMark = {
  W: "bg-primary",
  D: "bg-muted-foreground/55",
  L: "bg-destructive",
} as const;

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="wc-panel overflow-hidden rounded-sm">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="bg-[color:var(--wc-ink)] hover:bg-[color:var(--wc-ink)]">
            <TableHead className="w-10 text-primary-foreground/80">#</TableHead>
            <TableHead className="w-56 text-primary-foreground/80">Seleção</TableHead>
            <TableHead className="w-10 text-center text-primary-foreground/80">P</TableHead>
            <TableHead className="w-9 text-center text-primary-foreground/80">J</TableHead>
            <TableHead className="w-9 text-center text-primary-foreground/80">V</TableHead>
            <TableHead className="w-9 text-center text-primary-foreground/80">E</TableHead>
            <TableHead className="w-9 text-center text-primary-foreground/80">D</TableHead>
            <TableHead className="w-10 text-center text-primary-foreground/80">GP</TableHead>
            <TableHead className="w-10 text-center text-primary-foreground/80">SG</TableHead>
            <TableHead className="w-16 text-center whitespace-nowrap text-primary-foreground/80">Últ.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((team) => (
            <TableRow
              key={team.teamId}
              className={
                team.predictionFeedback === "exact_position"
                  ? "bg-primary/10"
                  : team.qualificationStatus === "qualified"
                    ? "bg-primary/10"
                    : team.qualificationStatus === "third_place"
                      ? "bg-[color:color-mix(in_oklch,var(--wc-gold)_12%,transparent)]"
                      : undefined
              }
            >
              <TableCell className="py-4 font-heading text-xl font-black text-foreground">
                {team.position}
              </TableCell>
              <TableCell className="w-56 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {team.predictionFeedback === "qualified_only" ? (
                    <>
                      <span
                        className="size-2 rounded-full bg-chart-4 shrink-0"
                        role="img"
                        aria-label="Classificada, mas fora da posição exata"
                      />
                      <span className="sr-only">
                        Classificada, mas fora da posição exata
                      </span>
                    </>
                  ) : null}
                  <TeamFlag code={team.flagCode} className="shrink-0" />
                  <p
                    className="block max-w-40 truncate text-[15px] font-bold text-foreground md:max-w-44 lg:max-w-48"
                    title={team.teamName}
                  >
                    {trimTeamName(team.teamName, 26)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="py-4 text-center font-heading text-xl font-black">
                {team.points}
              </TableCell>
              <TableCell className="py-4 text-center">{team.played}</TableCell>
              <TableCell className="py-4 text-center">{team.wins}</TableCell>
              <TableCell className="py-4 text-center">{team.draws}</TableCell>
              <TableCell className="py-4 text-center">{team.losses}</TableCell>
              <TableCell className="py-4 text-center">{team.goalsFor}</TableCell>
              <TableCell className="py-4 text-center">
                {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center justify-center gap-1">
                  {Array.from({ length: 3 }).map((_, index) => {
                    const result = team.recentResults[index];

                    return (
                      <span
                        key={`${team.teamId}-${index}`}
                        className={
                          result
                            ? `size-1.5 rounded-full ${resultColorByMark[result]}`
                            : "size-1.5 rounded-full bg-border"
                        }
                      />
                    );
                  })}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
