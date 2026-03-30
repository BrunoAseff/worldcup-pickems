import { requireAdminUser } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const admin = await requireAdminUser();

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <Badge className="w-fit rounded-full">Admin</Badge>
        <CardTitle className="text-2xl sm:text-3xl">
          Área administrativa liberada para {admin.displayName}.
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-6">
          Base pronta para resultados oficiais, recálculo e demais operações administrativas.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-xl border border-dashed border-border bg-muted/35 px-4 py-6 text-sm text-muted-foreground">
          Placeholder temporário para a área administrativa.
        </div>
      </CardContent>
    </Card>
  );
}
