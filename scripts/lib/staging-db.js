/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const STAGING_SUPABASE_PROJECT_REF = "llealjcaqvltrtdwwzrh";
const LINKED_POOLER_URL = path.resolve(process.cwd(), "supabase/.temp/pooler-url");

function resolveStagingDbConfig() {
  if (process.env.SUPABASE_DB_URL) {
    if (!process.env.SUPABASE_DB_URL.includes(STAGING_SUPABASE_PROJECT_REF)) {
      throw new Error("SUPABASE_DB_URL is not the approved staging project.");
    }
    return { connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } };
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!projectUrl || !password) {
    throw new Error("Staging access requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD, or SUPABASE_DB_URL.");
  }
  const projectRef = new URL(projectUrl).hostname.split(".")[0];
  if (projectRef !== STAGING_SUPABASE_PROJECT_REF) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not the approved staging project.");
  }

  let linkedPooler = null;
  try {
    const poolerUrl = new URL(fs.readFileSync(LINKED_POOLER_URL, "utf8").trim());
    const expectedUser = `postgres.${projectRef}`;
    if (!poolerUrl.hostname.endsWith(".pooler.supabase.com") || decodeURIComponent(poolerUrl.username) !== expectedUser) {
      throw new Error("Linked pooler metadata does not match the approved staging project.");
    }
    linkedPooler = { host: poolerUrl.hostname, port: Number(poolerUrl.port || 5432), user: expectedUser };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return {
    host: process.env.SUPABASE_DB_HOST ?? linkedPooler?.host ?? `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT ?? linkedPooler?.port ?? 5432),
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
    user: process.env.SUPABASE_DB_USER ?? linkedPooler?.user ?? "postgres",
    password,
    ssl: { rejectUnauthorized: false },
  };
}

module.exports = { STAGING_SUPABASE_PROJECT_REF, resolveStagingDbConfig };
