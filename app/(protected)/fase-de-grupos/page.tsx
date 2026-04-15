import { requireAuthenticatedUser } from "@/lib/auth/session";
import { GroupStageAdminShell } from "@/components/group-stage/group-stage-admin-shell";
import { GroupStagePredictionsProvider } from "@/components/group-stage/group-stage-predictions-context";
import { GroupStageShell } from "@/components/group-stage/group-stage-shell";
import { getGroupStageAdminView, getGroupStageView } from "@/lib/group-stage/queries";

export default async function GroupStagePage() {
  const user = await requireAuthenticatedUser();

  if (user.role === "admin") {
    const adminView = await getGroupStageAdminView();
    return (
      <GroupStageAdminShell
        groups={adminView.groups}
        lastRecalculatedAt={adminView.lastRecalculatedAt}
        bestThirdSelection={adminView.bestThirdSelection}
      />
    );
  }

  const groups = await getGroupStageView(user.id);

  return (
    <GroupStagePredictionsProvider>
      <GroupStageShell groups={groups} />
    </GroupStagePredictionsProvider>
  );
}
