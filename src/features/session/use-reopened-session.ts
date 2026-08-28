"use client";

import { useEffect, useRef } from "react";

import { useReopenRetry } from "@/features/session/use-reopen-retry";

export function useReopenedSession({
  consume,
  enabled,
  onError,
  start,
}: {
  readonly consume: () => void;
  readonly enabled: boolean;
  readonly onError: (message: string) => void;
  readonly start: () => Promise<void>;
}): (() => void) | undefined {
  const started = useRef(false);
  const startRef = useRef(start);
  const consumeRef = useRef(consume);
  const errorRef = useRef(onError);
  const {
    attempt,
    failed,
    markConnected,
    markFailed,
    retry,
  } = useReopenRetry();

  useEffect(() => {
    startRef.current = start;
    consumeRef.current = consume;
    errorRef.current = onError;
  });

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void startRef.current()
      .then(() => {
        consumeRef.current();
        markConnected();
      })
      .catch((reason: unknown) => {
        started.current = false;
        markFailed();
        console.error("다시 연 세션 연결을 시작하지 못했습니다", reason);
        errorRef.current("다시 연 세션 연결을 시작하지 못했습니다");
      });
  }, [attempt, enabled, markConnected, markFailed]);

  return failed
    ? () => {
        onError("");
        retry();
      }
    : undefined;
}
