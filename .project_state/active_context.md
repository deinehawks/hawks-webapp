# Active context
Last updated: 2026-10-05.

Current priority is the V3 staging migration gate, not another V2 allowlist
edit. This V2 checkout now dynamically displays only assets returned by the
signed-in user's RLS-authorized published-output RPC and verifies exact current
artifact identity before rendering. Static selection/catalog/binding files no
longer control runtime visibility. Local tests pass 30/30. Staging does not yet
have the new RPC; keep the current live recording process unchanged until the
V3 migration is reviewed, backed up, rehearsed, explicitly approved and
verified in staging.

Historical recovery note: the temporary one-survey/demo-client screencast bypass is fully reverted. The
evidence-backed 58-survey selection/catalog and normal RLS-filtered loader are
authoritative again; tests pass 29/29 and V2 is running behind 127.0.0.1:8082.

The team chose V2 screen recordings for the workshop; V3 is preserved for later.
Record locally, using staging Supabase and existing protected MinIO delivery.

Migration completed: additional Wave 010 finished 2026-09-29T09:28:47.223Z.
Final runner 20260929-165922 / PID 24236 has exited; final stderr is empty.
All ten additional reports passed the saved-evidence audit: 28 surveys,
1,366,555 objects, 91,438,193,367 bytes. All 21 cumulative reports passed.
Installation/build deferral is now lifted; npm ci and V2 build completed.
Do not rename V3 or change/restart its services without the separate proxy plan.

The editable V3 private allowlist contains one blank survey ID. V2 selection
was recovered from the 11 original completed manifest-entry evidence files
plus the additional allowlist; exactly 58 unique survey IDs are configured.
Do not repair that V3 file as part of recording preparation.

The exact V2 output binding fix is complete. Unknown dates stay null.
AH-026012/AH-026013 preserve their existing rows, counts and pointers; their
verified delivery routes are bound explicitly without a database update.
The revised r4 package passed isolated rehearsal, was explicitly approved and
applied to staging, and passed exact post-apply verification. Its 77-entry
manifest passed separately approved review and activation transitions and is
active. The isolated proxy is healthy at
http://127.0.0.1:8082/asimov-hawks. Use that exact hostname for the V2 member
session while V3 admin remains on localhost:8080; using localhost for both
shares Supabase cookies across ports and can make V2 appear as the V3 admin.
All 58 selected surveys now have current ortho metadata and 11 have current PCD
metadata; 56 dates remain null. Do not invent acquisition dates.
The V2 admission gate is now 5 GiB. Real multi-GiB parse, memory and GPU
behavior is not guaranteed and remains a browser smoke-test gate.

Active ordinary accounts are accepted. Their navigation and survey loaders are
limited by both the 58-survey recording selection and Supabase RLS. For the
UEMPC account, the supervisor-approved recording scope is now only AH-026032.
AH-025006 is outside the 58-survey V2 catalog; AH-026046, AH-026053 and
AH-026061 must remain revoked. Confirm the V3 User App Preview shows exactly
AH-026032, then sign into V2 through 127.0.0.1 and run the member smoke. The
survey has no verified PCD and must show the explicit 3D-unavailable state.
