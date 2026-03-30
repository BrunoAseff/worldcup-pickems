import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardHeader className="gap-2">
          <CardTitle className="text-3xl">Acesso negado</CardTitle>
          <CardDescription className="text-sm leading-6">
            Esta área é exclusiva para administradores do bolão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={routes.ranking}
            className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para o ranking
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
