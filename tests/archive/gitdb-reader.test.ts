import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GitDbEngine, LocalPlaintextStore } from "@3xhaust/gitdb";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGitDbArchiveReader } from "@/archive/gitdb-reader";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe("GitDB archive reader", () => {
  it("loads legacy public plaintext rows", async () => {
    const root = await mkdtemp(join(tmpdir(), "qna-archive-reader-"));
    roots.push(root);
    const store = new LocalPlaintextStore({ root });
    const database = await GitDbEngine.open({ store, durability: "sync" });
    await database.execute(
      "CREATE TABLE session_archives (session_id STRING, teacher_id STRING, title STRING, phase STRING, sequence_number INT, ended_at STRING)",
    );
    await database.execute(
      "CREATE TABLE session_questions (question_id STRING, session_id STRING, participant_id STRING, author_name STRING, question_text STRING, created_sequence INT)",
    );
    await database.execute(
      "CREATE TABLE question_likes (like_id STRING, session_id STRING, question_id STRING, participant_id STRING)",
    );
    await database.execute(
      "CREATE TABLE session_processed_commands (command_id STRING, session_id STRING)",
    );
    await database.execute(
      "INSERT INTO session_archives VALUES ('session-1', 'teacher-42', '프로그래밍', 'ended', 2, '2026-08-28T01:00:00.000Z')",
    );
    await database.execute(
      "INSERT INTO session_questions VALUES ('question-1', 'session-1', 'student-1', '김학생', '클로저가 무엇인가요?', 1)",
    );
    await database.execute(
      "INSERT INTO question_likes VALUES ('like-1', 'session-1', 'question-1', 'student-2')",
    );
    const legacyLocation = {
      owner: "3x-haust",
      repo: "qna",
      branch: "main",
      prefix: "gitdb/v1",
      token: "token",
      settings: { visibility: "public", encryption: "plain" } as const,
    };
    const reader = createGitDbArchiveReader(
      {
        owner: "3x-haust",
        repo: "qna",
        privateRepo: "qna-private",
        branch: "main",
        token: "token",
      },
      {
        locations: [legacyLocation],
        createStore: () => store,
        exists: async () => true,
      },
    );

    const principal = {
      id: "teacher-42",
      nickname: "김미림 선생님",
      email: "teacher@e-mirim.hs.kr",
      role: "TEACHER" as const,
    };

    await expect(reader.list(principal)).resolves.toEqual([
      expect.objectContaining({
        sessionId: "session-1",
        teacherNickname: "김미림 선생님",
        questionCount: 1,
      }),
    ]);
    await expect(
      reader.detail(principal, "session-1", legacyLocation.settings),
    ).resolves.toMatchObject({
      session: {
        title: "프로그래밍",
        questions: [
          {
            authorName: "김학생",
            likedBy: ["student-2"],
          },
        ],
      },
    });
  });

  it("skips absent storage locations without opening GitDB", async () => {
    const createStore = vi.fn();
    const reader = createGitDbArchiveReader(
      {
        owner: "3x-haust",
        repo: "qna",
        privateRepo: "qna-private",
        branch: "main",
        token: "token",
      },
      {
        locations: [
          {
            owner: "3x-haust",
            repo: "qna-private",
            branch: "main",
            prefix: "gitdb/archive-encrypted/v2",
            token: "token",
            settings: { visibility: "private", encryption: "encrypted" },
          },
        ],
        createStore,
        exists: async () => false,
      },
    );

    await expect(
      reader.list({
        id: "teacher-42",
        nickname: "김미림 선생님",
        email: "teacher@e-mirim.hs.kr",
        role: "TEACHER",
      }),
    ).resolves.toEqual([]);
    expect(createStore).not.toHaveBeenCalled();
  });
});
