import {
  GitDbEngine,
  type GitDbStore,
  type SqlRow,
} from "@3xhaust/gitdb";
import { z } from "zod";

import type { ArchiveLocation } from "@/archive/gitdb-config";

export const sessionRowSchema = z.object({
  session_id: z.string(),
  teacher_id: z.string(),
  teacher_nickname: z.string().optional(),
  teacher_email: z.string().optional(),
  title: z.string(),
  phase: z.string(),
  sequence_number: z.number(),
  ended_at: z.string(),
  question_count: z.number().optional(),
});

export const questionRowSchema = z.object({
  question_id: z.string(),
  session_id: z.string(),
  participant_id: z.string(),
  author_user_id: z.string().optional(),
  author_nickname: z.string().optional(),
  author_name: z.string().optional(),
  author_email: z.string().optional(),
  question_text: z.string(),
  created_sequence: z.number(),
});

export const likeRowSchema = z.object({
  session_id: z.string(),
  question_id: z.string(),
  participant_id: z.string(),
});

export const commandRowSchema = z.object({
  session_id: z.string(),
  command_id: z.string(),
});

export type StoreRows = {
  readonly sessions: readonly z.infer<typeof sessionRowSchema>[];
  readonly questions: readonly z.infer<typeof questionRowSchema>[];
  readonly likes: readonly z.infer<typeof likeRowSchema>[];
  readonly commands: readonly z.infer<typeof commandRowSchema>[];
};

export async function readArchiveStore(
  location: ArchiveLocation,
  storeFactory: (location: ArchiveLocation) => GitDbStore,
): Promise<StoreRows> {
  const database = await GitDbEngine.open({
    store: storeFactory(location),
    durability: "sync",
  });
  return {
    sessions: sessionRowSchema.array().parse(
      await queryRows(database, "session_archives"),
    ),
    questions: questionRowSchema.array().parse(
      await queryRows(database, "session_questions"),
    ),
    likes: likeRowSchema.array().parse(
      await queryRows(database, "question_likes"),
    ),
    commands: commandRowSchema.array().parse(
      await queryRows(database, "session_processed_commands"),
    ),
  };
}

async function queryRows(
  database: GitDbEngine,
  table: string,
): Promise<readonly SqlRow[]> {
  try {
    return (await database.execute(`SELECT * FROM ${table}`)).rows;
  } catch (error) {
    if (
      error instanceof Error &&
      /table.*(not exist|does not exist|undefined)/i.test(error.message)
    ) {
      return [];
    }
    throw error;
  }
}
