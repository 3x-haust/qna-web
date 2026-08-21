import styled from "styled-components";

import { PrimaryButton } from "@/ui/primitives";

export const Hero = styled.main`
  position: relative;
  min-height: calc(100dvh - 74px);
  overflow: hidden;
  padding: 72px 24px 88px;

  &::before {
    position: absolute;
    z-index: 0;
    top: 8%;
    right: -12%;
    width: min(680px, 70vw);
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, ${({ theme }) =>
        theme.colors.primary} 22%, transparent), transparent 68%);
    content: "";
    pointer-events: none;
  }

  @media (max-width: 640px) {
    padding: 52px 20px 64px;
  }
`;

export const HeroInner = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  width: min(1140px, 100%);
  margin: 0 auto;
  align-items: center;
  grid-template-columns: minmax(0, 1.18fr) minmax(380px, 0.82fr);
  gap: 72px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    gap: 56px;
  }
`;

export const Copy = styled.section`
  min-width: 0;
`;

export const Eyebrow = styled.p`
  margin: 0 0 20px;
  color: ${({ theme }) => theme.colors.accent};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
`;

export const Heading = styled.h1`
  max-width: 680px;
  margin: 0;
  font-size: clamp(44px, 5vw, 72px);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 1.08;
  text-wrap: balance;
  word-break: keep-all;

  span {
    color: ${({ theme }) => theme.colors.accent};
  }

  @media (max-width: 640px) {
    font-size: 42px;
  }
`;

export const Lead = styled.p`
  max-width: 620px;
  margin: 28px 0 0;
  color: ${({ theme }) => theme.colors.gray70};
  font-size: 19px;
  font-weight: 500;
  line-height: 1.7;
  text-wrap: pretty;
  word-break: keep-all;

  @media (max-width: 640px) {
    margin-top: 24px;
    font-size: 16px;
  }
`;

export const HeroActions = styled.div`
  display: flex;
  margin-top: 36px;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
`;

export const SessionCreate = styled(PrimaryButton)`
  min-height: 48px;
  padding: 0 20px;
`;

export const LoginError = styled.p`
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.error};
  font-size: 14px;
  font-weight: 600;
`;

export const StudentLink = styled.a`
  color: ${({ theme }) => theme.colors.white};
  font-size: 15px;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: ${({ theme }) => theme.colors.gray300};
  text-underline-offset: 5px;

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
  }

  &:focus-visible {
    border-radius: 4px;
    outline: 2px solid ${({ theme }) => theme.colors.white};
    outline-offset: 4px;
  }
`;

export const ClassroomBoard = styled.article`
  position: relative;
  padding: 28px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.accent} 28%, ${({ theme }) =>
      theme.colors.gray400});
  border-radius: 20px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.gray500} 92%, black);
  box-shadow:
    0 28px 80px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 18%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 7%, transparent);

  @media (max-width: 640px) {
    padding: 22px;
    border-radius: 16px;
  }
`;

export const BoardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

export const LiveMark = styled.strong`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.accent};
  font-size: 13px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentcolor;
    box-shadow: 0 0 0 5px color-mix(in srgb, currentcolor 14%, transparent);
  }
`;

export const ClassName = styled.span`
  color: ${({ theme }) => theme.colors.gray70};
  font-size: 13px;
  font-weight: 600;
  text-align: right;
`;

export const WorkflowList = styled.ol`
  display: grid;
  margin: 34px 0 0;
  padding: 0;
  list-style: none;
  gap: 14px;
`;

export const WorkflowStep = styled.li`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.gray600};
`;

export const StepNumber = styled.span`
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 25%, transparent);
  color: ${({ theme }) => theme.colors.accent};
  font-size: 13px;
  font-weight: 700;
`;

export const StepText = styled.span`
  display: grid;
  gap: 3px;

  strong {
    font-size: 14px;
  }

  span {
    color: ${({ theme }) => theme.colors.gray70};
    font-size: 13px;
    line-height: 1.45;
  }

  font-size: 14px;
`;
