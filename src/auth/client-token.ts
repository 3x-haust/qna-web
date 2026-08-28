"use client";

import { z } from "zod";

const tokensSchema = z.object({ access_token: z.string().min(1) });

export function mirimAuthorizationHeaders(): Headers {
  const raw = window.localStorage.getItem("mirim_oauth_tokens");
  let stored: unknown = null;
  if (raw) {
    try {
      stored = JSON.parse(raw);
    } catch {
      throw new Error("로그인 정보가 올바르지 않습니다");
    }
  }
  const parsed = tokensSchema.safeParse(stored);
  if (!parsed?.success) throw new Error("로그인이 필요합니다");
  return new Headers({ authorization: `Bearer ${parsed.data.access_token}` });
}
