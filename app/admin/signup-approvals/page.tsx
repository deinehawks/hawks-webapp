import Link from "next/link";
import { redirect } from "next/navigation";
import { UserCheck } from "lucide-react";
import { SignupApprovalForm } from "@/components/admin/signup-approval-form";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignupApprovalsPage() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin" || profile.account_status !== "active") {
    redirect("/account/pending");
  }

  const supabase = await createClient();
  const [organizationsResponse, requestsResponse] = await Promise.all([
    supabase.from("organizations").select("id, name, type_code")
      .eq("status", "active").order("name"),
    supabase.from("account_signup_requests")
      .select("id, profile_id, email, status, review_notes, created_at, organization:organizations(name), initial_role")
      .order("created_at", { ascending: false }).limit(100),
  ]);
  if (organizationsResponse.error) throw new Error("Failed to load organizations.");
  if (requestsResponse.error) throw new Error("Failed to load signup requests.");
  const organizations = organizationsResponse.data ?? [];
  const requests = requestsResponse.data ?? [];

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <UserCheck className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">Signup approvals</h1>
          <p className="text-sm text-muted-foreground">
            Review user-created accounts, then configure organization or individual access.
          </p>
        </div>
      </div>
      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No signup requests yet.</CardContent></Card>
        ) : requests.map((request) => (
          <Card key={request.id}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">{request.email}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Requested {new Date(request.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline">{request.status}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              {request.status === "pending" ? (
                <SignupApprovalForm
                  organizations={organizations}
                  requestId={request.id}
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>{request.organization?.name
                    ?? (request.status === "approved"
                      ? "Individual client - No organization membership"
                      : "No access configured")}
                    {request.initial_role ? ` · ${request.initial_role.replace("_", " ")}` : ""}
                  </p>
                  {request.review_notes ? <p className="mt-1">{request.review_notes}</p> : null}
                  {request.status === "approved" ? (
                    <Button asChild className="mt-2 w-fit" size="sm" variant="outline">
                      <Link href={"/admin/users/" + request.profile_id}>Manage access</Link>
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
