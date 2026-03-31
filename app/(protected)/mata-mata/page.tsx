import { KnockoutShell } from "@/components/knockout/knockout-shell";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getKnockoutAdminView, getKnockoutPlayerView } from "@/lib/knockout/queries";

export default async function KnockoutPage() {
  const user = await requireAuthenticatedUser();

  if (user.role === "admin") {
    const view = await getKnockoutAdminView();
    return <KnockoutShell view={view} mode="admin" />;
  }

  const view = await getKnockoutPlayerView(user.id);
  return <KnockoutShell view={view} mode="player" />;
}
