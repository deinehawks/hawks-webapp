import { createBrowserClient } from "@supabase/ssr";
import { assertRecordingEnvironment } from "@/lib/recording/config";

export function createClient() {
  assertRecordingEnvironment();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
