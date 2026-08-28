import type { GitDbStore } from "@3xhaust/gitdb";

import type {
  ArchiveDetail,
  ArchiveIdentity,
  ArchiveSettings,
  ArchiveSummary,
} from "@/archive/archive-rows";
import type { MirimPrincipal } from "@/auth/mirim-principal";
import { enqueueArchiveOperation } from "@/archive/archive-write-queue";
import {
  archiveLocationExists,
  createArchiveStore,
  resolveArchiveLocation,
  type ArchiveLocation,
  type GitDbArchiveConfig,
} from "@/archive/gitdb-config";
import {
  readArchiveStore,
} from "@/archive/gitdb-read-rows";

export type ArchiveReader = {
  list: (principal: MirimPrincipal) => Promise<readonly ArchiveSummary[]>;
  detail: (
    principal: MirimPrincipal,
    sessionId: string,
    settings: ArchiveSettings,
  ) => Promise<ArchiveDetail | null>;
};

type ArchiveReaderDependencies = {
  readonly locations?: readonly ArchiveLocation[];
  readonly createStore?: (location: ArchiveLocation) => GitDbStore;
  readonly exists?: (location: ArchiveLocation) => Promise<boolean>;
};

export function createGitDbArchiveReader(
  config: GitDbArchiveConfig,
  dependencies: ArchiveReaderDependencies = {},
): ArchiveReader {
  const storeFactory = dependencies.createStore ?? createArchiveStore;
  const exists = dependencies.exists ?? archiveLocationExists;
  return {
    async list(principal) {
      return enqueueArchiveOperation(async () => {
        const stores = await Promise.all(
          (dependencies.locations ?? archiveLocations(config)).map(
            async (location) => ({
              location,
              rows: (await exists(location))
                ? await readArchiveStore(location, storeFactory)
                : null,
            }),
          ),
        );
        return stores
          .flatMap(({ location, rows }) => {
            if (!rows) return [];
            return rows.sessions
              .filter((session) => session.teacher_id === principal.id)
              .map((session) => ({
                sessionId: session.session_id,
                title: session.title,
                endedAt: session.ended_at,
                questionCount:
                  session.question_count ??
                  rows.questions.filter(
                    (question) => question.session_id === session.session_id,
                  ).length,
                teacherNickname:
                  session.teacher_nickname || principal.nickname,
                location: location.settings,
              }));
          })
          .sort((left, right) => right.endedAt.localeCompare(left.endedAt));
      });
    },
    async detail(principal, sessionId, settings) {
      return enqueueArchiveOperation(async () => {
        const location = resolveArchiveLocation(config, settings);
        const current = (await exists(location))
          ? await detailFromLocation(
              location,
              principal,
              sessionId,
              storeFactory,
            )
          : null;
        if (current) return current;
        if (
          settings.visibility === "public" &&
          settings.encryption === "plain"
        ) {
          const legacy = legacyLocation(config);
          return (await exists(legacy))
            ? detailFromLocation(
                legacy,
                principal,
                sessionId,
                storeFactory,
              )
            : null;
        }
        return null;
      });
    },
  };
}

function archiveLocations(config: GitDbArchiveConfig): readonly ArchiveLocation[] {
  const current = (
    [
      { visibility: "public", encryption: "plain" },
      { visibility: "public", encryption: "encrypted" },
      { visibility: "private", encryption: "plain" },
      { visibility: "private", encryption: "encrypted" },
    ] as const
  ).map((settings) => resolveArchiveLocation(config, settings));
  const legacy = legacyLocation(config);
  return current.some(
    (location) =>
      location.repo === legacy.repo && location.prefix === legacy.prefix,
  )
    ? current
    : [legacy, ...current];
}

function legacyLocation(config: GitDbArchiveConfig): ArchiveLocation {
  return {
    owner: config.owner,
    repo: config.repo,
    branch: config.branch,
    prefix: config.legacyPrefix ?? "gitdb/v1",
    token: config.token,
    settings: { visibility: "public", encryption: "plain" },
  };
}

async function detailFromLocation(
  location: ArchiveLocation,
  principal: MirimPrincipal,
  sessionId: string,
  storeFactory: (location: ArchiveLocation) => GitDbStore,
): Promise<ArchiveDetail | null> {
  const rows = await readArchiveStore(location, storeFactory);
  const session = rows.sessions.find(
    (candidate) =>
      candidate.session_id === sessionId &&
      candidate.teacher_id === principal.id,
  );
  if (!session) return null;
  const questions = rows.questions.filter(
    (question) => question.session_id === sessionId,
  );
  const questionAuthors: Record<string, ArchiveIdentity> = {};
  for (const question of questions) {
    if (
      question.author_user_id &&
      question.author_email &&
      question.author_nickname
    ) {
      questionAuthors[question.question_id] = {
        id: question.author_user_id,
        nickname: question.author_nickname,
        email: question.author_email,
      };
    }
  }
  return {
    settings: location.settings,
    teacher: {
      id: session.teacher_id,
      nickname: session.teacher_nickname || principal.nickname,
      email: session.teacher_email || principal.email,
    },
    questionAuthors,
    session: {
      id: session.session_id,
      teacherId: session.teacher_id,
      title: session.title,
      phase: "ended",
      seq: session.sequence_number,
      endedAt: session.ended_at,
      questions: questions.map((question) => ({
        id: question.question_id,
        participantId: question.participant_id,
        authorName:
          question.author_nickname ?? question.author_name ?? "익명",
        text: question.question_text,
        createdSeq: question.created_sequence,
        likedBy: rows.likes
          .filter(
            (like) =>
              like.session_id === sessionId &&
              like.question_id === question.question_id,
          )
          .map((like) => like.participant_id),
      })),
      processedCommandIds: rows.commands
        .filter((command) => command.session_id === sessionId)
        .map((command) => command.command_id),
    },
  };
}

