import { redirect } from "next/navigation";
import { Clock3, ShieldX } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function signOut() {
  "use server";
  await logout();
}

export default async function PendingAccountPage() {
  const { profile } = await getAuthenticatedUserContext();
  if (!profile.account_status || profile.account_status === "active") {
    redirect(profile.role === "platform_admin" ? "/admin" : "/dashboard");
  }
  const rejected = profile.account_status === "rejected";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          {rejected ? <ShieldX className="size-10 text-destructive" /> : <Clock3 className="size-10 text-muted-foreground" />}
          <CardTitle>{rejected ? "Signup request not approved" : "Awaiting platform approval"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-center">
          <p className="text-sm text-muted-foreground">
            {rejected
              ? "Your account is signed in but cannot access the application. Contact the platform administrator if this decision should be reviewed."
              : "Your email is confirmed and your signup request is waiting for a platform administrator to assign your organization and role."}
          </p>
          <form action={signOut}><Button type="submit" variant="outline">Sign out</Button></form>
        </CardContent>
      </Card>
    </main>
  );
}
