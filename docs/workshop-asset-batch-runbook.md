# Workshop asset batch runbook

This workflow publishes only explicitly reviewed 2026 workshop tiles and point clouds from `Z:\surveys\2026` to staging MinIO. It never changes Supabase rows or activates a workshop manifest.

## Safety contract

- Keep the real allowlist at `.tmp/workshop-assets/allowlist.json`; it is ignored by Git.
- `AH-026012` and `AH-026013` are permanently blocked.
- Every survey must have one staging survey row, a canonical client, and one confirmed primary mapping to an active organization.
- Every PCD must be explicitly approved or ignored with a reason. Unreviewed PCDs block preparation.
- Waves contain at most three surveys.
- MinIO must retain the larger of 15% capacity or 100 GiB after the remaining transfer plus 10% overhead.
- Generated SQL is review-only. It does not approve, activate, or supersede a manifest.

## Prepare and review

1. Copy `scripts/workshop-assets-allowlist.example.json` to `.tmp/workshop-assets/allowlist.json` if the private file does not exist.
2. Add only approved surveys, tile variants, and exact PCD paths. Add unfinished PCDs to `ignoredPointClouds` with a reason and review date.

Use these field shapes inside the private file:

```json
{
  "approvedSurveys": [
    { "surveyId": "<SURVEY-ID>", "tileVariant": "sharp-corners", "includeTiles": true }
  ],
  "approvedPointClouds": [
    { "surveyId": "<SURVEY-ID>", "sourceFile": "Z:\\surveys\\2026\\<SURVEY-ID>\\rgb\\3d\\<FILE>.pcd" }
  ],
  "ignoredPointClouds": [
    { "surveyId": "<SURVEY-ID>", "sourceFile": "Z:\\surveys\\2026\\<SURVEY-ID>\\rgb\\3d\\<FILE>.pcd", "reason": "processing incomplete", "reviewDate": "2026-08-25" }
  ]
}
```
3. Run `npm run workshop-assets:prepare`.
4. Review `inventory.json`, `capacity-assessment.json`, `blocked-items.json`, and every generated wave job under `.tmp/workshop-assets`.
5. Freeze one reviewed wave with `npm run workshop-assets:review -- --config .tmp/workshop-assets/generated/wave-001.jobs.json`.
6. Do not edit the reviewed JSON or its SHA-256 sidecar.

An empty allowlist succeeds without querying staging or generating upload jobs.

## Background upload

Start exactly one reviewed wave:

```powershell
npm run workshop-assets:runner -- start -Config .tmp/workshop-assets/reviewed/<reviewed-file>.jobs.json
```

Monitor or stop it:

```powershell
npm run workshop-assets:runner -- status
npm run workshop-assets:runner -- stop
```

The runner uses a single lock, hidden background process, frozen config copy, PID metadata, and separate output/error logs. `stop` requests a graceful halt between batches rather than terminating an in-flight multipart upload. Uploads stream through multipart S3 with retries, resume by checking existing object sizes, and verify every object with `HeadObject`.

After success, review the verification JSON and manifest-draft SQL under `.tmp/workshop-assets/verification`. Apply manifest changes only through the separately approved staging SQL workflow. Production remains out of scope.
