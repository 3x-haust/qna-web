"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { queueArchiveSession } from "@/archive/archive-client";
import { useAuth } from "@/auth/auth-provider";
import { QuestionFeed } from "@/features/session/question-feed";
import {
  closeSignalingSession,
  createSignalingSession,
  publishSnapshot,
  waitForCommand,
  waitForJoin,
  type SignalingSession,
} from "@/signaling/signaling-client";
import { useSessionStore } from "@/state/session-store";
import {
  CodeField,
  Dialog,
  DialogActions,
  DialogOverlay,
  ErrorText,
  Label,
  Muted,
  Panel,
  SessionActions,
  SessionToolbar,
  Studio,
  StudioShell,
  Toast,
} from "@/features/session/session-controls";
import { Field, PrimaryButton } from "@/ui/primitives";

export function HostStudio() {
  const router = useRouter();
  const { user } = useAuth();
  const signaling = useRef<SignalingSession | null>(null);
  const signalingAbort = useRef<AbortController | null>(null);
  const joinedStudents = useRef(new Set<string>());
  const [title, setTitle] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [peerCount, setPeerCount] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const { session, startHost, finish } = useSessionStore();

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

  const broadcastSnapshot = async (
    code: string,
    hostToken: string,
  ) => {
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

  const start = async () => {
    if (!title.trim()) {
      setError("세션 이름을 입력해 주세요");
      return;
    }
    if (!user) {
      setError("세션을 만들려면 로그인이 필요합니다");
      return;
    }
    try {
      const created = await createSignalingSession();
      startHost(title, user.id);
      signaling.current = created;
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

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setError("클립보드에 복사하지 못했습니다");
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

  const archive = () => {
    const current = useSessionStore.getState().session;
    if (!current) return;
    queueArchiveSession(current);
    router.replace("/home");
  };

  return (
    <StudioShell>
      <Studio>
        <h1>{session?.title ?? "새 Q&A 세션"}</h1>
        <Muted>
          {session
            ? "수업 중 올라오는 학생 질문을 인기순 또는 최근순으로 확인합니다."
            : "세션을 만들고 학생에게 참여 링크나 6자리 코드를 공유하세요."}
        </Muted>
        {!session ? (
          <Panel>
            <Label>
              세션 이름
              <Field value={title} onChange={(event) => setTitle(event.target.value)} />
            </Label>
            <PrimaryButton type="button" onClick={() => void start()}>
              세션 시작
            </PrimaryButton>
          </Panel>
        ) : (
          <>
            <SessionToolbar>
              <p>{peerCount}명 참여 중</p>
              <SessionActions data-testid="teacher-session-actions">
                <PrimaryButton type="button" onClick={() => setShowShare(true)}>
                  공유
                </PrimaryButton>
                <PrimaryButton type="button" onClick={() => void end()}>
                  세션 종료
                </PrimaryButton>
              </SessionActions>
            </SessionToolbar>
            <QuestionFeed questions={session.questions} />
          </>
        )}
        {error && <ErrorText role="alert">{error}</ErrorText>}
        {notice && <Toast role="status">{notice}</Toast>}
        {showShare && (
          <DialogOverlay
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setShowShare(false);
            }}
          >
            <Dialog open aria-label="세션 공유">
              <h2>학생 초대</h2>
              <Label>
                세션 코드
                <CodeField readOnly value={sessionCode} />
              </Label>
              <PrimaryButton
                type="button"
                onClick={() => void copyText(sessionCode, "세션 코드를 복사했습니다")}
              >
                세션 코드 복사
              </PrimaryButton>
              <Label>
                참여 링크
                <Field readOnly value={inviteUrl} />
              </Label>
              <PrimaryButton
                type="button"
                onClick={() => void copyText(inviteUrl, "참여 링크를 복사했습니다")}
              >
                참여 링크 복사
              </PrimaryButton>
              <DialogActions>
                <PrimaryButton type="button" onClick={() => setShowShare(false)}>
                  닫기
                </PrimaryButton>
              </DialogActions>
            </Dialog>
          </DialogOverlay>
        )}
        {showEnd && (
          <DialogOverlay>
            <Dialog open aria-label="세션 종료">
              <h2>세션 종료</h2>
              <p>현재 학생 질문을 세션 기록으로 보관합니다.</p>
              <DialogActions>
                <PrimaryButton type="button" onClick={() => setShowEnd(false)}>
                  취소
                </PrimaryButton>
                <PrimaryButton type="button" onClick={archive}>
                  종료하고 보관
                </PrimaryButton>
              </DialogActions>
            </Dialog>
          </DialogOverlay>
        )}
      </Studio>
    </StudioShell>
  );
}
