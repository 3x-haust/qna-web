import { z } from "zod";

import {
  archiveRecordSchema,
  archiveSummarySchema,
} from "@/archive/archive-schema";
import { mirimAuthorizationHeaders } from "@/auth/client-token";
import type {
  ArchiveDetail,
  ArchiveRecord,
  ArchiveSettings,
  ArchiveSummary,
} from "@/archive/archive-rows";

export function queueArchiveSession(record: ArchiveRecord): void {
  const payload = JSON.stringify(record);
  const headers = mirimAuthorizationHeaders();
  headers.set("content-type", "application/json");
  void fetch("/api/archive", {
    method: "POST",
    headers,
    body: payload,
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      console.error("세션 기록 요청을 보내지 못했습니다", error);
      return;
    }
    throw error;
  });
}

export async function listArchives(): Promise<readonly ArchiveSummary[]> {
  const response = await fetch(
    "/api/archive",
    { cache: "no-store", headers: mirimAuthorizationHeaders() },
  );
  await ensureOk(response);
  return z
    .object({ archives: archiveSummarySchema.array() })
    .parse(await response.json()).archives;
}

export async function loadArchive(
  sessionId: string,
  settings: ArchiveSettings,
): Promise<ArchiveDetail> {
  const search = new URLSearchParams({
    sessionId,
    visibility: settings.visibility,
    encryption: settings.encryption,
  });
  const response = await fetch(`/api/archive?${search}`, {
    cache: "no-store",
    headers: mirimAuthorizationHeaders(),
  });
  await ensureOk(response);
  return z
    .object({ archive: archiveRecordSchema })
    .parse(await response.json()).archive;
}

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  const fallback = "아카이브를 불러오지 못했습니다";
  const parsed = z
    .object({ message: z.string() })
    .safeParse(await response.json());
  throw new Error(parsed.success ? parsed.data.message : fallback);
}
