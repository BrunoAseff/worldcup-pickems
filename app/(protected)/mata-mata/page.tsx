import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function KnockoutPage() {
  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader className="border-b border-border">
        <Badge className="w-fit">Mata-mata</Badge>
        <CardTitle className="text-2xl sm:text-3xl">
          Área do mata-mata pronta para a próxima etapa.
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-6">
          Esta rota já está protegida por sessão e servirá como base para a
          árvore de confrontos e projeções do usuário.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="border border-dashed border-border bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
          Placeholder temporário para a tela de mata-mata.
        </div>
      </CardContent>
    </Card>
  );
}
