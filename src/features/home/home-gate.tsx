"use client";

import { useAuth } from "@/auth/auth-provider";
import { AuthenticatedHome } from "@/features/home/authenticated-home";
import { GuestHome } from "@/features/home/guest-home";
import { AppShell } from "@/ui/primitives";

export function HomeGate() {
  const { isLoading, isLoggedIn } = useAuth();

  if (isLoading) {
    return <AppShell aria-busy="true" aria-label="로그인 상태 확인 중" />;
  }

  return isLoggedIn ? <AuthenticatedHome /> : <GuestHome />;
}
