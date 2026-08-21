import { describe, expect, it, vi } from "vitest";

import { handleArchiveRequest } from "@/archive/archive-endpoint";
import { createSession, endSession } from "@/domain/session";

describe("server-side archive boundary", () => {
  it("rejects active sessions before GitHub access", async () => {
    const writer = vi.fn();
    const response = await handleArchiveRequest(
      createSession("session-1", "teacher-1", "분수의 덧셈"),
      writer,
    );

    expect(response.status).toBe(400);
    expect(writer).not.toHaveBeenCalled();
  });

  it("writes an ended session through the server writer", async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const response = await handleArchiveRequest(
      endSession(createSession("session-1", "teacher-1", "분수의 덧셈")),
      writer,
    );

    expect(response.status).toBe(200);
    expect(writer).toHaveBeenCalledTimes(1);
  });
});
