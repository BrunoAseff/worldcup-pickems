import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function LogoutForm() {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-11 rounded-sm border border-[color:var(--wc-ink)] bg-background text-foreground shadow-[2px_2px_0_var(--wc-ink)] hover:bg-destructive hover:text-destructive-foreground"
        aria-label="Sair"
        title="Sair"
      >
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
