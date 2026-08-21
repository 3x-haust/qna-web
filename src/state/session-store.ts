"use client";

import { create } from "zustand";

import {
  createSession,
  endSession,
  reduceHostCommand,
  type SessionState,
} from "@/domain/session";

type SessionStore = {
  role: "teacher" | "student" | null;
  session: SessionState | null;
  connectionStatus: "idle" | "connecting" | "connected" | "failed";
  setConnectionStatus: (status: SessionStore["connectionStatus"]) => void;
  startHost: (title: string) => void;
  joinSnapshot: (session: SessionState) => void;
  submitQuestion: (
    participantId: string,
    text: string,
    anonymous: boolean,
    authorName: string,
    commandId?: string,
  ) => void;
  toggleVote: (participantId: string, questionId: string, commandId?: string) => void;
  finish: () => void;
  replaceSnapshot: (session: SessionState) => void;
  reset: () => void;
};

const initial = {
  role: null,
  session: null,
  connectionStatus: "idle" as const,
};

export const useSessionStore = create<SessionStore>((set) => ({
  ...initial,
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  startHost: (title) =>
    set({
      role: "teacher",
      session: createSession(crypto.randomUUID(), "teacher", title.trim()),
      connectionStatus: "idle",
    }),
  joinSnapshot: (session) =>
    set({
      role: "student",
      session,
      connectionStatus: "connected",
    }),
  submitQuestion: (participantId, text, anonymous, authorName, commandId) =>
    set(({ session }) => {
      if (!session) {
        throw new Error("진행 중인 질의가 없습니다");
      }
      return {
        session: reduceHostCommand(session, {
          commandId: commandId ?? crypto.randomUUID(),
          kind: "question.submit",
          participantId,
          text,
          anonymous,
          authorName,
        }),
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
  reset: () => set(initial),
}));
