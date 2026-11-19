"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2, ClipboardPlus, ExternalLink, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  commitDatasetOnboarding,
  previewDatasetOnboarding,
} from "@/lib/actions/admin-dataset-onboarding";
import type {
  DatasetOnboardingCommit,
  DatasetOnboardingInput,
  DatasetOnboardingPreview,
} from "@/lib/dataset-onboarding";

export type DatasetOnboardingClientOption = {
  id: string;
  code: string;
  name: string | null;
  classification_kind: "unclassified" | "organization" | "individual" | "other";
};
export type DatasetOnboardingOrganizationOption = {
  id: string;
  name: string;
  code: string | null;
};
export type DatasetOnboardingPersonOption = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};
export type DatasetOnboardingFarmOption = {
  id: string;
  name: string;
  code: string | null;
};

type FormValues = {
  clientMode: "existing" | "new";
  clientId: string;
  clientCode: string;
  clientName: string;
  ownershipKind: "organization" | "private";
  organizationId: string;
  personId: string;
  primaryFarmId: string;
  surveyIdsText: string;
};

const initialValues: FormValues = {
  clientMode: "existing",
  clientId: "",
  clientCode: "",
  clientName: "",
  ownershipKind: "organization",
  organizationId: "",
  personId: "",
  primaryFarmId: "",
  surveyIdsText: "",
};

function personLabel(person: DatasetOnboardingPersonOption): string {
  return person.display_name
    || [person.first_name, person.last_name].filter(Boolean).join(" ")
    || person.email
    || person.id.slice(0, 8);
}

function buildInput(values: FormValues): DatasetOnboardingInput {
  const client = values.clientMode === "existing"
    ? { mode: "existing" as const, id: values.clientId }
    : { mode: "new" as const, code: values.clientCode, name: values.clientName };
  const ownership = values.ownershipKind === "organization"
    ? { kind: "organization" as const, organizationId: values.organizationId }
    : { kind: "private" as const, personId: values.personId };

  return {
    client,
    ownership,
    primaryFarmId: values.primaryFarmId,
    surveyIds: values.surveyIdsText
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

function FieldErrors({
  preview,
  fields,
}: {
  preview: DatasetOnboardingPreview | null;
  fields: string[];
}) {
  const errors = preview?.errors.filter((item) => fields.includes(item.field)) ?? [];
  if (errors.length === 0) return null;

  return (
    <ul className="space-y-1 text-xs font-normal text-destructive">
      {errors.map((item, index) => (
        <li key={`${item.code}-${index}`}>{item.message}</li>
      ))}
    </ul>
  );
}

export function AdminDatasetOnboardingPage({
  clients,
  organizations,
  people,
  farms,
}: {
  clients: DatasetOnboardingClientOption[];
  organizations: DatasetOnboardingOrganizationOption[];
  people: DatasetOnboardingPersonOption[];
  farms: DatasetOnboardingFarmOption[];
}) {
  const [values, setValues] = useState(initialValues);
  const [preview, setPreview] = useState<DatasetOnboardingPreview | null>(null);
  const [reviewedInput, setReviewedInput] = useState<DatasetOnboardingInput | null>(null);
  const [commitResult, setCommitResult] = useState<DatasetOnboardingCommit | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateValues(patch: Partial<FormValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setPreview(null);
    setReviewedInput(null);
    setCommitResult(null);
    setReviewConfirmed(false);
    setError(null);
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCommitResult(null);
    const input = buildInput(values);
    const result = await previewDatasetOnboarding(input);
    setPending(false);
    if (!result.ok) {
      setPreview(null);
      setReviewedInput(null);
      setError(result.error);
      return;
    }
    setPreview(result.data);
    setReviewedInput(input);
    setReviewConfirmed(false);
  }

  async function handleCommit() {
    if (!reviewedInput || !preview?.valid || !reviewConfirmed) return;
    setPending(true);
    setError(null);
    const result = await commitDatasetOnboarding(reviewedInput);
    setPending(false);
    if (!result.ok) {
      setCommitResult(null);
      setPreview(null);
      setReviewedInput(null);
      setReviewConfirmed(false);
      setError(result.error);
      return;
    }
    setCommitResult(result.data);
  }

  return (
    <main className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardPlus className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-normal">Dataset onboarding</h1>
          <Badge variant="secondary">Platform Admin</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Review one canonical client, owner, primary farm, and up to 100 new survey identities before creating the complete batch atomically.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Onboarding could not continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {commitResult ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Dataset batch created</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{commitResult.surveyCount} draft surveys were created for {commitResult.clientCode}.</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {commitResult.surveyIds.map((surveyId) => (
                <Link
                  className="font-mono text-xs text-primary hover:underline"
                  href={`/admin/surveys/${encodeURIComponent(surveyId)}`}
                  key={surveyId}
                >
                  {surveyId}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm"><Link href="/admin/surveys">View surveys</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={`/admin/clients/${commitResult.clientId}`}>View client</Link></Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">1. Enter batch details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 lg:grid-cols-2" onSubmit={handlePreview}>
            <label className="grid gap-2 text-sm font-medium">
              Client choice
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                onChange={(event) => updateValues({ clientMode: event.target.value as FormValues["clientMode"] })}
                value={values.clientMode}
              >
                <option value="existing">Select existing client</option>
                <option value="new">Create new client</option>
              </select>
              <FieldErrors fields={["client.mode"]} preview={preview} />
            </label>

            {values.clientMode === "existing" ? (
              <label className="grid gap-2 text-sm font-medium">
                Existing client
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  onChange={(event) => updateValues({ clientId: event.target.value })}
                  required
                  value={values.clientId}
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.code} — {client.name ?? "Unnamed"} ({client.classification_kind})
                    </option>
                  ))}
                </select>
                <FieldErrors fields={["client.id"]} preview={preview} />
              </label>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-1">
                <div className="grid gap-2">
                  <Label htmlFor="client-code">Client code</Label>
                  <Input id="client-code" maxLength={80} onChange={(event) => updateValues({ clientCode: event.target.value })} required value={values.clientCode} />
                  <FieldErrors fields={["client.code"]} preview={preview} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client-name">Client name</Label>
                  <Input id="client-name" maxLength={200} onChange={(event) => updateValues({ clientName: event.target.value })} required value={values.clientName} />
                  <FieldErrors fields={["client.name"]} preview={preview} />
                </div>
              </div>
            )}

            <label className="grid gap-2 text-sm font-medium">
              Ownership scope
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                onChange={(event) => updateValues({ ownershipKind: event.target.value as FormValues["ownershipKind"] })}
                value={values.ownershipKind}
              >
                <option value="organization">Organization</option>
                <option value="private">Private person</option>
              </select>
              <FieldErrors fields={["ownership.kind", "ownership"]} preview={preview} />
            </label>

            {values.ownershipKind === "organization" ? (
              <label className="grid gap-2 text-sm font-medium">
                Active organization
                <select className="h-9 rounded-md border bg-background px-3 text-sm" onChange={(event) => updateValues({ organizationId: event.target.value })} required value={values.organizationId}>
                  <option value="">Select organization</option>
                  {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}{organization.code ? ` (${organization.code})` : ""}</option>)}
                </select>
                <FieldErrors fields={["ownership.organizationId"]} preview={preview} />
              </label>
            ) : (
              <label className="grid gap-2 text-sm font-medium">
                Active private owner
                <select className="h-9 rounded-md border bg-background px-3 text-sm" onChange={(event) => updateValues({ personId: event.target.value })} required value={values.personId}>
                  <option value="">Select person</option>
                  {people.map((person) => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}
                </select>
                <FieldErrors fields={["ownership.personId"]} preview={preview} />
              </label>
            )}

            <label className="grid gap-2 text-sm font-medium">
              Active primary farm
              <select className="h-9 rounded-md border bg-background px-3 text-sm" onChange={(event) => updateValues({ primaryFarmId: event.target.value })} required value={values.primaryFarmId}>
                <option value="">Select farm</option>
                {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}{farm.code ? ` (${farm.code})` : ""}</option>)}
              </select>
              <span className="text-xs font-normal text-muted-foreground">The selected owner must have a confirmed owner or operator relationship with this farm.</span>
              <FieldErrors fields={["primaryFarmId"]} preview={preview} />
            </label>

            <label className="grid gap-2 text-sm font-medium lg:col-span-2">
              Survey IDs — one per line
              <textarea className="min-h-40 rounded-md border bg-background px-3 py-2 font-mono text-sm" onChange={(event) => updateValues({ surveyIdsText: event.target.value })} placeholder="AH-026039&#10;AH-026040" required value={values.surveyIdsText} />
              <FieldErrors fields={["surveyIds"]} preview={preview} />
            </label>

            <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Need related records first? <Link className="text-primary hover:underline" href="/admin/organizations/new">Create organization</Link>, <Link className="text-primary hover:underline" href="/admin/farms/new">create farm</Link>, or review <Link className="text-primary hover:underline" href="/admin/people">people</Link>.</p>
              <Button disabled={pending} type="submit">{pending ? "Checking…" : "Preview batch"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {preview ? (
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">2. Review and confirm</CardTitle>
              <Badge variant={preview.valid ? "default" : "destructive"}>
                {preview.valid ? "Ready to commit" : "Blocked"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {preview.errors.length > 0 ? (
              <Alert variant="destructive">
                <ShieldAlert />
                <AlertTitle>Resolve these conflicts</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-5">
                    {preview.errors.map((item, index) => (
                      <li key={`${item.code}-${index}`}>
                        {item.message}
                        {item.value ? ` (${item.value})` : ""}
                        {item.values?.length ? ` (${item.values.join(", ")})` : ""}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            {preview.warnings.length > 0 ? (
              <Alert>
                <AlertTitle>Included relationship changes</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-5">
                    {preview.warnings.map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <dl className="grid gap-4 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">Client</dt><dd className="font-medium">{preview.normalized.client.code} — {preview.normalized.client.name}</dd></div>
              <div><dt className="text-muted-foreground">Classification</dt><dd className="font-medium capitalize">{preview.normalized.client.classificationKind}</dd></div>
              <div><dt className="text-muted-foreground">Owner</dt><dd className="font-medium">{preview.normalized.ownership.name ?? "Not resolved"}</dd></div>
              <div><dt className="text-muted-foreground">Primary farm</dt><dd className="font-medium">{preview.normalized.primaryFarm.name ?? "Not resolved"}</dd></div>
              <div><dt className="text-muted-foreground">Survey status</dt><dd className="font-medium">Draft</dd></div>
              <div><dt className="text-muted-foreground">Survey code</dt><dd className="font-medium">{preview.normalized.surveyDefaults.code ?? "Not resolved"}</dd></div>
              <div><dt className="text-muted-foreground">Access code</dt><dd className="font-medium">{preview.normalized.surveyDefaults.accessCode ?? "Not resolved"}</dd></div>
              <div><dt className="text-muted-foreground">Organization code</dt><dd className="font-medium">NULL</dd></div>
            </dl>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">New survey identities ({preview.normalized.surveyIds.length})</h3>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {preview.normalized.surveyIds.map((surveyId) => (
                  <code className="rounded bg-muted px-2 py-1 text-xs" key={surveyId}>{surveyId}</code>
                ))}
              </div>
            </div>

            {preview.valid && !commitResult ? (
              <div className="flex flex-col gap-4 rounded-md border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <Checkbox checked={reviewConfirmed} id="confirm-onboarding" onCheckedChange={(checked) => setReviewConfirmed(checked === true)} />
                  <Label className="leading-5" htmlFor="confirm-onboarding">
                    I reviewed the normalized client, owner, farm, compatibility fields, and every survey ID. Commit this entire batch atomically.
                  </Label>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button asChild size="sm" variant="outline"><Link href="/admin/surveys"><ExternalLink />Open existing surveys</Link></Button>
                  <Button disabled={!reviewConfirmed || pending} onClick={handleCommit} type="button">
                    {pending ? "Committing…" : `Create ${preview.summary.surveyCount} surveys`}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
