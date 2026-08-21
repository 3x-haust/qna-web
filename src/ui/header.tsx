"use client";

import Image from "next/image";
import Link from "next/link";
import styled from "styled-components";

import { mirimLogoDataUri, qnaMarkDataUri } from "@/assets/figma-raster";
import { PrimaryButton } from "@/ui/primitives";

const HeaderRoot = styled.header<{ $compact?: boolean }>`
  position: relative;
  z-index: 2;
  display: flex;
  width: min(${({ $compact }) => ($compact ? "1172px" : "1440px")}, 100%);
  height: 74px;
  margin: 0 auto;
  align-items: center;
  justify-content: space-between;
  padding: 30px ${({ $compact }) => ($compact ? "16px" : "32px")} 0;

  @media (max-width: 640px) {
    height: 68px;
    padding: 22px 20px 0;
  }
`;

const Brand = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.accent};
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -2.4px;
`;

const BrandImage = styled(Image)`
  width: 36px;
  height: 24px;
  flex: 0 0 auto;
  object-fit: contain;
`;

const LoginButton = styled(PrimaryButton)`
  padding: 10px;
`;

export function BrandHeader({
  authenticated = false,
  onLogin,
  loginLoading = false,
}: {
  authenticated?: boolean;
  onLogin?: () => void;
  loginLoading?: boolean;
}) {
  return (
    <HeaderRoot $compact={authenticated}>
      <Link href="/" aria-label="QnA 홈">
        <Brand role="img" aria-label="QnA">
          <BrandImage
            src={qnaMarkDataUri}
            alt=""
            width={36}
            height={24}
            data-testid="qna-mark"
            priority
          />
          QnA
        </Brand>
      </Link>
      {authenticated ? (
        <PrimaryButton as={Link} href="/session/create">
          <Image src="/assets/plus.svg" alt="" width={14} height={14} />
          세션 만들기
        </PrimaryButton>
      ) : (
        <LoginButton
          type="button"
          onClick={onLogin}
          disabled={loginLoading}
          aria-label="미림마이스터고 로그인"
        >
          <Image src={mirimLogoDataUri} alt="" width={24} height={24} />
          {loginLoading ? "로그인 중" : "로그인하기"}
        </LoginButton>
      )}
    </HeaderRoot>
  );
}
