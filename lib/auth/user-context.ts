import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import type { Tables } from "@/lib/database.types";
import type { Client, UserProfile } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

type ProfileQueryRow = Tables<"profiles">;

export type AuthenticatedUserContext = {
  user: User;
  profile: UserProfile;
};

export class AuthorizationError extends Error {
  constructor(message = "You do not have access to this organization.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

function normalizeProfile(profile: ProfileQueryRow): UserProfile {
  const normalized = { ...profile } as Partial<ProfileQueryRow>;
  delete normalized.access_code;
  delete normalized.organization;

  return normalized as UserProfile;
}

export const getAuthenticatedUserContext = cache(
  async (): Promise<AuthenticatedUserContext> => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect("/auth/login");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to load the authenticated user profile.", {
        cause: error,
      });
    }

    if (!data) {
      throw new Error("Authenticated user profile not found.");
    }

    return {
      user,
      profile: normalizeProfile(data as ProfileQueryRow),
    };
  },
);

export async function listAccessibleClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("code");

  if (error) {
    throw new Error("Failed to resolve accessible organizations.", {
      cause: error,
    });
  }

  return (clients ?? []) as Client[];
}

export async function requireAccessibleClientByCode(
  code: string,
): Promise<Client> {
  await getAuthenticatedUserContext();
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to resolve the requested organization.", {
      cause: error,
    });
  }

  const typedClient = client as Client | null;
  if (!typedClient) {
    throw new AuthorizationError();
  }

  return typedClient;
}

export async function requireAccessibleClientById(
  clientId?: string,
): Promise<Client> {
  await getAuthenticatedUserContext();
  const supabase = await createClient();

  if (clientId) {
    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to resolve the requested organization.", {
        cause: error,
      });
    }

    const typedClient = client as Client | null;
    if (!typedClient) {
      throw new AuthorizationError();
    }

    return typedClient;
  }

  const accessibleClients = await listAccessibleClients();
  if (accessibleClients.length === 0) {
    throw new AuthorizationError(
      "Your profile is pending organization assignment.",
    );
  }

  return accessibleClients[0];
}
