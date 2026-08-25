import Link from "next/link";
import { ClipboardCheckIcon } from "lucide-react";
import { redirect } from "next/navigation";

import {
  approveOrganizationOnboardingRequest,
  rejectOrganizationOnboardingRequest,
} from "@/lib/actions/admin-onboarding-requests";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OnboardingRequestsPage() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin" || profile.account_status !== "active") {
    redirect("/account/pending");
  }

  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("organization_user_requests")
    .select(
      "id, requested_email, requested_name, notes, status, review_notes, reviewed_at, created_at, organization:organizations(name, code), requester:profiles!organization_user_requests_requested_by_fkey(email, first_name, last_name), reviewer:profiles!organization_user_requests_reviewed_by_fkey(email, first_name, last_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error("Failed to load organization onboarding requests.", { cause: error });

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <ClipboardCheckIcon className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Organization onboarding</h1>
          <p className="text-sm text-muted-foreground">
            Review requests submitted by organization administrators.
          </p>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="p-4 text-sm">
          Approval records the organization&apos;s onboarding intent only. It does not create an
          account or membership. The recipient must sign up, confirm their email, and then be
          activated from <Link className="font-medium underline" href="/admin/signup-approvals">Signup Approvals</Link>.
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {!requests?.length ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No organization onboarding requests yet.
            </CardContent>
          </Card>
        ) : requests.map((request) => {
          const requesterName = [request.requester?.first_name, request.requester?.last_name]
            .filter(Boolean)
            .join(" ");
          const reviewerName = [request.reviewer?.first_name, request.reviewer?.last_name]
            .filter(Boolean)
            .join(" ");
          return (
            <Card key={request.id}>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{request.requested_email}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {request.requested_name || "Name not provided"} - {request.organization?.name ?? "Unknown organization"}
                    {request.organization?.code ? ` (${request.organization.code})` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested by {requesterName || request.requester?.email || "Unknown administrator"} on {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline">{request.status}</Badge>
              </CardHeader>
              <CardContent className="grid gap-4">
                {request.notes ? <p className="text-sm">Request notes: {request.notes}</p> : null}
                {request.status === "pending" ? (
                  <form action={approveOrganizationOnboardingRequest} className="grid gap-3">
                    <input name="requestId" type="hidden" value={request.id} />
                    <label className="grid gap-2 text-sm font-medium">
                      Review notes
                      <textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" maxLength={2000} name="reviewNotes" />
                    </label>
                    <div className="flex gap-2">
                      <Button type="submit">Approve request</Button>
                      <Button formAction={rejectOrganizationOnboardingRequest} type="submit" variant="destructive">
                        Reject
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {request.reviewed_at ? (
                      <p>
                        Reviewed by {reviewerName || request.reviewer?.email || "platform administrator"} on {new Date(request.reviewed_at).toLocaleString()}
                      </p>
                    ) : null}
                    {request.review_notes ? <p>{request.review_notes}</p> : null}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
