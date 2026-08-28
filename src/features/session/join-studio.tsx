"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useAuth } from "@/auth/auth-provider";
import { QuestionFeed } from "@/features/session/question-feed";
import {
  publishCommand,
  requestSessionJoin,
  waitForSnapshot,
  type SignalingJoin,
} from "@/signaling/signaling-client";
import { useSessionStore } from "@/state/session-store";
import {
  CodeField,
  ErrorText,
  Label,
  Muted,
  Panel,
  Studio,
  StudioShell,
} from "@/features/session/session-controls";
import { PrimaryButton } from "@/ui/primitives";

const subscribeToLocation = () => () => undefined;

export function JoinStudio() {
  const relay = useRef<(SignalingJoin & { code: string }) | null>(null);
  const relayAbort = useRef<AbortController | null>(null);
  const { login, user } = useAuth();
  const autoJoinStarted = useRef(false);
  const invitedCode = useSyncExternalStore(
    subscribeToLocation,
    () =>
      normalizeCode(new URL(window.location.href).searchParams.get("code") ?? ""),
    () => "",
  );
  const [enteredCode, setEnteredCode] = useState("");
  const sessionCode = enteredCode || invitedCode;
  const [error, setError] = useState("");
  const [participantId, setParticipantId] = useState<string>();
  const { session, connectionStatus, replaceSnapshot } = useSessionStore();

  useEffect(
    () => () => {
      relayAbort.current?.abort();
    },
    [],
  );

  const connect = useCallback(
    async (code: string) => {
      const controller = new AbortController();
      try {
        if (code.length !== 6) {
          setError("6자리 세션 코드를 입력해 주세요");
          return;
        }
        useSessionStore.getState().setConnectionStatus("connecting");
        relayAbort.current?.abort();
        relayAbort.current = controller;
        const join = await requestSessionJoin(code, {
          signal: controller.signal,
        });
        relay.current = { code, ...join };
        setParticipantId(join.id);
        setError("");
        while (!controller.signal.aborted) {
          const snapshot = await waitForSnapshot(
            code,
            join.id,
            join.joinToken,
            { signal: controller.signal },
          );
          replaceSnapshot(snapshot);
          useSessionStore.getState().setConnectionStatus("connected");
          if (snapshot.phase === "ended") {
            return;
          }
        }
      } catch (reason) {
        if (controller.signal.aborted) {
          return;
        }
        useSessionStore.getState().setConnectionStatus("failed");
        setError(reason instanceof Error ? reason.message : "세션에 연결하지 못했습니다");
        autoJoinStarted.current = false;
      }
    },
    [replaceSnapshot],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (
        active &&
        invitedCode.length === 6 &&
        !autoJoinStarted.current
      ) {
        autoJoinStarted.current = true;
        void connect(invitedCode);
      }
    });
    return () => {
      active = false;
    };
  }, [connect, invitedCode]);

  const submitQuestion = (
    text: string,
    anonymous: boolean,
    authorName: string,
    commandId: string,
  ) => {
    const connection = relay.current;
    if (!connection) {
      setError("세션 참여 정보를 찾을 수 없습니다");
      return;
    }
    void publishCommand(
      connection.code,
      connection.id,
      connection.joinToken,
      {
        commandId,
        kind: "question.submit",
        text,
        anonymous,
        authorName,
      },
    ).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "질문을 보내지 못했습니다");
    });
  };

  const toggleVote = (questionId: string) => {
    const connection = relay.current;
    if (!connection) {
      setError("세션 참여 정보를 찾을 수 없습니다");
      return;
    }
    void publishCommand(
      connection.code,
      connection.id,
      connection.joinToken,
      {
        commandId: crypto.randomUUID(),
        kind: "question.vote.toggle",
        questionId,
      },
    ).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "추천을 반영하지 못했습니다");
    });
  };

  if (session) {
    return (
      <StudioShell>
        <Studio>
          <h1>{session.title}</h1>
          <Muted>궁금한 내용을 질문하거나 친구가 남긴 질문을 함께 확인해 보세요.</Muted>
          <QuestionFeed
            questions={session.questions}
            participantId={participantId}
            realName={user?.nickname}
            realEmail={user?.email}
            onRequestRealName={() => {
              void login().catch(() => {
                setError("실명으로 질문하려면 로그인이 필요합니다");
              });
            }}
            onSubmit={submitQuestion}
            onVote={toggleVote}
          />
          {error && <ErrorText role="alert">{error}</ErrorText>}
        </Studio>
      </StudioShell>
    );
  }

  return (
    <StudioShell>
      <Studio>
        <h1>Q&amp;A 세션 참여</h1>
        <Muted>공유 링크로 들어오거나 선생님에게 받은 세션 코드를 입력하세요.</Muted>
        {connectionStatus === "connected" ? (
          <Muted>질문 목록을 불러오는 중입니다.</Muted>
        ) : (
          <Panel>
            <Label>
              세션 코드
              <CodeField
                value={sessionCode}
                maxLength={6}
                autoCapitalize="characters"
                onChange={(event) =>
                  setEnteredCode(normalizeCode(event.target.value))
                }
              />
            </Label>
            <PrimaryButton
              type="button"
              disabled={sessionCode.length !== 6 || connectionStatus === "connecting"}
              onClick={() => void connect(sessionCode)}
            >
              {connectionStatus === "connecting" ? "참여 중" : "세션 참여"}
            </PrimaryButton>
          </Panel>
        )}
        {error && <ErrorText role="alert">{error}</ErrorText>}
      </Studio>
    </StudioShell>
  );
}

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6);
}
