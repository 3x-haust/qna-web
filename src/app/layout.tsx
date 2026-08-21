import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import { StyledComponentsRegistry } from "@/styles/registry";

export const metadata: Metadata = {
  title: "QnA",
  description: "교사와 학생을 실시간으로 잇는 P2P 질의응답",
};

const koreanFont = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-korean",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={koreanFont.variable}>
      <body>
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
