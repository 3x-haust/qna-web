import { describe, expect, it } from "vitest";

import { toArchiveRows, type ArchiveRecord } from "@/archive/archive-rows";
import { createSession, endSession, reduceHostCommand } from "@/domain/session";

describe("archive identity rows", () => {
  it("persists teacher profile, named student profile, and like count", () => {
    const withQuestion = reduceHostCommand(
      createSession("session-1", "teacher-42", "프로그래밍"),
      {
        commandId: "question-command",
        kind: "question.submit",
        participantId: "participant-1",
        text: "클로저가 무엇인가요?",
        anonymous: false,
        authorName: "김학생",
      },
    );
    const likedOnce = reduceHostCommand(withQuestion, {
      commandId: "like-1",
      kind: "question.vote.toggle",
      participantId: "participant-2",
      questionId: "question-1",
    });
    const likedTwice = reduceHostCommand(likedOnce, {
      commandId: "like-2",
      kind: "question.vote.toggle",
      participantId: "participant-3",
      questionId: "question-1",
    });
    const record: ArchiveRecord = {
      session: endSession(likedTwice, "2026-08-28T01:00:00.000Z"),
      settings: { visibility: "private", encryption: "encrypted" },
      teacher: {
        id: "teacher-42",
        nickname: "김미림 선생님",
        email: "teacher@e-mirim.hs.kr",
      },
      questionAuthors: {
        "question-1": {
          id: "student-7",
          nickname: "김학생",
          email: "student@e-mirim.hs.kr",
        },
      },
    };

    const rows = toArchiveRows(record);

    expect(rows.session).toMatchObject({
      teacher_id: "teacher-42",
      teacher_nickname: "김미림 선생님",
      teacher_email: "teacher@e-mirim.hs.kr",
      visibility: "private",
      encryption: "encrypted",
    });
    expect(rows.questions[0]).toMatchObject({
      author_user_id: "student-7",
      author_nickname: "김학생",
      author_email: "student@e-mirim.hs.kr",
      like_count: 2,
    });
  });
});
