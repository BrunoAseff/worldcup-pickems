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
    <div className="rounded-md border border-border bg-card">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="w-64">Seleção</TableHead>
            <TableHead className="w-10 text-center">P</TableHead>
            <TableHead className="w-10 text-center">J</TableHead>
            <TableHead className="w-10 text-center">V</TableHead>
            <TableHead className="w-10 text-center">E</TableHead>
            <TableHead className="w-10 text-center">D</TableHead>
            <TableHead className="w-20 text-center">Últ. 5</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((team) => (
            <TableRow
              key={team.teamId}
              className={team.predictionFeedback === "exact_position" ? "bg-primary/6" : undefined}
            >
              <TableCell className="py-4 text-sm font-semibold text-muted-foreground">
                {team.position}
              </TableCell>
              <TableCell className="w-64 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {team.predictionFeedback === "qualified_only" ? (
                    <span className="size-2 rounded-full bg-chart-4 shrink-0" />
                  ) : null}
                  <TeamFlag code={team.flagCode} className="shrink-0" />
                  <p
                    className="block max-w-48 truncate text-[15px] font-medium text-foreground md:max-w-52 lg:max-w-56"
                    title={team.teamName}
                  >
                    {trimTeamName(team.teamName, 26)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="py-4 text-center font-semibold">
                {team.points}
              </TableCell>
              <TableCell className="py-4 text-center">{team.played}</TableCell>
              <TableCell className="py-4 text-center">{team.wins}</TableCell>
              <TableCell className="py-4 text-center">{team.draws}</TableCell>
              <TableCell className="py-4 text-center">{team.losses}</TableCell>
              <TableCell className="py-4">
                <div className="flex items-center justify-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, index) => {
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
