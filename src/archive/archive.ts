import type { ArchiveRecord } from "@/archive/archive-rows";

export type { ArchiveRecord } from "@/archive/archive-rows";

export type ArchiveWriter = (record: ArchiveRecord) => Promise<void>;

export async function archiveEndedSession(
  record: ArchiveRecord,
  writer: ArchiveWriter,
): Promise<void> {
  if (record.session.phase !== "ended" || !record.session.endedAt) {
    throw new Error("종료된 질의만 GitHub에 보관할 수 있습니다");
  }
  await writer(record);
}
