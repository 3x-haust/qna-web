"use client";

import Link from "next/link";
import styled from "styled-components";

import { BrandHeader } from "@/ui/header";
import { AppShell, PrimaryButton } from "@/ui/primitives";

const Content = styled.section`
  width: min(1172px, calc(100% - 40px));
  margin: 120px auto 0;
`;

const EmptyState = styled.div`
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 64px 24px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: ${({ theme }) => theme.colors.gray500};
  text-align: center;
  word-break: keep-all;

  h1 {
    margin: 0 0 12px;
    color: ${({ theme }) => theme.colors.white};
    font-size: 28px;
    font-weight: 700;
    line-height: 1.3;
  }

  p {
    max-width: 440px;
    margin: 0 0 32px;
    color: ${({ theme }) => theme.colors.gray70};
    font-size: 16px;
    font-weight: 500;
    line-height: 1.6;
  }
`;

export function AuthenticatedHome() {
  return (
    <AppShell data-testid="app-shell">
      <BrandHeader authenticated />
      <Content>
        <EmptyState data-testid="session-empty">
          <h1>아직 만든 세션이 없습니다</h1>
          <p>
            새 Q&amp;A 세션을 열고 참여 링크를 공유하면 학생 질문을 실시간으로 확인할
            수 있어요.
          </p>
          <PrimaryButton as={Link} href="/session/create">
            세션 만들기
          </PrimaryButton>
        </EmptyState>
      </Content>
    </AppShell>
  );
}
