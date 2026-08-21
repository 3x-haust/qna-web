import type { ArchiveWriter } from "@/archive/archive";
import { archiveEndedSession } from "@/archive/archive";
import { z } from "zod";

type ArchiveScheduler = (task: () => Promise<void>) => void;

const sessionSchema = z.object({
  id: z.string().min(1),
  teacherId: z.string().min(1),
  title: z.string().min(1).max(200),
  phase: z.enum(["live", "ended"]),
  seq: z.number().int().nonnegative(),
  endedAt: z.string().datetime().optional(),
  processedCommandIds: z.array(z.string()),
  questions: z.array(
    z.object({
      id: z.string(),
      participantId: z.string(),
      authorName: z.string().min(1).max(40),
      text: z.string().min(1).max(160),
      createdSeq: z.number().int().positive(),
      likedBy: z.array(z.string()),
    }),
  ),
});

export function handleArchiveRequest(
  input: unknown,
  writer: ArchiveWriter,
  schedule: ArchiveScheduler,
): Response {
  try {
    const session = sessionSchema.parse(input);
    if (session.phase !== "ended" || !session.endedAt) {
      return Response.json(
        { message: "세션 기록을 보관하지 못했습니다" },
        { status: 400 },
      );
    }
    schedule(() => archiveEndedSession(session, writer));
    return Response.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return Response.json(
      { message: "세션 기록을 보관하지 못했습니다" },
      { status: error instanceof z.ZodError ? 422 : 400 },
    );
  }
}
