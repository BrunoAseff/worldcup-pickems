import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="wc-panel w-full max-w-md overflow-hidden rounded-sm">
        <div className="border-b border-[color:var(--wc-ink)] bg-[color:var(--wc-ink)] px-6 py-5 text-primary-foreground">
          <p className="wc-display text-xs font-black text-[color:var(--wc-gold)]">
            Bolão da Copa
          </p>
          <CardTitle className="mt-1 font-heading text-6xl font-black leading-none">
            Entrar
          </CardTitle>
        </div>
        <CardHeader className="gap-2">
          <CardDescription className="text-sm leading-6">
            Use o usuário e a senha já cadastrados para acessar o bolão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
