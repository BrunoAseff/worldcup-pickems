import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RankingPage() {
  return (
    <Card className="mx-96">
      <CardHeader className="border-b border-border">
        <Badge className="w-fit">Ranking</Badge>
        <CardTitle className="text-2xl sm:text-3xl">
          Ranking protegido por sessão.
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-6">
          Esta rota já exige autenticação válida e servirá como base para o
          ranking real nas próximas tasks.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="border border-dashed border-border bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
          Placeholder temporário para a tela de ranking.
        </div>
      </CardContent>
    </Card>
  );
}
