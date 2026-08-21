import type { SessionState } from "@/domain/session";

export type ArchiveRecord = {
  sessionId: string;
  payload: string;
};

export type ArchiveWriter = (record: ArchiveRecord) => Promise<void>;

export async function archiveEndedSession(
  session: SessionState,
  writer: ArchiveWriter,
): Promise<void> {
  if (session.phase !== "ended" || !session.endedAt) {
    throw new Error("종료된 질의만 GitHub에 보관할 수 있습니다");
  }
  await writer({
    sessionId: session.id,
    payload: JSON.stringify(session),
  });
}
