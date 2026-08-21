"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useAuth } from "@/auth/auth-provider";
import { QuestionFeed } from "@/features/session/question-feed";
import { StudentRuntime } from "@/rtc/runtime";
import {
  publishAnswer,
  requestSessionJoin,
  waitForOffer,
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
  const runtime = useRef<StudentRuntime | null>(null);
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

  useEffect(() => () => runtime.current?.close(), []);

  const connect = useCallback(
    async (code: string) => {
      try {
        if (code.length !== 6) {
          setError("6자리 세션 코드를 입력해 주세요");
          return;
        }
        useSessionStore.getState().setConnectionStatus("connecting");
        const student = new StudentRuntime(
          (message) => {
            if (message.kind === "snapshot") {
              replaceSnapshot(message.session);
            }
          },
          () => useSessionStore.getState().setConnectionStatus("connected"),
        );
        runtime.current = student;
        const join = await requestSessionJoin(code);
        const offer = await waitForOffer(code, join.id, join.joinToken);
        const answerSignal = await student.acceptOffer(offer);
        const connectedParticipantId = student.getParticipantId();
        if (!connectedParticipantId) {
          throw new Error("학생 참여자 정보를 확인하지 못했습니다");
        }
        setParticipantId(connectedParticipantId);
        await publishAnswer(code, join.id, join.joinToken, answerSignal);
        setError("");
      } catch (reason) {
        useSessionStore.getState().setConnectionStatus("failed");
        setError(reason instanceof Error ? reason.message : "세션에 연결하지 못했습니다");
        autoJoinStarted.current = false;
      }
    },
    [replaceSnapshot],
  );

  useEffect(() => {
    if (invitedCode.length === 6 && !autoJoinStarted.current) {
      autoJoinStarted.current = true;
      void connect(invitedCode);
    }
  }, [connect, invitedCode]);

  const submitQuestion = (
    text: string,
    anonymous: boolean,
    authorName: string,
    commandId: string,
  ) => {
    try {
      if (!runtime.current) throw new Error("세션 참여 정보를 찾을 수 없습니다");
      runtime.current.sendQuestion(text, anonymous, authorName, commandId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "질문을 보내지 못했습니다");
    }
  };

  const toggleVote = (questionId: string) => {
    try {
      if (!runtime.current) throw new Error("세션 참여 정보를 찾을 수 없습니다");
      runtime.current.toggleVote(questionId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "추천을 반영하지 못했습니다");
    }
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
