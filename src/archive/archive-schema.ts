import { z } from "zod";

import { sessionStateSchema } from "@/signaling/relay-schema";

export const archiveSettingsSchema = z.object({
  visibility: z.enum(["public", "private"]),
  encryption: z.enum(["plain", "encrypted"]),
});

export const archiveIdentitySchema = z.object({
  id: z.string().min(1),
  nickname: z.string().min(1).max(80),
  email: z.string().email(),
});

const archivedQuestionSchema = z.object({
  id: z.string().min(1),
  participantId: z.string().min(1),
  authorName: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(160),
  createdSeq: z.number().int().positive(),
  likedBy: z.array(z.string().min(1)),
});

const archivedSessionSchema = sessionStateSchema.extend({
  title: z.string().trim().min(1).max(200),
  phase: z.literal("ended"),
  endedAt: z.string().datetime(),
  questions: z.array(archivedQuestionSchema),
});

export const archiveRecordSchema = z
  .object({
    session: archivedSessionSchema,
    teacher: archiveIdentitySchema,
    settings: archiveSettingsSchema,
    questionAuthors: z.record(z.string(), archiveIdentitySchema),
  })
  .superRefine((record, context) => {
    if (record.teacher.id !== record.session.teacherId) {
      context.addIssue({
        code: "custom",
        path: ["teacher", "id"],
        message: "선생님 정보가 세션 소유자와 일치하지 않습니다",
      });
    }
    const questionIds = new Set(
      record.session.questions.map((question) => question.id),
    );
    for (const questionId of Object.keys(record.questionAuthors)) {
      if (!questionIds.has(questionId)) {
        context.addIssue({
          code: "custom",
          path: ["questionAuthors", questionId],
          message: "질문 작성자 정보에 해당하는 질문이 없습니다",
        });
      }
    }
  });

export const archiveSummarySchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  endedAt: z.string(),
  questionCount: z.number(),
  teacherNickname: z.string(),
  location: archiveSettingsSchema,
});
