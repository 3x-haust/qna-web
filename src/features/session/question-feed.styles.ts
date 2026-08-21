import styled from "styled-components";

export const Feed = styled.section`
  display: grid;
  width: min(808px, 100%);
  margin: 32px auto 0;
  gap: 20px;
`;

export const Composer = styled.form<{ $expanded: boolean }>`
  display: flex;
  height: ${({ $expanded }) => ($expanded ? "auto" : "98px")};
  min-height: ${({ $expanded }) => ($expanded ? "248px" : "98px")};
  flex-direction: ${({ $expanded }) => ($expanded ? "column" : "row")};
  align-items: ${({ $expanded }) => ($expanded ? "stretch" : "center")};
  justify-content: space-between;
  padding: 28px 40px;
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  border-radius: ${({ theme }) => theme.radius.panel};
  gap: ${({ $expanded }) => ($expanded ? "18px" : "24px")};

  textarea {
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

  @media (max-width: 640px) {
    padding: 24px;
  }
`;

export const CharacterCount = styled.span<{ $over: boolean }>`
  align-self: flex-end;
  color: ${({ $over, theme }) =>
    $over ? theme.colors.error : theme.colors.white};
  font-size: 14px;
`;

export const ComposerFooter = styled.div<{ $expanded: boolean }>`
  display: flex;
  width: ${({ $expanded }) => ($expanded ? "100%" : "auto")};
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

export const IdentityToggle = styled.div`
  display: inline-flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.gray70};
  font-size: 14px;
  gap: 4px;
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

export const Vote = styled.button<{ $interactive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.gray500};
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
