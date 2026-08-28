import { z } from "zod";

export const relayCommandSchema = z.discriminatedUnion("kind", [
  z
    .object({
      commandId: z.string().min(1),
      kind: z.literal("question.submit"),
      text: z.string(),
      anonymous: z.boolean(),
      authorName: z.string(),
    })
    .strict(),
  z
    .object({
      commandId: z.string().min(1),
      kind: z.literal("question.vote.toggle"),
      questionId: z.string().min(1),
    })
    .strict(),
]);

export const sessionStateSchema = z
  .object({
    id: z.string().min(1),
    teacherId: z.string().min(1),
    title: z.string(),
    phase: z.enum(["live", "ended"]),
    seq: z.number().int().nonnegative(),
    endedAt: z.string().optional(),
    questions: z.array(
      z
        .object({
          id: z.string().min(1),
          participantId: z.string().min(1),
          authorName: z.string(),
          text: z.string(),
          createdSeq: z.number().int().positive(),
          likedBy: z.array(z.string()),
        })
        .strict(),
    ),
    processedCommandIds: z.array(z.string()),
  })
  .strict();

export type RelayCommand = z.infer<typeof relayCommandSchema>;
