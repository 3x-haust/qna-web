import { beforeEach, describe, expect, it, vi } from "vitest";

import { queueArchiveSession } from "@/archive/archive-client";
import { createSession, endSession } from "@/domain/session";

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
  });
  window.localStorage.setItem(
    "mirim_oauth_tokens",
    JSON.stringify({ access_token: "teacher-access-token" }),
  );
});

describe("archive request transport", () => {
  it("does not use the browser keepalive body limit for large sessions", () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(new Promise(() => undefined));
    const session = endSession(
      {
        ...createSession("session-1", "teacher-42", "프로그래밍"),
        processedCommandIds: Array.from(
          { length: 5_000 },
          (_, index) => `command-${index.toString().padStart(5, "0")}`,
        ),
      },
      "2026-08-28T01:00:00.000Z",
    );

    queueArchiveSession({
      session,
      teacher: {
        id: "teacher-42",
        nickname: "김미림 선생님",
        email: "teacher@e-mirim.hs.kr",
      },
      settings: { visibility: "private", encryption: "encrypted" },
      questionAuthors: {},
    });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Blob([String(init?.body)]).size).toBeGreaterThan(65_536);
    expect(init?.keepalive).not.toBe(true);
  });
});
