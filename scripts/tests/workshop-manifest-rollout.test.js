/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const test = require("node:test");
const {
  assertReviewOnlyDraft,
  instantiateDraft,
  sha256,
} = require("../package-workshop-manifest-rollout");

const REVIEW_ONLY_SQL = `
-- REVIEW ONLY.
insert into public.workshop_manifests (id, manifest_key)
values (:new_manifest_id, :new_manifest_key);
insert into public.workshop_manifest_entries (manifest_id, reference_key)
values (:new_manifest_id, 'entry');
`;

test("accepts the two-insert review-only draft", () => {
  assert.doesNotThrow(() => assertReviewOnlyDraft(REVIEW_ONLY_SQL));
});

test("rejects mutation beyond the two draft inserts", () => {
  assert.throws(
    () => assertReviewOnlyDraft(
      `${REVIEW_ONLY_SQL}\nupdate public.workshop_manifests set status = 'approved';`,
    ),
    /prohibited operation/,
  );
});

test("instantiates both manifest placeholders", () => {
  const sql = instantiateDraft(
    REVIEW_ONLY_SQL,
    "11111111-1111-4111-8111-111111111111",
    "manifest-2026-09-25",
  );
  assert.doesNotMatch(sql, /:new_manifest_/);
  assert.match(
    sql,
    /'11111111-1111-4111-8111-111111111111'::uuid/,
  );
  assert.match(sql, /'manifest-2026-09-25'/);
});

test("produces stable SHA-256 hashes", () => {
  assert.equal(
    sha256("workshop"),
    "ee510d1a07ac7e6491ea191cd1918ea553ed2a358c8a0a04c1b90bd89222c314",
  );
});
