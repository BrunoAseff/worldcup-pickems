import { requireAuthenticatedUser } from "@/lib/auth/session";
import { FloatingNav } from "@/components/app/floating-nav";
import { getViewerRankingStatus } from "@/lib/ranking/queries";

export default async function KnockoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuthenticatedUser();
  const rankingStatus = await getViewerRankingStatus(user.id, user.role);

  return (
    <>
      <FloatingNav user={user} rankingStatus={rankingStatus} activeKey="knockout" />
      {children}
    </>
  );
}
