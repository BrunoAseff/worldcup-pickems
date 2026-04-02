import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getRankingPageView } from "@/lib/ranking/queries";
import { RankingPageShell } from "@/components/ranking/ranking-page-shell";

export default async function RankingPage() {
  const user = await requireAuthenticatedUser();
  const ranking = await getRankingPageView(user.id, user.role);

  return <RankingPageShell ranking={ranking} />;
}
