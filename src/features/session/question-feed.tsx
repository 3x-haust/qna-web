"use client";

import Image from "next/image";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { SessionState } from "@/domain/session";
import {
  Author,
  AuthorMeta,
  Avatar,
  CardHeader,
  CharacterCount,
  Composer,
  ComposerFooter,
  EmptyState,
  Feed,
  IdentityButton,
  IdentityToggle,
  QuestionCard,
  QuestionList,
  QuestionText,
  SortTab,
  SortTabs,
  Vote,
} from "@/features/session/question-feed.styles";
import { PrimaryButton, TextArea } from "@/ui/primitives";

type QuestionFeedProps = {
  questions: SessionState["questions"];
  onSubmit?: (
    text: string,
    anonymous: boolean,
    authorName: string,
    commandId: string,
  ) => void;
  onVote?: (questionId: string) => void;
  realName?: string;
};

export function QuestionFeed({
  questions,
  onSubmit,
  onVote,
  realName,
}: QuestionFeedProps) {
  const [sort, setSort] = useState<"popular" | "recent">("popular");
  const submitLocked = useRef(false);
  const draftCommandId = useRef(crypto.randomUUID());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [expanded, setExpanded] = useState(false);
  const remainingCharacters = 160 - text.length;
  const sortedQuestions = useMemo(
    () =>
      [...questions].sort((left, right) =>
        sort === "popular"
          ? right.likedBy.length - left.likedBy.length ||
            right.createdSeq - left.createdSeq
          : right.createdSeq - left.createdSeq,
      ),
    [questions, sort],
  );

  const submit = () => {
    if (
      !onSubmit ||
      text.trim().length === 0 ||
      remainingCharacters < 0 ||
      submitLocked.current
    ) {
      return;
    }
    submitLocked.current = true;
    onSubmit(text, anonymous, authorName, draftCommandId.current);
    setText("");
    setExpanded(false);
  };

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (!expanded) {
      textarea.style.height = "24px";
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(72, textarea.scrollHeight)}px`;
  }, [expanded, text]);

  return (
    <Feed data-testid="question-feed">
      {onSubmit && (
        <Composer
          $expanded={expanded}
          data-testid="question-composer"
          data-expanded={expanded}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setExpanded(false);
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <TextArea
            ref={textareaRef}
            aria-label="질문 작성"
            value={text}
            placeholder="질문을 작성하세요"
            onChange={(event) => {
              if (text.length === 0 && event.target.value.length > 0) {
                draftCommandId.current = crypto.randomUUID();
              }
              setText(event.target.value);
              if (event.target.value.length > 0) submitLocked.current = false;
            }}
            onInput={(event) => {
              if (!expanded) return;
              event.currentTarget.style.height = "auto";
              event.currentTarget.style.height = `${Math.max(
                72,
                event.currentTarget.scrollHeight,
              )}px`;
            }}
            onFocus={() => setExpanded(true)}
          />
          {expanded && (
            <CharacterCount
              $over={remainingCharacters < 0}
              data-testid="question-remaining-count"
            >
              {remainingCharacters}
            </CharacterCount>
          )}
          <ComposerFooter $expanded={expanded}>
            {expanded && (
              <IdentityToggle aria-label="질문 작성자 표시">
                <IdentityButton
                  type="button"
                  $active={anonymous}
                  onClick={() => {
                    setAnonymous(true);
                    setAuthorName("");
                  }}
                >
                  익명
                </IdentityButton>
                <span>/</span>
                <IdentityButton
                  type="button"
                  $active={!anonymous}
                  disabled={!realName}
                  title={realName ? undefined : "로그인하면 실명으로 질문할 수 있습니다"}
                  onClick={() => {
                    if (realName) {
                      setAnonymous(false);
                      setAuthorName(realName);
                    }
                  }}
                >
                  {realName ?? "실명"}
                </IdentityButton>
              </IdentityToggle>
            )}
            <PrimaryButton
              type="submit"
              disabled={!text.trim() || remainingCharacters < 0}
            >
              보내기
              <Image src="/assets/send.svg" alt="" width={16} height={16} />
            </PrimaryButton>
          </ComposerFooter>
        </Composer>
      )}

      <SortTabs role="tablist" aria-label="질문 정렬">
        <SortTab
          type="button"
          role="tab"
          aria-selected={sort === "popular"}
          $active={sort === "popular"}
          onClick={() => setSort("popular")}
        >
          인기순
        </SortTab>
        <SortTab
          type="button"
          role="tab"
          aria-selected={sort === "recent"}
          $active={sort === "recent"}
          onClick={() => setSort("recent")}
        >
          최근순
        </SortTab>
      </SortTabs>

      {sortedQuestions.length === 0 ? (
        <EmptyState data-testid="questions-empty">
          <div>
            <strong>아직 질문이 없습니다.</strong>
            <p>{onSubmit ? "제일 먼저 물어보세요." : "학생 질문을 기다리고 있습니다."}</p>
          </div>
        </EmptyState>
      ) : (
        <QuestionList>
          {sortedQuestions.map((question) => (
            <QuestionCard key={question.id}>
              <CardHeader>
                <Author>
                  <Avatar>
                    <Image src="/assets/person.svg" alt="" width={18} height={18} />
                  </Avatar>
                  <AuthorMeta>
                    <strong>{question.authorName}</strong>
                    <small>방금</small>
                  </AuthorMeta>
                </Author>
                {onVote ? (
                  <Vote
                    type="button"
                    $interactive
                    aria-label={`${question.text} 추천`}
                    onClick={() => onVote(question.id)}
                  >
                    <span data-testid="question-vote-count">
                      {question.likedBy.length}
                    </span>
                    <Image src="/assets/thumb.svg" alt="" width={18} height={18} />
                  </Vote>
                ) : (
                  <Vote as="span" $interactive={false}>
                    <span data-testid="question-vote-count">
                      {question.likedBy.length}
                    </span>
                    <Image src="/assets/thumb.svg" alt="" width={18} height={18} />
                  </Vote>
                )}
              </CardHeader>
              <QuestionText>{question.text}</QuestionText>
            </QuestionCard>
          ))}
        </QuestionList>
      )}
    </Feed>
  );
}
