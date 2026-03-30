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

const trimTeamName = (name: string) =>
  name.length > 24 ? `${name.slice(0, 24).trimEnd()}...` : name;

export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Seleção</TableHead>
            <TableHead className="w-12 text-center">P</TableHead>
            <TableHead className="w-12 text-center">J</TableHead>
            <TableHead className="w-12 text-center">V</TableHead>
            <TableHead className="w-12 text-center">E</TableHead>
            <TableHead className="w-12 text-center">D</TableHead>
            <TableHead className="w-14 text-center">SG</TableHead>
            <TableHead className="w-24 text-center">Últ. 5</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((team) => (
            <TableRow key={team.teamId}>
              <TableCell className="py-4 text-sm font-semibold text-muted-foreground">
                {team.position}
              </TableCell>
              <TableCell className="py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <TeamFlag code={team.flagCode} />
                  <p className="truncate text-[15px] font-medium text-foreground">
                    {trimTeamName(team.teamName)}
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
              <TableCell className="py-4 text-center">
                {team.goalDifference}
              </TableCell>
              <TableCell className="py-4">
                {/* Temporary placeholder until official results and standings logic land in the next task. */}
                <div className="flex items-center justify-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={`${team.teamId}-${index}`}
                      className="size-1.5 rounded-full bg-border"
                    />
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
