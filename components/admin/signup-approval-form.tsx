"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  approveIndividualSignupRequest,
  approveSignupRequest,
  rejectSignupRequest,
} from "@/lib/actions/admin-signup-approvals";

type AccessSetup = "organization" | "individual";

type OrganizationOption = {
  id: string;
  name: string;
  type_code: string;
};

type SignupApprovalFormProps = {
  organizations: OrganizationOption[];
  requestId: string;
};

export function SignupApprovalForm({
  organizations,
  requestId,
}: SignupApprovalFormProps) {
  const [accessSetup, setAccessSetup] = useState<AccessSetup>("organization");

  return (
    <div className="grid gap-3">
      <label className="grid gap-2 text-sm font-medium">
        Access setup
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          onChange={(event) =>
            setAccessSetup(event.target.value as AccessSetup)
          }
          value={accessSetup}
        >
          <option value="organization">Organization user</option>
          <option value="individual">Individual client</option>
        </select>
      </label>

      {accessSetup === "organization" ? (
        <form action={approveSignupRequest} className="grid gap-3 md:grid-cols-2">
          <input name="requestId" type="hidden" value={requestId} />
          <label className="grid gap-2 text-sm font-medium">
            Organization
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              name="organizationId"
              required
            >
              <option value="">Select organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} ({organization.type_code})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Initial role
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              defaultValue="member"
              name="initialRole"
              required
            >
              <option value="member">Member</option>
              <option value="org_admin">Organization admin</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium md:col-span-2">
            Review notes
            <textarea
              className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={2000}
              name="reviewNotes"
            />
          </label>
          <p className="text-sm text-muted-foreground md:col-span-2">
            Approval activates the account and creates an active membership in
            the selected organization.
          </p>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">Approve organization user</Button>
            <Button
              formAction={rejectSignupRequest}
              formNoValidate
              type="submit"
              variant="destructive"
            >
              Reject
            </Button>
          </div>
        </form>
      ) : (
        <form
          action={approveIndividualSignupRequest}
          className="grid gap-3"
        >
          <input name="requestId" type="hidden" value={requestId} />
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            Individual approval creates no organization membership. Assign only
            the required surveys from the account&apos;s User Detail page after
            activation.
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Review notes
            <textarea
              className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={2000}
              name="reviewNotes"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit">Approve individual client</Button>
            <Button
              formAction={rejectSignupRequest}
              formNoValidate
              type="submit"
              variant="destructive"
            >
              Reject
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
