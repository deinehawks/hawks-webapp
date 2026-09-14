import { redirect } from "next/navigation";

import {
  AdminDatasetOnboardingPage,
  type DatasetOnboardingClientOption,
  type DatasetOnboardingFarmOption,
  type DatasetOnboardingOrganizationOption,
  type DatasetOnboardingPersonOption,
} from "@/components/admin/admin-dataset-onboarding-page";
import { getAuthenticatedUserContext } from "@/lib/auth/user-context";
import { createClient } from "@/utils/supabase/server";

export default async function DatasetOnboardingPage() {
  const { profile } = await getAuthenticatedUserContext();
  if (profile.role !== "platform_admin") redirect("/dashboard");

  const supabase = await createClient();
  const [clients, organizations, people, farms] = await Promise.all([
    supabase.from("clients").select("id, code, name, classification_kind").order("code").limit(500),
    supabase.from("organizations").select("id, name, code").eq("status", "active").order("name").limit(500),
    supabase.from("people").select("id, display_name, first_name, last_name, email").eq("status", "active").order("display_name").limit(500),
    supabase.from("farms").select("id, name, code").eq("status", "active").order("name").limit(500),
  ]);

  const loadError = clients.error ?? organizations.error ?? people.error ?? farms.error;
  if (loadError) {
    throw new Error("Failed to load dataset onboarding options.", { cause: loadError });
  }

  return (
    <AdminDatasetOnboardingPage
      clients={(clients.data ?? []) as DatasetOnboardingClientOption[]}
      organizations={(organizations.data ?? []) as DatasetOnboardingOrganizationOption[]}
      people={(people.data ?? []) as DatasetOnboardingPersonOption[]}
      farms={(farms.data ?? []) as DatasetOnboardingFarmOption[]}
    />
  );
}
