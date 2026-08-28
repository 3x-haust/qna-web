import { describe, expect, it, vi } from "vitest";

import { handleArchiveRequest } from "@/archive/archive-endpoint";
import { createSession, endSession } from "@/domain/session";

describe("server-side archive boundary", () => {
  const teacher = {
    id: "teacher-1",
    nickname: "김미림 선생님",
    email: "teacher@e-mirim.hs.kr",
  };
  const settings = {
    visibility: "private" as const,
    encryption: "encrypted" as const,
  };
  const principal = { ...teacher, role: "TEACHER" as const };

  it("rejects active sessions before GitHub access", async () => {
    const writer = vi.fn();
    const schedule = vi.fn();
    const response = await handleArchiveRequest(
      {
        session: createSession("session-1", "teacher-1", "분수의 덧셈"),
        teacher,
        settings,
        questionAuthors: {},
      },
      writer,
      schedule,
      principal,
    );

    expect(response.status).toBe(422);
    expect(writer).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("accepts immediately and writes the ended session in background", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const scheduled: Array<() => Promise<void>> = [];
    const response = await handleArchiveRequest(
      {
        session: endSession(createSession("session-1", "teacher-1", "분수의 덧셈")),
        teacher,
        settings,
        questionAuthors: {},
      },
      writer,
      (task) => scheduled.push(task),
      principal,
    );

    expect(response.status).toBe(202);
    expect(writer).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    await scheduled[0]?.();
    expect(writer).toHaveBeenCalledWith({
      session: expect.objectContaining({ teacherId: "teacher-1" }),
      teacher,
      settings,
      questionAuthors: {},
    });
  });

  it("rejects forged teacher ownership", () => {
    const writer = vi.fn();
    const schedule = vi.fn();
    const response = handleArchiveRequest(
      {
        session: endSession(
          createSession("session-1", "forged-teacher", "분수의 덧셈"),
        ),
        teacher: { ...teacher, id: "forged-teacher" },
        settings,
        questionAuthors: {},
      },
      writer,
      schedule,
      principal,
    );

    expect(response.status).toBe(403);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("rejects malformed ended timestamps and oversized question text", () => {
    const writer = vi.fn();
    const schedule = vi.fn();
    const response = handleArchiveRequest(
      {
        session: {
          ...endSession(
            createSession("session-1", "teacher-1", "분수의 덧셈"),
          ),
          endedAt: "not-a-date",
          questions: [
            {
              id: "question-1",
              participantId: "student-1",
              authorName: "김학생",
              text: "가".repeat(161),
              createdSeq: 1,
              likedBy: [],
            },
          ],
        },
        teacher,
        settings,
        questionAuthors: {},
      },
      writer,
      schedule,
      principal,
    );

    expect(response.status).toBe(422);
    expect(schedule).not.toHaveBeenCalled();
  });
});
