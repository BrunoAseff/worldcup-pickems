import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function LogoutForm() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="icon" aria-label="Sair" title="Sair">
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
