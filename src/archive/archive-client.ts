import type { SessionState } from "@/domain/session";

export function queueArchiveSession(session: SessionState): void {
  const payload = JSON.stringify(session);
  if (
    navigator.sendBeacon(
      "/api/archive",
      new Blob([payload], { type: "application/json" }),
    )
  ) {
    return;
  }
  void fetch("/api/archive", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      console.error("세션 기록 요청을 보내지 못했습니다", error);
      return;
    }
    throw error;
  });
}
