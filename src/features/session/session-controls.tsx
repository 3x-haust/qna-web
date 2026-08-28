"use client";

import styled from "styled-components";

import { Field } from "@/ui/primitives";

export const StudioShell = styled.main`
  min-height: 100dvh;
  padding: 48px 24px 96px;
  background: ${({ theme }) => theme.colors.gray600};
`;

export const Studio = styled.section`
  width: min(920px, 100%);
  margin: 0 auto;

  h1 {
    margin: 0 0 8px;
    font-size: 28px;
  }
`;

export const Muted = styled.p`
  margin: 0 0 28px;
  color: ${({ theme }) => theme.colors.gray70};
  overflow-wrap: break-word;
  word-break: keep-all;
`;

export const Panel = styled.section`
  display: grid;
  margin-top: 20px;
  gap: 16px;
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
`;

export const SessionToolbar = styled.div`
  display: flex;
  margin-top: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  p {
    margin: 6px 0 0;
    color: ${({ theme }) => theme.colors.gray70};
    font-size: 14px;
  }

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const SessionActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;

  @media (max-width: 640px) {
    > button {
      flex: 1;
    }
  }
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  > :first-child {
    flex: 1;
  }

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const Label = styled.label`
  display: grid;
  gap: 8px;
  color: ${({ theme }) => theme.colors.gray70};
  font-size: 13px;
`;

export const CodeField = styled(Field)`
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

export const Status = styled.span<{ $connected?: boolean }>`
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 8px;
  color: ${({ $connected, theme }) =>
    $connected ? theme.colors.accent : theme.colors.gray70};
  font-size: 14px;

  &::before {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    content: "";
  }
`;

export const ErrorText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.error};
  font-size: 13px;
`;

export const Question = styled.article`
  padding: 18px 22px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};

  h2 {
    margin: 0 0 12px;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: ${({ theme }) => theme.colors.gray70};
  }
`;

export const Dialog = styled.dialog`
  position: static;
  width: min(480px, calc(100% - 40px));
  margin: 0;
  padding: 28px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: ${({ theme }) => theme.colors.gray600};
  color: ${({ theme }) => theme.colors.white};

  h2 {
    margin-top: 0;
  }
`;

export const DialogOverlay = styled.div`
  position: fixed;
  z-index: 20;
  display: grid;
  inset: 0;
  place-items: center;
  padding: 20px;
  background: color-mix(in srgb, black 62%, transparent);
`;

export const DialogActions = styled.div`
  display: flex;
  margin-top: 20px;
  justify-content: flex-end;
  gap: 10px;
`;

export const Toast = styled.p`
  position: fixed;
  z-index: 30;
  right: 50%;
  bottom: 32px;
  margin: 0;
  padding: 14px 18px;
  transform: translateX(50%);
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.colors.gray500};
  box-shadow: 0 12px 36px color-mix(in srgb, black 28%, transparent);
  color: ${({ theme }) => theme.colors.white};
  font-size: 14px;
  font-weight: 600;
`;
