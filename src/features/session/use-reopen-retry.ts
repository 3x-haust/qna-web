"use client";

import { useCallback, useState } from "react";

export function useReopenRetry() {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const markConnected = useCallback(() => setFailed(false), []);
  const markFailed = useCallback(() => setFailed(true), []);
  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((current) => current + 1);
  }, []);
  return {
    attempt,
    failed,
    markConnected,
    markFailed,
    retry,
  };
}
