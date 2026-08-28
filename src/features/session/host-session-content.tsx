"use client";

import type { SessionState } from "@/domain/session";
import { QuestionFeed } from "@/features/session/question-feed";
import {
  ErrorText,
  Label,
  Muted,
  Panel,
  SessionActions,
  SessionToolbar,
  Toast,
} from "@/features/session/session-controls";
import { Field, PrimaryButton } from "@/ui/primitives";

export function HostSessionContent({
  error,
  notice,
  peerCount,
  session,
  title,
  onEnd,
  onShare,
  onStart,
  onTitleChange,
  onRetryConnection,
}: {
  readonly error: string;
  readonly notice: string;
  readonly peerCount: number;
  readonly session: SessionState | null;
  readonly title: string;
  readonly onEnd: () => void;
  readonly onShare: () => void;
  readonly onStart: () => void;
  readonly onTitleChange: (title: string) => void;
  readonly onRetryConnection?: () => void;
}) {
  return (
    <>
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
            <Field
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </Label>
          <PrimaryButton type="button" onClick={onStart}>
            세션 시작
          </PrimaryButton>
        </Panel>
      ) : (
        <>
          <SessionToolbar>
            <p>{peerCount}명 참여 중</p>
            <SessionActions data-testid="teacher-session-actions">
              <PrimaryButton type="button" onClick={onShare}>
                공유
              </PrimaryButton>
              <PrimaryButton type="button" onClick={onEnd}>
                세션 종료
              </PrimaryButton>
            </SessionActions>
          </SessionToolbar>
          <QuestionFeed questions={session.questions} />
        </>
      )}
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {onRetryConnection && (
        <PrimaryButton type="button" onClick={onRetryConnection}>
          세션 연결 다시 시도
        </PrimaryButton>
      )}
      {notice && <Toast role="status">{notice}</Toast>}
    </>
  );
}
