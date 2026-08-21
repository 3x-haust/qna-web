"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "styled-components";

import { AuthProvider } from "@/auth/auth-provider";
import { GlobalStyle } from "@/styles/global-style";
import { theme } from "@/styles/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
