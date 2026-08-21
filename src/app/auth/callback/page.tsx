import { OAuthCallback } from "@/features/auth/oauth-callback";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <OAuthCallback error={error} />;
}
