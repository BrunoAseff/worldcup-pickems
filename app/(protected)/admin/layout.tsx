import { requireAuthenticatedUser } from "@/lib/auth/session";
import { FloatingNav } from "@/components/app/floating-nav";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAuthenticatedUser();

  return (
    <>
      <FloatingNav user={user} activeHref="/admin" />
      {children}
    </>
  );
}
