"use client";

import { create } from "zustand";

import type {
  ArchiveDetail,
  ArchiveIdentity,
  ArchiveRecord,
  ArchiveSettings,
} from "@/archive/archive-rows";
import {
  createSession,
  endSession,
  reduceHostCommand,
  reopenSession,
  type SessionState,
} from "@/domain/session";

type SessionStore = {
  role: "teacher" | "student" | null;
  session: SessionState | null;
  teacher: ArchiveIdentity | null;
  questionAuthors: Readonly<Record<string, ArchiveIdentity>>;
  reopenPending: boolean;
  connectionStatus: "idle" | "connecting" | "connected" | "failed";
  setConnectionStatus: (status: SessionStore["connectionStatus"]) => void;
  startHost: (title: string, teacher: ArchiveIdentity) => void;
  startHostFromArchive: (
    archive: ArchiveDetail,
    teacher: ArchiveIdentity,
  ) => void;
  joinSnapshot: (session: SessionState) => void;
  submitQuestion: (
    participantId: string,
    text: string,
    anonymous: boolean,
    authorName: string,
    commandId?: string,
    identity?: ArchiveIdentity,
  ) => void;
  toggleVote: (participantId: string, questionId: string, commandId?: string) => void;
  finish: () => void;
  replaceSnapshot: (session: SessionState) => void;
  archiveRecord: (settings: ArchiveSettings) => ArchiveRecord;
  consumeReopen: () => void;
  reset: () => void;
};

const initial = {
  role: null,
  session: null,
  teacher: null,
  questionAuthors: {},
  reopenPending: false,
  connectionStatus: "idle" as const,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initial,
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  startHost: (title, teacher) =>
    set({
      role: "teacher",
      session: createSession(crypto.randomUUID(), teacher.id, title.trim()),
      teacher,
      questionAuthors: {},
      reopenPending: false,
      connectionStatus: "idle",
    }),
  startHostFromArchive: (archive, teacher) =>
    set({
      role: "teacher",
      session: reopenSession(archive.session, crypto.randomUUID(), teacher.id),
      teacher,
      questionAuthors: archive.questionAuthors,
      reopenPending: true,
      connectionStatus: "idle",
    }),
  joinSnapshot: (session) =>
    set({
      role: "student",
      session,
      connectionStatus: "connected",
    }),
  submitQuestion: (
    participantId,
    text,
    anonymous,
    authorName,
    commandId,
    identity,
  ) =>
    set(({ session, questionAuthors }) => {
      if (!session) {
        throw new Error("진행 중인 질의가 없습니다");
      }
      const nextSession = reduceHostCommand(session, {
        commandId: commandId ?? crypto.randomUUID(),
        kind: "question.submit",
        participantId,
        text,
        anonymous,
        authorName,
      });
      const question =
        nextSession.questions.length > session.questions.length
          ? nextSession.questions.at(-1)
          : undefined;
      return {
        session: nextSession,
        questionAuthors:
          identity && question
            ? { ...questionAuthors, [question.id]: identity }
            : questionAuthors,
      };
    }),
  toggleVote: (participantId, questionId, commandId) =>
    set(({ session }) => {
      if (!session) {
        throw new Error("진행 중인 세션이 없습니다");
      }
      return {
        session: reduceHostCommand(session, {
          commandId: commandId ?? crypto.randomUUID(),
          kind: "question.vote.toggle",
          participantId,
          questionId,
        }),
      };
    }),
  finish: () =>
    set(({ session }) => {
      if (!session) {
        throw new Error("진행 중인 질의가 없습니다");
      }
      return { session: endSession(session) };
    }),
  replaceSnapshot: (session) => set({ session }),
  archiveRecord: (settings) => {
    const { session, teacher, questionAuthors } = get();
    if (!session || !teacher) {
      throw new Error("보관할 선생님 세션이 없습니다");
    }
    return { session, teacher, questionAuthors, settings };
  },
  consumeReopen: () => set({ reopenPending: false }),
  reset: () => set(initial),
}));
