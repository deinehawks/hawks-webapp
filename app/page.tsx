import { redirect } from "next/navigation";

import { resolveAuthenticatedHomePath } from "@/lib/auth/post-auth-redirect";

export default async function Page() {
  redirect(await resolveAuthenticatedHomePath());
}
