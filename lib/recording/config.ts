export function assertRecordingEnvironment() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://llealjcaqvltrtdwwzrh.supabase.co") {
    throw new Error("asimov-hawks V2 recording requires the approved staging Supabase project.");
  }
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error("asimov-hawks V2 recording requires a Supabase publishable or anon key.");
  }
}
