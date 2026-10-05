// Copies only the staging URL and anonymous key, never database/admin credentials.
const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const source = path.resolve(process.argv[2] || "");
if (!process.argv[2] || source === process.cwd()) throw new Error("Pass the V3 repository path.");
const env = parseEnv(fs.readFileSync(path.join(source, ".env.local"), "utf8"));
if (env.NEXT_PUBLIC_SUPABASE_URL !== "https://llealjcaqvltrtdwwzrh.supabase.co") throw new Error("Source is not staging.");
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!key) throw new Error("Missing public anonymous key.");
const payload = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString());
if (payload.role !== "anon") throw new Error("Expected an anonymous key, never a service-role key.");
// Use completed original-wave evidence: the editable private allowlist is stale.
const originalWaves = [["organization", 5], ["private", 6]].flatMap(([scope, count]) =>
  Array.from({ length: count }, (_, index) => "workshop-" + scope + "-wave-" + String(index + 1).padStart(3, "0")));
const originalIds = originalWaves.flatMap((wave) => {
  const evidence = JSON.parse(fs.readFileSync(path.join(source, ".tmp/workshop-assets/verification", wave + ".manifest-entries.json"), "utf8"));
  if (evidence.waveId !== wave || !evidence.completedAt) throw new Error("Incomplete original-wave evidence.");
  return [...new Set(evidence.entries.map((entry) => entry.surveyId))];
});
if (originalIds.length !== 30 || new Set(originalIds).size !== 30) throw new Error("Expected 30 original verified surveys.");
const additional = JSON.parse(fs.readFileSync(path.join(source, ".tmp/workshop-assets/additional-20260925/allowlist.json"), "utf8"));
const surveyIds = [...originalIds, ...additional.approvedSurveys.map((s) => s.surveyId)];
if (surveyIds.length !== 58 || new Set(surveyIds).size !== 58 || surveyIds.some((id) => !/^AH-\d+$/.test(id))) throw new Error("Expected exactly 58 unique approved surveys.");
fs.mkdirSync(".recording", { recursive: true });
for (const file of [".env.local", ".recording/selection.json", ".recording/source.json"]) {
  if (fs.existsSync(file)) throw new Error("Existing recording configuration retained; review before replacing: " + file);
}
fs.writeFileSync(".env.local", "NEXT_PUBLIC_SUPABASE_URL=" + env.NEXT_PUBLIC_SUPABASE_URL + "\nNEXT_PUBLIC_SUPABASE_ANON_KEY=" + key + "\n", { flag: "wx" });
fs.writeFileSync(".recording/selection.json", JSON.stringify({ surveyIds }, null, 2) + "\n", { flag: "wx" });
fs.writeFileSync(".recording/source.json", JSON.stringify({ source }, null, 2) + "\n", { flag: "wx" });
console.log("Configured staging anonymous access and 58 selected surveys. No credentials printed; no database or storage writes.");
