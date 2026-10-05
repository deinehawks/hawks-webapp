import Link from "next/link";

import { loadRecordingSurveys } from "@/lib/recording/surveys";
import {
  RECORDING_PCD_MAX_BYTES,
  RECORDING_PCD_MAX_LABEL,
} from "@/lib/recording/limits";
import { requireRecordingAdmin } from "@/lib/recording/context";

export default async function RecordingChecklist() {
  await requireRecordingAdmin();
  const surveys = await loadRecordingSurveys();
  const rows = surveys
    .map((survey) => ({ id: survey.id, survey }))
    .sort(
      (a, b) =>
        a.survey.code.localeCompare(b.survey.code) || a.id.localeCompare(b.id),
    );

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Recording checklist</h1>
      <p>
        {rows.length} authorized published surveys. V3 publication, asset
        verification and current output records are prerequisites; mark a
        recording complete only after checking its rendered map.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Client</th>
              <th>Survey</th>
              <th>Orthomap preparation</th>
              <th>Point clouds</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, survey }) => (
              <tr className="border-t" key={id}>
                <td className="py-3">{survey.code || "Unavailable"}</td>
                <td>
                  <Link className="underline" href={"/dashboard/surveys/" + id}>
                    {id}
                  </Link>
                </td>
                <td>
                  {!survey.ortho
                    ? "Current orthomosaic record missing"
                    : !survey.tile_url
                      ? "Published matching tile metadata missing"
                      : !survey.flight_date
                        ? "Survey date missing"
                        : "Prepared — rendering check pending"}
                </td>
                <td>
                  {survey.recording_clouds.length}
                  {survey.recording_clouds.some(
                    (cloud) => cloud.bytes > RECORDING_PCD_MAX_BYTES,
                  )
                    ? ` (exceeds ${RECORDING_PCD_MAX_LABEL})`
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
