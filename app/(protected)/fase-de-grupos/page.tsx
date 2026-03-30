import { PlayerStatus } from "@/components/app/player-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GroupStagePage() {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-6 border-b border-border sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Badge className="rounded-full">Fase de Grupos</Badge>
          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl">
              Área da fase de grupos pronta para a próxima etapa.
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6">
              A autenticação e a proteção de rotas já estão funcionando. A interface da fase
              de grupos entra na próxima task.
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PlayerStatus />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-xl border border-dashed border-border bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
          Placeholder temporário para a tela da fase de grupos.
        </div>
      </CardContent>
    </Card>
  );
}
