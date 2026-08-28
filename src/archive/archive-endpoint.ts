import type { ArchiveWriter } from "@/archive/archive";
import { archiveEndedSession } from "@/archive/archive";
import {
  archiveRecordSchema,
  archiveSettingsSchema,
} from "@/archive/archive-schema";
import type { ArchiveReader } from "@/archive/gitdb-reader";
import type { MirimPrincipal } from "@/auth/mirim-principal";
import { z } from "zod";

type ArchiveScheduler = (task: () => Promise<void>) => void;

export function handleArchiveRequest(
  input: unknown,
  writer: ArchiveWriter,
  schedule: ArchiveScheduler,
  principal: MirimPrincipal,
): Response {
  try {
    const record = archiveRecordSchema.parse(input);
    if (
      principal.role !== "TEACHER" ||
      record.teacher.id !== principal.id ||
      record.session.teacherId !== principal.id
    ) {
      return Response.json(
        { message: "다른 선생님의 세션은 보관할 수 없습니다" },
        { status: 403 },
      );
    }
    if (record.session.phase !== "ended" || !record.session.endedAt) {
      return Response.json(
        { message: "세션 기록을 보관하지 못했습니다" },
        { status: 400 },
      );
    }
    schedule(() => archiveEndedSession(record, writer));
    return Response.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return Response.json(
      { message: "세션 기록을 보관하지 못했습니다" },
      { status: error instanceof z.ZodError ? 422 : 400 },
    );
  }
}

export async function handleArchiveReadRequest(
  url: URL,
  reader: ArchiveReader,
  principal: MirimPrincipal,
): Promise<Response> {
  if (principal.role !== "TEACHER") {
    return Response.json(
      { message: "선생님만 아카이브를 볼 수 있습니다" },
      { status: 403 },
    );
  }
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ archives: await reader.list(principal) });
  }
  const parsed = archiveSettingsSchema.safeParse({
    visibility: url.searchParams.get("visibility"),
    encryption: url.searchParams.get("encryption"),
  });
  if (!parsed.success) {
    return Response.json(
      { message: "아카이브 저장 위치가 올바르지 않습니다" },
      { status: 422 },
    );
  }
  const archive = await reader.detail(principal, sessionId, parsed.data);
  return archive
    ? Response.json({ archive })
    : Response.json(
        { message: "아카이브를 찾지 못했습니다" },
        { status: 404 },
      );
}
