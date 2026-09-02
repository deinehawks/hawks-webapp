import { UserDashboardOverview } from "@/components/user-dashboard-overview";
import { getUserAppPreviewData } from "@/lib/admin/user-app-preview";

export default async function UserAppPreviewPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const preview = await getUserAppPreviewData(profileId);

  if (preview.status !== "active") {
    const message = preview.status === "platform-admin"
      ? "Platform administrators land in the Admin application, so a user dashboard preview does not apply."
      : "This account would be redirected to the pending-account screen because it is not active.";
    return (
      <div className="m-4 rounded-lg border bg-muted/30 p-6 text-sm md:m-6">
        {message}
      </div>
    );
  }

  const base = `/user-app-preview/${profileId}`;
  return (
    <UserDashboardOverview
      detectedObjects={preview.detectedObjects}
      orthomapHrefBase={`${base}/orthomap`}
      surveyHrefBase={`${base}/surveys`}
      surveys={preview.surveys}
    />
  );
}
