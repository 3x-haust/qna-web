"use client";

import Link from "next/link";
import { useEffect } from "react";

import { AppShell } from "@/ui/primitives";

export function OAuthCallback({ error }: { error?: string }) {
  useEffect(() => {
    if (!window.opener) return;
    window.opener.postMessage(
      { type: "oauth_callback", url: window.location.href },
      window.location.origin,
    );
    window.close();
  }, []);

  return (
    <AppShell data-testid="app-shell">
      <section
        role={error ? "alert" : "status"}
        style={{ maxWidth: 520, margin: "0 auto", padding: "25vh 24px", textAlign: "center" }}
      >
        <h1>{error ? "로그인을 완료하지 못했습니다" : "로그인을 완료하고 있습니다"}</h1>
        <p>
          {error
            ? "로그인이 취소되었거나 권한을 확인할 수 없습니다. 다시 시도해 주세요."
            : "인증 창을 닫고 원래 화면으로 돌아갑니다."}
        </p>
        <Link href="/">홈으로 돌아가기</Link>
      </section>
    </AppShell>
  );
}
