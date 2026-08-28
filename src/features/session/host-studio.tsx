"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { queueArchiveSession } from "@/archive/archive-client";
import type { ArchiveSettings } from "@/archive/archive-rows";
import { ArchiveSettingsDialog } from "@/features/session/archive-settings-dialog";
import { useAuth } from "@/auth/auth-provider";
import { archiveIdentityFromUser } from "@/auth/archive-identity";
import { HostSessionContent } from "@/features/session/host-session-content";
import { ShareDialog } from "@/features/session/share-dialog";
import { useReopenedSession } from "@/features/session/use-reopened-session";
import {
  closeSignalingSession,
  createSignalingSession,
  publishSnapshot,
  waitForCommand,
  waitForJoin,
  type SignalingSession,
} from "@/signaling/signaling-client";
import { useSessionStore } from "@/state/session-store";
import { Studio, StudioShell } from "@/features/session/session-controls";

export function HostStudio() {
  const router = useRouter();
  const { user } = useAuth();
  const signaling = useRef<SignalingSession | null>(null);
  const signalingAbort = useRef<AbortController | null>(null);
  const listenForStudentsRef = useRef<
    (code: string, hostToken: string, signal: AbortSignal) => Promise<void>
  >(async () => undefined);
  const joinedStudents = useRef(new Set<string>());
  const [title, setTitle] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [peerCount, setPeerCount] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const {
    session,
    role,
    reopenPending,
    startHost,
    finish,
    consumeReopen,
  } = useSessionStore();

  useEffect(
    () => () => {
      signalingAbort.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2_200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    router.prefetch("/home");
  }, [router]);

  const broadcastSnapshot = async (code: string, hostToken: string) => {
    const snapshot = useSessionStore.getState().session;
    if (!snapshot) return;
    await Promise.all(
      [...joinedStudents.current].map((joinId) =>
        publishSnapshot(code, joinId, hostToken, snapshot),
      ),
    );
  };

  const connectStudent = async (
    code: string,
    hostToken: string,
    joinId: string,
    signal: AbortSignal,
  ) => {
    joinedStudents.current.add(joinId);
    setPeerCount((count) => count + 1);
    await broadcastSnapshot(code, hostToken);
    while (!signal.aborted) {
      const command = await waitForCommand(code, joinId, hostToken, { signal });
      if (command.kind === "question.submit") {
        useSessionStore
          .getState()
          .submitQuestion(
            joinId,
            command.text,
            command.anonymous,
            command.authorName,
            command.commandId,
            command.authorId && command.authorEmail
              ? {
                  id: command.authorId,
                  nickname: command.authorName,
                  email: command.authorEmail,
                }
              : undefined,
          );
      } else {
        useSessionStore
          .getState()
          .toggleVote(joinId, command.questionId, command.commandId);
      }
      await broadcastSnapshot(code, hostToken);
    }
  };

  const listenForStudents = async (
    code: string,
    hostToken: string,
    signal: AbortSignal,
  ) => {
    try {
      while (!signal.aborted) {
        const join = await waitForJoin(code, hostToken, { signal });
        void connectStudent(code, hostToken, join.id, signal).catch((reason: unknown) => {
          if (!signal.aborted) {
            setError(reason instanceof Error ? reason.message : "학생과 연결하지 못했습니다");
          }
        });
      }
    } catch (reason) {
      if (!signal.aborted) {
        setError(reason instanceof Error ? reason.message : "학생 참여를 기다리지 못했습니다");
      }
    }
  };

  useEffect(() => {
    listenForStudentsRef.current = listenForStudents;
  });

  const startReopenedSession = async () => {
    const controller = new AbortController();
    signalingAbort.current = controller;
    const created = await createSignalingSession();
    signaling.current = created;
    setSessionCode(created.code);
    setInviteUrl(`${window.location.origin}/join?code=${created.code}`);
    useSessionStore.getState().setConnectionStatus("connecting");
    void listenForStudentsRef.current(
      created.code,
      created.hostToken,
      controller.signal,
    );
  };
  const retryReopenedSession = useReopenedSession({
    consume: consumeReopen,
    enabled:
      role === "teacher" &&
      session?.phase === "live" &&
      reopenPending,
    onError: setError,
    start: startReopenedSession,
  });

  const start = async () => {
    if (!title.trim()) {
      setError("세션 이름을 입력해 주세요");
      return;
    }
    try {
      const teacher = archiveIdentityFromUser(user);
      const created = await createSignalingSession();
      signaling.current = created;
      startHost(title, teacher);
      joinedStudents.current.clear();
      const controller = new AbortController();
      signalingAbort.current = controller;
      setSessionCode(created.code);
      setInviteUrl(`${window.location.origin}/join?code=${created.code}`);
      useSessionStore.getState().setConnectionStatus("connecting");
      setError("");
      void listenForStudents(created.code, created.hostToken, controller.signal);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "세션을 시작하지 못했습니다");
    }
  };

  const end = async () => {
    finish();
    if (signaling.current) {
      try {
        await broadcastSnapshot(
          signaling.current.code,
          signaling.current.hostToken,
        );
        signalingAbort.current?.abort();
        await closeSignalingSession(
          signaling.current.code,
          signaling.current.hostToken,
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "세션 초대를 닫지 못했습니다");
      }
    }
    setShowEnd(true);
  };

  const archive = (settings: ArchiveSettings) => {
    const current = useSessionStore.getState();
    if (!current.session) return;
    queueArchiveSession(current.archiveRecord(settings));
    current.reset();
    router.replace("/home");
  };

  return (
    <StudioShell>
      <Studio>
        <HostSessionContent
          error={error}
          notice={notice}
          peerCount={peerCount}
          session={role === "teacher" ? session : null}
          title={title}
          onEnd={() => void end()}
          onShare={() => setShowShare(true)}
          onStart={() => void start()}
          onTitleChange={setTitle}
          onRetryConnection={
            retryReopenedSession
          }
        />
        {showShare && (
          <ShareDialog
            code={sessionCode}
            inviteUrl={inviteUrl}
            onClose={() => setShowShare(false)}
            onError={setError}
            onNotice={setNotice}
          />
        )}
        {showEnd && (
          <ArchiveSettingsDialog
            onArchive={archive}
            onCancel={() => setShowEnd(false)}
          />
        )}
      </Studio>
    </StudioShell>
  );
}
