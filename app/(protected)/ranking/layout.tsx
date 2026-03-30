import { requireAuthenticatedUser } from "@/lib/auth/session";
import { FloatingNav } from "@/components/app/floating-nav";

export default async function RankingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuthenticatedUser();

  return (
    <>
      <FloatingNav user={user} activeKey="ranking" />
      {children}
    </>
  );
}
