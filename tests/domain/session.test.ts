import { describe, expect, it } from "vitest";

import { createSession, reduceHostCommand } from "@/domain/session";

describe("teacher-authoritative session reducer", () => {
  it("assigns canonical sequence and ignores duplicate commands", () => {
    const initial = createSession("session-1", "teacher-1", "분수의 덧셈");
    const command = {
      commandId: "command-1",
      kind: "question.submit" as const,
      participantId: "student-1",
      text: "1/2 + 1/3 = ?",
      anonymous: true,
      authorName: "김학생",
    };

    const accepted = reduceHostCommand(initial, command);
    const duplicate = reduceHostCommand(accepted, command);

    expect(accepted.seq).toBe(1);
    expect(accepted.questions).toHaveLength(1);
    expect(accepted.questions[0]?.text).toBe("1/2 + 1/3 = ?");
    expect(accepted.questions[0]?.authorName).toBe("익명");
    expect(accepted.questions[0]?.likedBy).toEqual([]);
    expect(duplicate).toEqual(accepted);
  });

  it("lets each student toggle one upvote on a question", () => {
    const initial = createSession("session-1", "teacher-1", "수업");
    const withQuestion = reduceHostCommand(initial, {
      commandId: "question-command",
      kind: "question.submit",
      participantId: "student-1",
      text: "리액트가 무엇인가요?",
      anonymous: false,
      authorName: "김학생",
    });
    const liked = reduceHostCommand(withQuestion, {
      commandId: "like-command",
      kind: "question.vote.toggle",
      participantId: "student-2",
      questionId: withQuestion.questions[0]?.id ?? "",
    });
    const unliked = reduceHostCommand(liked, {
      commandId: "unlike-command",
      kind: "question.vote.toggle",
      participantId: "student-2",
      questionId: withQuestion.questions[0]?.id ?? "",
    });

    expect(withQuestion.questions[0]?.authorName).toBe("김학생");
    expect(liked.questions[0]?.likedBy).toEqual(["student-2"]);
    expect(unliked.questions[0]?.likedBy).toEqual([]);
  });

  it("rejects student commands after the teacher ends the session", () => {
    const ended = { ...createSession("session-1", "teacher-1", "수업"), phase: "ended" as const };

    expect(() =>
      reduceHostCommand(ended, {
        commandId: "command-2",
        kind: "question.submit",
        participantId: "student-1",
        text: "끝났나요?",
        anonymous: true,
        authorName: "학생",
      }),
    ).toThrow("종료된 질의");
  });
});
