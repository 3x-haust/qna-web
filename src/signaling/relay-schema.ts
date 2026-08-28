import { z } from "zod";

export const relayClientCommandSchema = z.discriminatedUnion("kind", [
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

export const relayCommandSchema = z.discriminatedUnion("kind", [
  relayClientCommandSchema.options[0]
    .extend({
      authorId: z.string().optional(),
      authorEmail: z.string().email().optional(),
    })
    .superRefine((command, context) => {
      const hasIdentity = Boolean(command.authorId && command.authorEmail);
      if (command.anonymous && hasIdentity) {
        context.addIssue({
          code: "custom",
          message: "익명 질문에는 실명 정보를 포함할 수 없습니다",
        });
      }
      if (!command.anonymous && !hasIdentity) {
        context.addIssue({
          code: "custom",
          message: "실명 질문에는 인증된 사용자 정보가 필요합니다",
        });
      }
    }),
  relayClientCommandSchema.options[1],
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
export type RelayClientCommand = z.infer<typeof relayClientCommandSchema>;
