import "server-only";

import { GitDbEngine } from "@3xhaust/gitdb";

import type { ArchiveWriter } from "@/archive/archive";
import { toArchiveRows } from "@/archive/archive-rows";
import { enqueueArchiveOperation } from "@/archive/archive-write-queue";
import {
  createArchiveStore,
  resolveArchiveLocation,
  type GitDbArchiveConfig,
} from "@/archive/gitdb-config";
import { ensureGitHubArchiveRepository } from "@/archive/github-repository";

type SqlValue = string | number;

function sqlValue(value: SqlValue): string {
  return typeof value === "number"
    ? String(value)
    : `'${value.replaceAll("'", "''")}'`;
}

function insertSql(
  table: string,
  row: object,
): string {
  const entries = Object.entries(row) as [string, SqlValue][];
  return `INSERT INTO ${table} (${entries.map(([column]) => column).join(", ")}) VALUES (${entries.map(([, value]) => sqlValue(value)).join(", ")})`;
}

export function createGitDbArchiveWriter(config: GitDbArchiveConfig): ArchiveWriter {
  return (record) =>
    enqueueArchiveOperation(async () => {
      const location = resolveArchiveLocation(config, record.settings);
      const repository = await ensureGitHubArchiveRepository({
        owner: location.owner,
        repo: location.repo,
        token: location.token,
        visibility: record.settings.visibility,
      });
      const store = createArchiveStore({
        ...location,
        owner: repository.owner,
        repo: repository.repo,
      });
      const database = await GitDbEngine.open({ store, durability: "sync" });
      const rows = toArchiveRows(record);
      await database.transaction(async (transaction) => {
        await transaction.execute(
          "CREATE TABLE IF NOT EXISTS session_archives (session_id STRING, teacher_id STRING, teacher_nickname STRING, teacher_email STRING, title STRING, phase STRING, sequence_number INT, ended_at STRING, question_count INT, visibility STRING, encryption STRING)",
        );
        await transaction.execute(
          "CREATE TABLE IF NOT EXISTS session_questions (question_id STRING, session_id STRING, participant_id STRING, author_user_id STRING, author_nickname STRING, author_email STRING, question_text STRING, created_sequence INT, like_count INT)",
        );
        await transaction.execute(
          "CREATE TABLE IF NOT EXISTS question_likes (like_id STRING, session_id STRING, question_id STRING, participant_id STRING)",
        );
        await transaction.execute(
          "CREATE TABLE IF NOT EXISTS session_processed_commands (command_id STRING, session_id STRING)",
        );
        await transaction.execute(
          insertSql("session_archives", rows.session),
        );
        for (const question of rows.questions) {
          await transaction.execute(
            insertSql("session_questions", question),
          );
        }
        for (const like of rows.likes) {
          await transaction.execute(insertSql("question_likes", like));
        }
        for (const command of rows.commands) {
          await transaction.execute(
            insertSql("session_processed_commands", command),
          );
        }
      });
      const snapshotError = database.getLastVisibleSnapshotError();
      if (snapshotError instanceof Error) throw snapshotError;
      if (snapshotError !== undefined) {
        throw new Error("GitDB visible snapshot을 저장하지 못했습니다");
      }
    });
}
