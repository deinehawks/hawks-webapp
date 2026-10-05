"use server";
import { requireRecordingAccount } from "@/lib/recording/context";

export async function getUserProfile(id: string) {
  const { user, profile } = await requireRecordingAccount();
  if (user.id !== id) throw new Error("Access denied.");
  return profile;
}
export async function getCurrentUserProfile() {
  return (await requireRecordingAccount()).profile;
}
