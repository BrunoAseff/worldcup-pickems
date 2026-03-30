import { requireAuthenticatedUser } from "@/lib/auth/session";
import { FloatingNav } from "@/components/app/floating-nav";

export default async function KnockoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuthenticatedUser();

  return (
    <>
      <FloatingNav user={user} activeKey="knockout" />
      {children}
    </>
  );
}
