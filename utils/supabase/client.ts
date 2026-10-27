import { createBrowserClient } from "@supabase/ssr";
import { assertRecordingEnvironment } from "@/lib/recording/config";

export function createClient() {
  assertRecordingEnvironment();
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey
  );
}
