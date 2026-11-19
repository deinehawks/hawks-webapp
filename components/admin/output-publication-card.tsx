import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteOutputPublicationDraft,
  publishOutputPublication,
  retireOutputPublication,
  saveOutputPublication,
} from "@/lib/actions/admin-outputs";

type PublicationView = {
  status: string;
  dataset_year: number;
  route_pattern: string;
  tile_folder: string | null;
  min_zoom: number | null;
  max_zoom: number | null;
  bounds: number[] | null;
  file_name: string | null;
  byte_size: number | null;
  verified_at: string | null;
  published_at: string | null;
  source_system: string | null;
  external_run_id: string | null;
  destination_prefix_alias: string | null;
};

type OutputPublicationCardProps = {
  outputId: string;
  outputType: string;
  outputIsCurrent: boolean;
  outputStatus: string;
  flightDate: string | null;
  surveyBounds: [number | null, number | null, number | null, number | null];
  currentTileFolder: string | null;
  publication: PublicationView | null;
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function OutputPublicationCard({
  outputId,
  outputType,
  outputIsCurrent,
  outputStatus,
  flightDate,
  surveyBounds,
  currentTileFolder,
  publication,
}: OutputPublicationCardProps) {
  const supported =
    outputType === "orthomosaic" || outputType === "point_cloud";
  const editable =
    !publication || publication.status === "draft" || publication.status === "verified";
  const defaultYear =
    publication?.dataset_year ??
    (flightDate ? new Date(`${flightDate}T00:00:00Z`).getUTCFullYear() : new Date().getUTCFullYear());
  const bounds = publication?.bounds?.length === 4
    ? publication.bounds
    : surveyBounds;
  const canPublish =
    publication?.status === "verified" &&
    outputIsCurrent &&
    (outputStatus === "ready" || outputStatus === "approved");

  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Protected delivery</CardTitle>
          <Badge variant={publication?.status === "published" ? "default" : "secondary"}>
            {publication?.status ?? "Not configured"}
          </Badge>
        </div>
        <p className="text-sm font-normal text-muted-foreground">
          Published deliveries become discoverable to authorized V2 and V3 users.
          Saving a verified draft resets its verification.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5">
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            Protected delivery currently supports orthomosaic and point-cloud outputs.
          </p>
        ) : null}

        {supported && editable ? (
          <form action={saveOutputPublication} className="grid gap-4 lg:grid-cols-2">
            <input name="outputId" type="hidden" value={outputId} />
            <label className="grid gap-2 text-sm font-medium">
              Dataset year
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm"
                defaultValue={defaultYear}
                max={2100}
                min={2000}
                name="datasetYear"
                required
                type="number"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Prefix alias (optional)
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm"
                defaultValue={publication?.destination_prefix_alias ?? ""}
                maxLength={200}
                name="destinationPrefixAlias"
                pattern="[A-Za-z0-9][A-Za-z0-9._:-]*"
              />
            </label>

            {outputType === "orthomosaic" ? (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  Tile folder
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    defaultValue={publication?.tile_folder ?? currentTileFolder ?? ""}
                    maxLength={255}
                    name="tileFolder"
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
                    required
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2 text-sm font-medium">
                    Min zoom
                    <input
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                      defaultValue={publication?.min_zoom ?? ""}
                      max={30}
                      min={0}
                      name="minZoom"
                      required
                      type="number"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Max zoom
                    <input
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                      defaultValue={publication?.max_zoom ?? ""}
                      max={30}
                      min={0}
                      name="maxZoom"
                      required
                      type="number"
                    />
                  </label>
                </div>
                {(["minX", "minY", "maxX", "maxY"] as const).map((name, index) => (
                  <label className="grid gap-2 text-sm font-medium" key={name}>
                    {name}
                    <input
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                      defaultValue={bounds[index] ?? ""}
                      name={name}
                      required
                      step="any"
                      type="number"
                    />
                  </label>
                ))}
              </>
            ) : (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  PCD filename
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    defaultValue={publication?.file_name ?? ""}
                    maxLength={254}
                    name="fileName"
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]*\.[Pp][Cc][Dd]"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  File bytes (maximum 5 GiB)
                  <input
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    defaultValue={publication?.byte_size ?? ""}
                    max={5368709120}
                    min={1}
                    name="byteSize"
                    required
                    type="number"
                  />
                </label>
              </>
            )}

            <div className="flex justify-end lg:col-span-2">
              <Button type="submit">
                {publication ? "Update draft" : "Create draft"}
              </Button>
            </div>
          </form>
        ) : null}

        {publication ? (
          <div className="grid gap-3 rounded-md border p-4 text-sm">
            <div>
              <p className="font-medium">Protected route</p>
              <p className="break-all text-muted-foreground">{publication.route_pattern}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="font-medium">Verification</p>
                <p className="text-muted-foreground">
                  {formatTimestamp(publication.verified_at)}
                  {publication.source_system ? ` � ${publication.source_system}` : ""}
                  {publication.external_run_id ? ` / ${publication.external_run_id}` : ""}
                </p>
              </div>
              <div>
                <p className="font-medium">Published</p>
                <p className="text-muted-foreground">
                  {formatTimestamp(publication.published_at)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {publication?.status === "draft" ? (
          <p className="text-sm text-muted-foreground">
            Waiting for the approved pipeline/service verifier. Publication remains
            unavailable until exact object verification succeeds.
          </p>
        ) : null}

        {supported && publication ? (
          <div className="flex flex-wrap justify-end gap-2">
            {canPublish ? (
              <form action={publishOutputPublication}>
                <input name="outputId" type="hidden" value={outputId} />
                <Button type="submit">Publish delivery</Button>
              </form>
            ) : null}
            {publication.status === "verified" && !canPublish ? (
              <p className="mr-auto text-sm text-muted-foreground">
                Set this output as current and keep it ready or approved before publishing.
              </p>
            ) : null}
            {publication.status === "published" ? (
              <form action={retireOutputPublication}>
                <input name="outputId" type="hidden" value={outputId} />
                <Button type="submit" variant="outline">Retire delivery</Button>
              </form>
            ) : null}
            {publication.status === "draft" || publication.status === "verified" ? (
              <form action={deleteOutputPublicationDraft}>
                <input name="outputId" type="hidden" value={outputId} />
                <Button type="submit" variant="outline">Delete draft</Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
