import "server-only";

import { GitDbEngine } from "@3xhaust/gitdb";

import type { ArchiveWriter } from "@/archive/archive";
import { GitHubPlaintextStore } from "@/archive/github-plaintext-store";
import { ensureGitHubArchiveRepository } from "@/archive/github-repository";

type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
  prefix: string;
  token: string;
};

type SqlValue = string | number;

function sqlValue(value: SqlValue): string {
  return typeof value === "number"
    ? String(value)
    : `'${value.replaceAll("'", "''")}'`;
}

function insertSql(
  table: string,
  row: Readonly<Record<string, SqlValue>>,
): string {
  const entries = Object.entries(row);
  return `INSERT INTO ${table} (${entries.map(([column]) => column).join(", ")}) VALUES (${entries.map(([, value]) => sqlValue(value)).join(", ")})`;
}

export function createGitDbArchiveWriter(config: GitHubConfig): ArchiveWriter {
  return async ({ session }) => {
    const repository = await ensureGitHubArchiveRepository(config);
    const store = new GitHubPlaintextStore({
      owner: repository.owner,
      repo: repository.repo,
      branch: config.branch,
      prefix: config.prefix,
      token: config.token,
    });
    const database = await GitDbEngine.open({ store, durability: "sync" });
    await database.transaction(async (transaction) => {
      await transaction.execute(
        "CREATE TABLE IF NOT EXISTS session_archives (session_id STRING, teacher_id STRING, title STRING, phase STRING, sequence_number INT, ended_at STRING)",
      );
      await transaction.execute(
        "CREATE TABLE IF NOT EXISTS session_questions (question_id STRING, session_id STRING, participant_id STRING, author_name STRING, question_text STRING, created_sequence INT)",
      );
      await transaction.execute(
        "CREATE TABLE IF NOT EXISTS question_likes (like_id STRING, session_id STRING, question_id STRING, participant_id STRING)",
      );
      await transaction.execute(
        "CREATE TABLE IF NOT EXISTS session_processed_commands (command_id STRING, session_id STRING)",
      );
      await transaction.execute(
        insertSql("session_archives", {
          ended_at: session.endedAt ?? "",
          phase: session.phase,
          sequence_number: session.seq,
          session_id: session.id,
          teacher_id: session.teacherId,
          title: session.title,
        }),
      );
      for (const question of session.questions) {
        await transaction.execute(
          insertSql("session_questions", {
            author_name: question.authorName,
            created_sequence: question.createdSeq,
            participant_id: question.participantId,
            question_id: question.id,
            question_text: question.text,
            session_id: session.id,
          }),
        );
        for (const participantId of question.likedBy) {
          await transaction.execute(
            insertSql("question_likes", {
              like_id: `${session.id}:${question.id}:${participantId}`,
              participant_id: participantId,
              question_id: question.id,
              session_id: session.id,
            }),
          );
        }
      }
      for (const commandId of session.processedCommandIds) {
        await transaction.execute(
          insertSql("session_processed_commands", {
            command_id: commandId,
            session_id: session.id,
          }),
        );
      }
    });
    const snapshotError = database.getLastVisibleSnapshotError();
    if (snapshotError instanceof Error) throw snapshotError;
    if (snapshotError !== undefined) {
      throw new Error("GitDB visible snapshot을 저장하지 못했습니다");
    }
  };
}
