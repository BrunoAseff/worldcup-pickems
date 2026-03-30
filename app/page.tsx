import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function Home() {
  const session = await getCurrentSession();

  redirect(session ? routes.groupStage : routes.login);
}
