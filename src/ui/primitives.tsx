"use client";

import styled from "styled-components";

export const AppShell = styled.main`
  min-height: 100dvh;
  overflow-x: hidden;
  background: ${({ theme }) => theme.colors.gray600};
`;

export const PrimaryButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.control};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-size: 14px;
  line-height: 1;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const Field = styled.input`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.control};
  padding: 14px 16px;
  background: transparent;

  &::placeholder {
    color: ${({ theme }) => theme.colors.gray70};
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 112px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.control};
  padding: 14px 16px;
  background: transparent;

  &::placeholder {
    color: ${({ theme }) => theme.colors.gray70};
  }
`;

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`;
