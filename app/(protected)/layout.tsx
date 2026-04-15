import { FloatingNav } from "@/components/app/floating-nav";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getViewerRankingStatus } from "@/lib/ranking/queries";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuthenticatedUser();
  const rankingStatus = await getViewerRankingStatus(user.id, user.role);

  return (
    <div className="min-h-screen pb-10">
      <FloatingNav user={user} rankingStatus={rankingStatus} />
      {children}
    </div>
  );
}
