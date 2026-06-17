import { DailyPredictionsPage } from "@/components/daily-predictions/daily-predictions-page";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getDailyPredictionsPageView } from "@/lib/daily-predictions/queries";

type DailyPredictionsRouteProps = {
  searchParams: Promise<{
    dia?: string | string[];
  }>;
};

export default async function DailyPredictionsRoute({
  searchParams,
}: DailyPredictionsRouteProps) {
  const user = await requireAuthenticatedUser();
  const resolvedSearchParams = await searchParams;
  const rawDate = resolvedSearchParams.dia;
  const requestedDate = Array.isArray(rawDate) ? rawDate[0] : rawDate;
  const view = await getDailyPredictionsPageView({
    requestedDate,
    viewerUserId: user.id,
  });

  return <DailyPredictionsPage view={view} />;
}
