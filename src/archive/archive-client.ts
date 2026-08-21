import type { SessionState } from "@/domain/session";

export async function archiveSession(session: SessionState): Promise<void> {
  const response = await fetch("/api/archive", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!response.ok) {
    throw new Error("세션 기록을 보관하지 못했습니다");
  }
}
