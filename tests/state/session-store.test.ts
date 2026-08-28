import { beforeEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/state/session-store";

const teacher = {
  id: "teacher-42",
  nickname: "김미림 선생님",
  email: "teacher@e-mirim.hs.kr",
};

beforeEach(() => {
  useSessionStore.getState().reset();
});

describe("session archive lifecycle", () => {
  it("marks only an explicit archive reopen for relay startup", () => {
    useSessionStore.getState().startHostFromArchive(
      {
        session: {
          id: "old-session",
          teacherId: teacher.id,
          title: "프로그래밍",
          phase: "ended",
          seq: 1,
          endedAt: "2026-08-28T01:00:00.000Z",
          processedCommandIds: [],
          questions: [],
        },
        teacher,
        settings: { visibility: "private", encryption: "encrypted" },
        questionAuthors: {},
      },
      teacher,
    );

    expect(useSessionStore.getState().reopenPending).toBe(true);
    useSessionStore.getState().consumeReopen();
    expect(useSessionStore.getState().reopenPending).toBe(false);
  });

  it("does not overwrite question identity for a duplicate command", () => {
    const store = useSessionStore.getState();
    store.startHost("프로그래밍", teacher);
    store.submitQuestion(
      "participant-1",
      "첫 질문",
      false,
      "김학생",
      "duplicate-command",
      {
        id: "student-1",
        nickname: "김학생",
        email: "student@e-mirim.hs.kr",
      },
    );
    useSessionStore
      .getState()
      .submitQuestion(
        "participant-1",
        "위조 질문",
        false,
        "위조학생",
        "duplicate-command",
        {
          id: "forged-student",
          nickname: "위조학생",
          email: "forged@e-mirim.hs.kr",
        },
      );

    expect(useSessionStore.getState().questionAuthors["question-1"]).toEqual({
      id: "student-1",
      nickname: "김학생",
      email: "student@e-mirim.hs.kr",
    });
  });
});
