import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getGroupStageView } from "@/lib/group-stage/queries";
import { GroupStageShell } from "@/components/group-stage/group-stage-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GroupStagePage() {
  const user = await requireAuthenticatedUser();

  if (user.role === "admin") {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <Badge className="w-fit">Fase de Grupos</Badge>
          <CardTitle className="text-2xl sm:text-3xl">Modo admin entra na próxima task.</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">
            Esta rota já é compartilhada com o admin, mas os controles de resultados oficiais e
            a classificação derivada serão implementados na task seguinte.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="border border-dashed border-border bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
            Placeholder temporário para o modo administrativo da fase de grupos.
          </div>
        </CardContent>
      </Card>
    );
  }

  const groups = await getGroupStageView(user.id);

  return <GroupStageShell groups={groups} />;
}
