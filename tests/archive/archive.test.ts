import { describe, expect, it, vi } from "vitest";

import { archiveEndedSession } from "@/archive/archive";
import { createSession } from "@/domain/session";

describe("ended-only GitDB archival", () => {
  it("never calls the writer for an active session", async () => {
    const writer = vi.fn();
    const active = createSession("session-1", "teacher-1", "분수의 덧셈");

    await expect(archiveEndedSession(active, writer)).rejects.toThrow("종료된 질의만");
    expect(writer).not.toHaveBeenCalled();
  });

  it("writes one canonical archive after the session ends", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const ended = {
      ...createSession("session-1", "teacher-1", "분수의 덧셈"),
      phase: "ended" as const,
      endedAt: "2026-08-21T00:00:00.000Z",
    };

    await archiveEndedSession(ended, writer);

    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          id: "session-1",
          title: "분수의 덧셈",
        }),
      }),
    );
  });
});
