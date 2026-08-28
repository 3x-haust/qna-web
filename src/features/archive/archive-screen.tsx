"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  listArchives,
  loadArchive,
} from "@/archive/archive-client";
import type {
  ArchiveDetail,
  ArchiveSummary,
} from "@/archive/archive-rows";
import { useAuth } from "@/auth/auth-provider";
import { archiveIdentityFromUser } from "@/auth/archive-identity";
import {
  ArchiveActions,
  ArchiveCard,
  ArchiveContent,
  ArchiveDetailPanel,
  ArchiveEmpty,
  ArchiveError,
  ArchiveGrid,
  ArchiveHeading,
  ArchiveList,
  ArchiveMeta,
  ArchivedQuestion,
  ArchivedQuestions,
  DetailTeacher,
  HomeLink,
  SecondaryButton,
  SelectedBadge,
} from "@/features/archive/archive-screen.styles";
import { useSessionStore } from "@/state/session-store";
import { AppShell, PrimaryButton } from "@/ui/primitives";
import { BrandHeader } from "@/ui/header";

export function ArchiveScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [archives, setArchives] = useState<readonly ArchiveSummary[]>([]);
  const [selected, setSelected] = useState<ArchiveDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !user) return;
    let active = true;
    void listArchives()
      .then((items) => {
        if (active) setArchives(items);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "아카이브 목록을 불러오지 못했습니다",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isLoading, user]);

  const getDetail = async (summary: ArchiveSummary) => {
    if (!user) throw new Error("선생님 정보를 확인하지 못했습니다");
    if (selectedId === summary.sessionId && selected) return selected;
    const detail = await loadArchive(
      summary.sessionId,
      summary.location,
    );
    setSelected(detail);
    setSelectedId(summary.sessionId);
    return detail;
  };

  const view = async (summary: ArchiveSummary) => {
    try {
      setError("");
      await getDetail(summary);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "아카이브를 불러오지 못했습니다",
      );
    }
  };

  const reopen = async (summary: ArchiveSummary) => {
    try {
      const teacher = archiveIdentityFromUser(user);
      setError("");
      const detail = await getDetail(summary);
      useSessionStore.getState().startHostFromArchive(detail, teacher);
      router.push("/session/create?reopened=1");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "아카이브 세션을 다시 열지 못했습니다",
      );
    }
  };

  return (
    <AppShell>
      <BrandHeader authenticated />
      <ArchiveContent>
        <ArchiveHeading>
          <div>
            <h1>세션 아카이브</h1>
            <p>종료한 세션의 질문을 확인하거나 새 참여 코드로 다시 열 수 있습니다.</p>
          </div>
          <HomeLink href="/home">홈으로</HomeLink>
        </ArchiveHeading>
        {(error || (!isLoading && !user)) && (
          <ArchiveError role="alert">
            {error || "아카이브를 보려면 로그인이 필요합니다"}
          </ArchiveError>
        )}
        {isLoading || (user && loading) ? (
          <ArchiveEmpty aria-busy="true">아카이브를 불러오는 중입니다.</ArchiveEmpty>
        ) : !user ? (
          <ArchiveEmpty>로그인 후 아카이브를 확인할 수 있습니다.</ArchiveEmpty>
        ) : archives.length === 0 ? (
          <ArchiveEmpty>아직 보관한 세션이 없습니다.</ArchiveEmpty>
        ) : (
          <ArchiveGrid>
            <ArchiveList>
              {archives.map((archive) => (
                <ArchiveCard
                  key={`${archive.location.visibility}:${archive.location.encryption}:${archive.sessionId}`}
                  $selected={selectedId === archive.sessionId}
                >
                  <div>
                    <h2>{archive.title}</h2>
                    {selectedId === archive.sessionId && (
                      <SelectedBadge>선택됨</SelectedBadge>
                    )}
                    <ArchiveMeta>
                      <span>질문 {archive.questionCount}개</span>
                      <span>{formatDate(archive.endedAt)}</span>
                      <span>
                        {archive.location.visibility === "private"
                          ? "Private"
                          : "Public"}
                        {" · "}
                        {archive.location.encryption === "encrypted"
                          ? "Encrypted"
                          : "Plain"}
                      </span>
                    </ArchiveMeta>
                  </div>
                  <ArchiveActions>
                    <SecondaryButton
                      type="button"
                      aria-pressed={selectedId === archive.sessionId}
                      onClick={() => void view(archive)}
                    >
                      내용 보기
                    </SecondaryButton>
                    <PrimaryButton
                      type="button"
                      onClick={() => void reopen(archive)}
                    >
                      다시 열기
                    </PrimaryButton>
                  </ArchiveActions>
                </ArchiveCard>
              ))}
            </ArchiveList>
            {selected ? (
              <ArchiveDetailPanel aria-live="polite">
                <h2>{selected.session.title}</h2>
                <DetailTeacher>
                  {selected.teacher.nickname} · {selected.teacher.email}
                </DetailTeacher>
                <ArchivedQuestions>
                  {selected.session.questions.map((question) => {
                    const identity = selected.questionAuthors[question.id];
                    return (
                      <ArchivedQuestion key={question.id}>
                        <strong>
                          {identity
                            ? `${identity.nickname} · ${identity.email}`
                            : question.authorName}
                        </strong>
                        <p>{question.text}</p>
                        <small>좋아요 {question.likedBy.length}개</small>
                      </ArchivedQuestion>
                    );
                  })}
                </ArchivedQuestions>
              </ArchiveDetailPanel>
            ) : (
              <ArchiveEmpty>세션을 선택하면 질문 기록을 볼 수 있습니다.</ArchiveEmpty>
            )}
          </ArchiveGrid>
        )}
      </ArchiveContent>
    </AppShell>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
