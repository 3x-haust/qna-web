"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/auth/auth-provider";
import {
  BoardHeader,
  ClassName,
  ClassroomBoard,
  Copy,
  Eyebrow,
  Heading,
  Hero,
  HeroActions,
  HeroInner,
  Lead,
  LoginError,
  LiveMark,
  SessionCreate,
  StepNumber,
  StepText,
  StudentLink,
  WorkflowList,
  WorkflowStep,
} from "@/features/home/guest-home.styles";
import { BrandHeader } from "@/ui/header";
import { AppShell } from "@/ui/primitives";

export function GuestHome() {
  const { login, isLoading } = useAuth();
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    try {
      setLoginError("");
      await login();
    } catch {
      setLoginError("로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <AppShell data-testid="app-shell">
      <BrandHeader onLogin={() => void handleLogin()} loginLoading={isLoading} />
      <Hero>
        <HeroInner>
          <Copy>
            <Eyebrow>수업을 이어 주는 실시간 Q&amp;A</Eyebrow>
            <Heading>
              궁금한 건 바로 묻고,
              <br />
              <span>선생님은 놓치지 않아요</span>
            </Heading>
            <Lead>
              학생은 수업 중 익명 또는 실명으로 질문하고, 중요한 질문에 표시를 더할 수
              있어요. 선생님은 질문 흐름을 한눈에 보고 수업에서 바로 설명합니다.
            </Lead>
            <HeroActions>
              <SessionCreate as={Link} href="/session/create">
                세션 만들기
              </SessionCreate>
              <StudentLink as={Link} href="/join" aria-label="학생 참여">
                학생 참여 코드 입력
              </StudentLink>
            </HeroActions>
            {loginError && <LoginError role="alert">{loginError}</LoginError>}
          </Copy>

          <ClassroomBoard aria-label="수업 Q&A 이용 흐름">
            <BoardHeader>
              <LiveMark>
                <span aria-hidden="true" />
                수업 Q&amp;A 흐름
              </LiveMark>
              <ClassName>질문을 놓치지 않는 방법</ClassName>
            </BoardHeader>
            <WorkflowList>
              <WorkflowStep>
                <StepNumber>1</StepNumber>
                <StepText>
                  <strong>세션 공유</strong>
                  <span>선생님이 링크나 6자리 코드를 공유해요.</span>
                </StepText>
              </WorkflowStep>
              <WorkflowStep>
                <StepNumber>2</StepNumber>
                <StepText>
                  <strong>학생 질문</strong>
                  <span>학생이 익명 또는 실명으로 질문을 남겨요.</span>
                </StepText>
              </WorkflowStep>
              <WorkflowStep>
                <StepNumber>3</StepNumber>
                <StepText>
                  <strong>수업에서 설명</strong>
                  <span>선생님이 중요한 질문부터 바로 설명해요.</span>
                </StepText>
              </WorkflowStep>
            </WorkflowList>
          </ClassroomBoard>
        </HeroInner>
      </Hero>
    </AppShell>
  );
}
