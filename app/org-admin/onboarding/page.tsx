import {
  EmptyState,
  OrgAdminPage,
  OrgAdminSection,
  StatusBadge,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/org-admin/org-admin-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cancelOrgAdminOnboardingRequest,
  createOrgAdminOnboardingRequest,
} from "@/lib/actions/org-admin";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

export default async function OrgAdminOnboardingPage() {
  const { user, organization } = await getOrgAdminContext();
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("organization_user_requests")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to load onboarding requests.", { cause: error });

  return (
    <OrgAdminPage
      title="Onboarding requests"
      description="Request platform-admin review for a person who should create their own Auth account."
    >
      <OrgAdminSection
        title="New request"
        description="This does not create an account or membership. Platform administrators review the request."
      >
        <form action={createOrgAdminOnboardingRequest} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="email" label="Email" type="email" required />
            <TextField name="name" label="Name" />
          </div>
          <TextAreaField name="notes" label="Notes" />
          <SubmitButton>Submit request</SubmitButton>
        </form>
      </OrgAdminSection>
      <OrgAdminSection title="Request history">
        {!requests?.length ? (
          <EmptyState>No onboarding requests have been submitted.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review notes</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.requested_email}</TableCell>
                  <TableCell>{request.requested_name ?? "—"}</TableCell>
                  <TableCell><StatusBadge value={request.status} /></TableCell>
                  <TableCell className="max-w-64 truncate">{request.review_notes ?? "-"}</TableCell>
                  <TableCell className="max-w-64 truncate">{request.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {request.status === "pending" && request.requested_by === user.id ? (
                      <form action={cancelOrgAdminOnboardingRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <SubmitButton variant="outline">Cancel</SubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">No action</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </OrgAdminSection>
    </OrgAdminPage>
  );
}
