import styled, { createGlobalStyle } from "styled-components";

import { PrimaryButton } from "@/ui/primitives";

export const ComposerMotionStyles = createGlobalStyle`
  ::view-transition-group(question-composer-shell),
  ::view-transition-group(question-composer-input),
  ::view-transition-group(question-composer-submit),
  ::view-transition-group(question-composer-count),
  ::view-transition-group(question-composer-identity),
  ::view-transition-group(question-sort-tabs),
  ::view-transition-group(question-feed-content) {
    animation-duration: 320ms;
    animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }

  ::view-transition-old(question-composer-shell),
  ::view-transition-new(question-composer-shell),
  ::view-transition-old(question-composer-input),
  ::view-transition-new(question-composer-input),
  ::view-transition-old(question-composer-submit),
  ::view-transition-new(question-composer-submit),
  ::view-transition-old(question-composer-count),
  ::view-transition-new(question-composer-count),
  ::view-transition-old(question-composer-identity),
  ::view-transition-new(question-composer-identity),
  ::view-transition-old(question-sort-tabs),
  ::view-transition-new(question-sort-tabs),
  ::view-transition-old(question-feed-content),
  ::view-transition-new(question-feed-content) {
    height: 100%;
    mix-blend-mode: normal;
  }

  ::view-transition-old(question-composer-shell),
  ::view-transition-old(question-composer-input),
  ::view-transition-old(question-composer-submit) {
    animation: none;
    opacity: 0;
  }

  ::view-transition-new(question-composer-shell),
  ::view-transition-new(question-composer-input),
  ::view-transition-new(question-composer-submit) {
    animation: none;
    opacity: 1;
  }

  ::view-transition-old(question-composer-count),
  ::view-transition-old(question-composer-identity) {
    animation: qna-composer-fade-out 100ms ease-out both;
  }

  ::view-transition-new(question-composer-count),
  ::view-transition-new(question-composer-identity) {
    animation: qna-composer-fade-in 180ms 60ms ease-out both;
  }

  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
    mix-blend-mode: normal;
  }

  @media (prefers-reduced-motion: reduce) {
    ::view-transition-group(question-composer-shell),
    ::view-transition-group(question-composer-input),
    ::view-transition-group(question-composer-submit),
    ::view-transition-group(question-composer-count),
    ::view-transition-group(question-composer-identity),
    ::view-transition-group(question-sort-tabs),
    ::view-transition-group(question-feed-content) {
      animation-duration: 0.01ms;
    }
  }

  @keyframes qna-composer-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes qna-composer-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;

export const Feed = styled.section`
  display: grid;
  width: min(808px, 100%);
  margin: 32px auto 0;
  gap: 20px;
`;

export const ComposerSurface = styled.span`
  view-transition-name: question-composer-shell;
  position: absolute;
  z-index: 0;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
  pointer-events: none;
  inset: 0;
`;

export const Composer = styled.form<{ $expanded: boolean }>`
  position: relative;
  display: flex;
  height: ${({ $expanded }) => ($expanded ? "auto" : "98px")};
  min-height: ${({ $expanded }) => ($expanded ? "248px" : "98px")};
  flex-direction: ${({ $expanded }) => ($expanded ? "column" : "row")};
  align-items: ${({ $expanded }) => ($expanded ? "stretch" : "center")};
  justify-content: space-between;
  padding: 28px 40px;
  border-radius: ${({ theme }) => theme.radius.panel};
  gap: ${({ $expanded }) => ($expanded ? "18px" : "24px")};

  textarea {
    view-transition-name: question-composer-input;
    position: relative;
    z-index: 1;
    height: ${({ $expanded }) => ($expanded ? "72px" : "24px")};
    min-height: ${({ $expanded }) =>
      $expanded ? "72px !important" : "24px !important"};
    flex: ${({ $expanded }) => ($expanded ? "0 0 auto" : "1 1 auto")};
    padding: 0;
    overflow: hidden;
    resize: none;
    border: 0;
    line-height: 1.55;
    outline: none;

    &:focus-visible {
      outline: none !important;
      box-shadow: none;
    }
  }

  button[type="submit"] {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  &:focus-within {
    ${ComposerSurface} {
      border-color: ${({ theme }) => theme.colors.accent};
      box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.accent};
    }
  }

  @media (max-width: 640px) {
    padding: 24px;
  }
`;

export const CharacterCount = styled.span<{ $over: boolean }>`
  view-transition-name: question-composer-count;
  position: relative;
  z-index: 1;
  align-self: flex-end;
  color: ${({ $over, theme }) =>
    $over ? theme.colors.error : theme.colors.white};
  font-size: 14px;
`;

export const ComposerFooter = styled.div<{ $expanded: boolean }>`
  position: relative;
  z-index: 1;
  display: flex;
  width: ${({ $expanded }) => ($expanded ? "100%" : "auto")};
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

export const IdentityToggle = styled.div`
  view-transition-name: question-composer-identity;
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.gray70};
  font-size: 14px;
  gap: 4px;
`;

export const ComposerSubmit = styled(PrimaryButton)`
  view-transition-name: question-composer-submit;
`;

export const IdentityButton = styled.button<{ $active: boolean }>`
  padding: 4px;
  background: transparent;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.white : theme.colors.gray70};
  font-size: ${({ $active }) => ($active ? "16px" : "14px")};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
`;

export const SortTabs = styled.div`
  view-transition-name: question-sort-tabs;
  display: flex;
  align-items: center;
`;

export const SortTab = styled.button<{ $active: boolean }>`
  padding: 16px;
  background: transparent;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.accent : theme.colors.white};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 600)};
`;

export const QuestionList = styled.div`
  view-transition-name: question-feed-content;
  display: grid;
  gap: 12px;
`;

export const QuestionCard = styled.article`
  display: grid;
  padding: 18px 22px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
  gap: 22px;
`;

export const CardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

export const Author = styled.div`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
`;

export const Avatar = styled.span`
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.gray400};
`;

export const AuthorMeta = styled.span`
  display: grid;

  strong {
    font-size: 14px;
    font-weight: 600;
  }

  small {
    color: ${({ theme }) => theme.colors.gray70};
    font-size: 12px;
  }
`;

export const Vote = styled.button<{ $active: boolean; $interactive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.gray500};
  color: ${({ theme }) => theme.colors.white};
  cursor: ${({ $interactive }) => ($interactive ? "pointer" : "default")};
  font-size: 14px;
`;

export const QuestionText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.white};
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
`;

export const EmptyState = styled.div`
  view-transition-name: question-feed-content;
  display: grid;
  min-height: 220px;
  place-items: center;
  color: ${({ theme }) => theme.colors.gray70};
  text-align: center;

  strong {
    display: block;
    margin-bottom: 8px;
    font-size: 20px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
`;
