import type { SessionState } from "@/domain/session";

export type ArchiveVisibility = "public" | "private";
export type ArchiveEncryption = "plain" | "encrypted";

export type ArchiveSettings = {
  readonly visibility: ArchiveVisibility;
  readonly encryption: ArchiveEncryption;
};

export type ArchiveIdentity = {
  readonly id: string;
  readonly nickname: string;
  readonly email: string;
};

export type ArchiveRecord = {
  readonly session: SessionState;
  readonly teacher: ArchiveIdentity;
  readonly settings: ArchiveSettings;
  readonly questionAuthors: Readonly<Record<string, ArchiveIdentity>>;
};

export type ArchiveSummary = {
  readonly sessionId: string;
  readonly title: string;
  readonly endedAt: string;
  readonly questionCount: number;
  readonly teacherNickname: string;
  readonly location: ArchiveSettings;
};

export type ArchiveDetail = ArchiveRecord;

type SessionArchiveRow = {
  readonly session_id: string;
  readonly teacher_id: string;
  readonly teacher_nickname: string;
  readonly teacher_email: string;
  readonly title: string;
  readonly phase: string;
  readonly sequence_number: number;
  readonly ended_at: string;
  readonly question_count: number;
  readonly visibility: ArchiveVisibility;
  readonly encryption: ArchiveEncryption;
};

type SessionQuestionRow = {
  readonly question_id: string;
  readonly session_id: string;
  readonly participant_id: string;
  readonly author_user_id: string;
  readonly author_nickname: string;
  readonly author_email: string;
  readonly question_text: string;
  readonly created_sequence: number;
  readonly like_count: number;
};

export type ArchiveRows = {
  readonly session: SessionArchiveRow;
  readonly questions: readonly SessionQuestionRow[];
  readonly likes: readonly {
    readonly like_id: string;
    readonly session_id: string;
    readonly question_id: string;
    readonly participant_id: string;
  }[];
  readonly commands: readonly {
    readonly command_id: string;
    readonly session_id: string;
  }[];
};

export function toArchiveRows(record: ArchiveRecord): ArchiveRows {
  return {
    session: {
      session_id: record.session.id,
      teacher_id: record.teacher.id,
      teacher_nickname: record.teacher.nickname,
      teacher_email: record.teacher.email,
      title: record.session.title,
      phase: record.session.phase,
      sequence_number: record.session.seq,
      ended_at: record.session.endedAt ?? "",
      question_count: record.session.questions.length,
      visibility: record.settings.visibility,
      encryption: record.settings.encryption,
    },
    questions: record.session.questions.map((question) => {
      const identity = record.questionAuthors[question.id];
      return {
        question_id: question.id,
        session_id: record.session.id,
        participant_id: question.participantId,
        author_user_id: identity?.id ?? "",
        author_nickname: identity?.nickname ?? question.authorName,
        author_email: identity?.email ?? "",
        question_text: question.text,
        created_sequence: question.createdSeq,
        like_count: question.likedBy.length,
      };
    }),
    likes: record.session.questions.flatMap((question) =>
      question.likedBy.map((participantId) => ({
        like_id: `${record.session.id}:${question.id}:${participantId}`,
        session_id: record.session.id,
        question_id: question.id,
        participant_id: participantId,
      })),
    ),
    commands: record.session.processedCommandIds.map((commandId) => ({
      command_id: commandId,
      session_id: record.session.id,
    })),
  };
}
