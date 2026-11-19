/* eslint-disable @typescript-eslint/no-require-imports, no-console */
const fs = require("node:fs/promises");
const path = require("node:path");
const { Client } = require("pg");

const ROOT = path.resolve(process.cwd(), ".tmp/workshop-assets/onboarding");

function transactionBody(sql) {
  const beginMarker = "\nbegin;\n";
  const rollbackMarker = "\nrollback;";
  const start = sql.indexOf(beginMarker);
  const end = sql.lastIndexOf(rollbackMarker);
  if (start === -1 || end === -1 || end <= start) throw new Error("Generated rehearsal SQL does not have the expected transaction boundary.");
  return sql.slice(start + beginMarker.length, end);
}

async function main() {
  const preview = JSON.parse(await fs.readFile(path.join(ROOT, "preview.json"), "utf8"));
  if (preview.targetEnvironment !== "staging" || preview.conflicts.length) throw new Error("A clean staging preview is required.");
  const rehearsal = await fs.readFile(path.join(ROOT, "staging-onboarding.rehearsal.sql"), "utf8");
  const db = new Client({ host: "127.0.0.1", port: 54322, database: "postgres", user: "postgres", password: "postgres" });
  await db.connect();
  try {
    await db.query("begin");
    for (const row of preview.inventory.clients) {
      await db.query(
        "insert into public.clients (id, code, name, classification_kind) values ($1, $2, $3, $4)",
        [row.id, row.code, row.name, row.classification_kind],
      );
    }
    for (const row of preview.inventory.organizations) {
      await db.query(
        "insert into public.organizations (id, code, name, type_code, status) values ($1, $2, $3, $4, $5)",
        [row.id, row.code, row.name, row.type_code, row.status],
      );
    }
    for (const row of preview.inventory.clientOrganizations) {
      const client = preview.inventory.clients.find((item) => item.code === row.client_code);
      await db.query(
        "insert into public.client_organizations (client_id, organization_id, relationship_type, review_status, is_primary) values ($1, $2, 'legacy_client', $3, $4)",
        [client.id, row.organization_id, row.review_status, row.is_primary],
      );
    }
    for (const row of preview.inventory.surveys) {
      const client = preview.inventory.clients.find((item) => item.code === row.client_code);
      await db.query(
        "insert into public.surveys (id, code, access_code, organization_code, client_id, status) values ($1, $2, $3, $4, $5, $6)",
        [row.id, row.code, row.access_code, row.organization_code, client.id, row.status],
      );
    }
    await db.query(transactionBody(rehearsal));
    const surveyCount = await db.query("select count(*)::integer as count from public.surveys where id like 'AH-026%'");
    const individualOrganizationCount = await db.query(`select count(*)::integer as count
                                                          from public.survey_organizations as mapping
                                                          join public.surveys as survey on survey.id = mapping.survey_id
                                                          join public.clients as client on client.id = survey.client_id
                                                         where client.classification_kind = 'individual'`);
    if (surveyCount.rows[0].count !== 30) throw new Error(`Expected 30 workshop surveys, found ${surveyCount.rows[0].count}.`);
    if (individualOrganizationCount.rows[0].count !== 0) throw new Error("Individual surveys acquired organization relationships.");
    await db.query("rollback");
    console.log("Local onboarding rehearsal passed and was rolled back.");
  } catch (error) {
    await db.query("rollback");
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("Local onboarding rehearsal failed:", error.message);
  process.exitCode = 1;
});
