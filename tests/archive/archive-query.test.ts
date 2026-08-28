import { describe, expect, it, vi } from "vitest";

import { handleArchiveReadRequest } from "@/archive/archive-endpoint";

describe("archive browsing boundary", () => {
  const principal = {
    id: "teacher-42",
    nickname: "김미림 선생님",
    email: "teacher@e-mirim.hs.kr",
    role: "TEACHER" as const,
  };

  it("lists only the authenticated teacher archives", async () => {
    const reader = {
      list: vi.fn().mockResolvedValue([
        {
          sessionId: "session-1",
          title: "프로그래밍",
          endedAt: "2026-08-28T01:00:00.000Z",
          questionCount: 3,
          teacherNickname: "김미림 선생님",
          location: { visibility: "private", encryption: "encrypted" },
        },
      ]),
      detail: vi.fn(),
    };

    const response = await handleArchiveReadRequest(
      new URL("https://qna.test/api/archive"),
      reader,
      principal,
    );

    expect(response.status).toBe(200);
    expect(reader.list).toHaveBeenCalledWith(principal);
    expect(await response.json()).toEqual({
      archives: [
        expect.objectContaining({
          sessionId: "session-1",
          title: "프로그래밍",
          questionCount: 3,
        }),
      ],
    });
  });

  it("loads one archive detail from its storage location", async () => {
    const detail = vi.fn().mockResolvedValue({
      session: { id: "session-1", title: "프로그래밍", questions: [] },
      teacher: {
        id: "teacher-42",
        nickname: "김미림 선생님",
        email: "teacher@e-mirim.hs.kr",
      },
      questionAuthors: {},
      settings: { visibility: "public", encryption: "plain" },
    });
    const reader = { list: vi.fn(), detail };
    const response = await handleArchiveReadRequest(
      new URL(
        "https://qna.test/api/archive?sessionId=session-1&visibility=public&encryption=plain",
      ),
      reader,
      principal,
    );

    expect(response.status).toBe(200);
    expect(detail).toHaveBeenCalledWith(
      principal,
      "session-1",
      {
        visibility: "public",
        encryption: "plain",
      },
    );
    expect(await response.json()).toEqual({ archive: expect.any(Object) });
  });
});
