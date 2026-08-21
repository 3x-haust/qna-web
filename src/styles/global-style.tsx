"use client";

import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body {
    min-height: 100%;
  }

  body {
    margin: 0;
    background: ${({ theme }) => theme.colors.gray600};
    color: ${({ theme }) => theme.colors.white};
    font-family: var(--font-korean), sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  button,
  input,
  textarea {
    color: inherit;
    font: inherit;
  }

  button,
  a {
    -webkit-tap-highlight-color: transparent;
  }

  button {
    border: 0;
    cursor: pointer;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.white};
    outline-offset: 3px;
  }
`;
