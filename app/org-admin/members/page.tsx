import {
  EmptyState,
  OrgAdminPage,
  OrgAdminSection,
  StatusBadge,
  SubmitButton,
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
  promoteOrgAdminMember,
  updateOrgAdminMemberStatus,
} from "@/lib/actions/org-admin";
import type { Tables } from "@/lib/database.types";
import { getOrgAdminContext } from "@/lib/org-admin/context";
import { createClient } from "@/utils/supabase/server";

type MemberRow = Pick<
  Tables<"organization_memberships">,
  "id" | "profile_id" | "role" | "status" | "notes" | "updated_at"
> & {
  profile: Pick<Tables<"profiles">, "email" | "first_name" | "last_name"> | null;
};

function memberName(member: MemberRow): string {
  const name = [member.profile?.first_name, member.profile?.last_name]
    .filter(Boolean)
    .join(" ");
  return name || member.profile?.email || member.profile_id;
}

export default async function OrgAdminMembersPage() {
  const { organization } = await getOrgAdminContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_memberships")
    .select(
      "id, profile_id, role, status, notes, updated_at, profile:profiles!organization_memberships_profile_id_fkey(email, first_name, last_name)",
    )
    .eq("organization_id", organization.id)
    .order("created_at");

  if (error) throw new Error("Failed to load organization members.", { cause: error });
  const members = (data ?? []) as MemberRow[];

  return (
    <OrgAdminPage
      title="Members"
      description="Manage ordinary members. Existing organization administrators are platform-managed."
    >
      <OrgAdminSection title="Organization memberships">
        {members.length === 0 ? (
          <EmptyState>No membership records are available.</EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{memberName(member)}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.profile?.email ?? member.profile_id}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge value={member.role} /></TableCell>
                  <TableCell><StatusBadge value={member.status} /></TableCell>
                  <TableCell className="max-w-64 truncate">{member.notes ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {member.role === "member" && member.status === "active" ? (
                        <>
                          <form action={promoteOrgAdminMember}>
                            <input type="hidden" name="membershipId" value={member.id} />
                            <SubmitButton variant="outline">Promote</SubmitButton>
                          </form>
                          <MemberStatusForm id={member.id} status="suspended" label="Suspend" />
                          <MemberStatusForm id={member.id} status="removed" label="Remove" destructive />
                        </>
                      ) : null}
                      {member.role === "member" && member.status === "suspended" ? (
                        <>
                          <MemberStatusForm id={member.id} status="active" label="Reactivate" />
                          <MemberStatusForm id={member.id} status="removed" label="Remove" destructive />
                        </>
                      ) : null}
                      {member.role === "org_admin" ? (
                        <span className="text-xs text-muted-foreground">Platform-managed</span>
                      ) : null}
                    </div>
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

function MemberStatusForm({
  id,
  status,
  label,
  destructive,
}: {
  id: string;
  status: "active" | "suspended" | "removed";
  label: string;
  destructive?: boolean;
}) {
  return (
    <form action={updateOrgAdminMemberStatus}>
      <input type="hidden" name="membershipId" value={id} />
      <input type="hidden" name="nextStatus" value={status} />
      <SubmitButton variant={destructive ? "destructive" : "outline"}>{label}</SubmitButton>
    </form>
  );
}

