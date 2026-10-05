import { LoginForm } from "@/components/forms/login-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const initialError = error === "account-inactive"
    ? "This account is not active. Ask a platform administrator to approve it."
    : undefined;

  return <LoginForm initialError={initialError} />;
}
