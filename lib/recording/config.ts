export function assertRecordingEnvironment() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://llealjcaqvltrtdwwzrh.supabase.co") {
    throw new Error("asimov-hawks V2 recording requires the approved staging Supabase project.");
  }
}
