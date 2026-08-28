"use client";

import styled from "styled-components";
import Link from "next/link";

import { PrimaryButton } from "@/ui/primitives";

export const ArchiveContent = styled.section`
  width: min(1172px, calc(100% - 40px));
  margin: 72px auto 96px;
`;

export const ArchiveHeading = styled.header`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;

  h1 {
    margin: 0 0 8px;
    font-size: 30px;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.gray70};
    word-break: keep-all;
  }
`;

export const HomeLink = styled(Link)`
  display: inline-flex;
  min-height: 44px;
  flex: 0 0 auto;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.control};
  color: ${({ theme }) => theme.colors.white};
  font-size: 14px;
  white-space: nowrap;
`;

export const ArchiveGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: start;
  gap: 20px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const ArchiveList = styled.div`
  display: grid;
  gap: 12px;
`;

export const ArchiveCard = styled.article<{ $selected?: boolean }>`
  display: grid;
  padding: 20px;
  border: 1px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.accent : theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: ${({ theme }) => theme.colors.gray500};
  gap: 16px;

  h2 {
    margin: 0 0 6px;
    font-size: 18px;
  }
`;

export const ArchiveMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: ${({ theme }) => theme.colors.gray70};
  font-size: 13px;
`;

export const SelectedBadge = styled.span`
  width: fit-content;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-size: 11px;
  font-weight: 700;
`;

export const ArchiveActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const SecondaryButton = styled(PrimaryButton)`
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  background: transparent;
`;

export const ArchiveDetailPanel = styled.section`
  position: sticky;
  top: 24px;
  min-height: 320px;
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
  background: ${({ theme }) => theme.colors.gray500};

  h2 {
    margin: 0 0 8px;
    font-size: 22px;
  }

  @media (max-width: 820px) {
    position: static;
  }
`;

export const DetailTeacher = styled.p`
  margin: 0 0 22px;
  color: ${({ theme }) => theme.colors.gray70};
  font-size: 13px;
`;

export const ArchivedQuestions = styled.div`
  display: grid;
  gap: 10px;
`;

export const ArchivedQuestion = styled.article`
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.control};

  strong {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
  }

  p {
    margin: 0;
    line-height: 1.55;
  }

  small {
    display: block;
    margin-top: 10px;
    color: ${({ theme }) => theme.colors.gray70};
  }
`;

export const ArchiveEmpty = styled.div`
  display: grid;
  min-height: 220px;
  place-items: center;
  padding: 32px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
  color: ${({ theme }) => theme.colors.gray70};
  text-align: center;
  word-break: keep-all;
`;

export const ArchiveError = styled.p`
  color: ${({ theme }) => theme.colors.error};
`;
