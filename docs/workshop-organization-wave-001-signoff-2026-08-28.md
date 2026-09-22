# Workshop Organization Wave 1 Sign-Off

Date: 2026-08-28

Environment: non-production staging

Wave: `workshop-organization-wave-001`

Surveys: `AH-026012` and `AH-026013`

## Outcome

Wave 1 is accepted as the completed organization-scope pilot. The reviewed
configuration checksum and full object-verification check passed, and the
background runner stopped after successful completion.

## Evidence

- The frozen reviewed configuration and SHA-256 sidecar match.
- The staging configuration contains only the two approved pilot surveys.
- Verification completed at `2026-08-27T06:51:20.538Z`.
- All 37,868 objects verified, totaling 6,705,469,416 bytes.
- Tiles and one point cloud verified for each survey.
- All four capacity checks passed.
- Four organization-protected manifest entries were emitted.
- No partial manifest SQL was generated or activated.
- The user confirmed the prescribed checksum and full-object checks passed.

Ignored evidence remains under `.tmp/workshop-assets/reviewed/`,
`.tmp/workshop-assets/runner/20260827-144012/`, and
`.tmp/workshop-assets/verification/`.

## Resolved Runtime Follow-Up

Wave 1 completed validly on Node.js 20.19.6. Before Wave 2 review, NVM was
switched to Node.js 22.22.0 and the repository runtime declaration, lockfile,
and Node type definitions were aligned. AWS SDK imports pass without the prior
warning; focused workshop tests 17/17, targeted ESLint, and TypeScript pass.

## Boundaries And Next Gate

This sign-off covers only the Wave 1 staging asset upload and verification. It
does not approve later uploads or activate a manifest. Production, Auth users,
memberships, grants, and Supabase records were unchanged by the asset runner.
Review and freeze Wave 2 next, then obtain separate explicit upload approval.
