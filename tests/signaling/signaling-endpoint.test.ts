import { describe, expect, it } from "vitest";

import { createSession } from "@/domain/session";
import { handleSignalingRequest } from "@/signaling/signaling-endpoint";

describe("signaling route cancellation", () => {
  it("treats a disconnected long-poll client as a normal empty response", async () => {
    const created = await handleSignalingRequest(
      new Request("http://localhost/api/signaling/sessions", {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["sessions"] }) },
    );
    const session = await created.json();
    if (
      typeof session !== "object" ||
      session === null ||
      !("code" in session) ||
      !("hostToken" in session) ||
      typeof session.code !== "string" ||
      typeof session.hostToken !== "string"
    ) {
      throw new Error("signaling session response is malformed");
    }
    const controller = new AbortController();
    const waiting = handleSignalingRequest(
      new Request(
        `http://localhost/api/signaling/sessions/${session.code}/joins/next?hostToken=${session.hostToken}`,
        { signal: controller.signal },
      ),
      {
        params: Promise.resolve({
          path: ["sessions", session.code, "joins", "next"],
        }),
      },
    );

    controller.abort();

    await expect(waiting).resolves.toMatchObject({ status: 204 });
  });

  it("relays commands and snapshots through authenticated HTTP routes", async () => {
    const created = await handleSignalingRequest(
      new Request("http://localhost/api/signaling/sessions", {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ path: ["sessions"] }) },
    );
    const session = await created.json();
    if (
      typeof session !== "object" ||
      session === null ||
      !("code" in session) ||
      !("hostToken" in session) ||
      typeof session.code !== "string" ||
      typeof session.hostToken !== "string"
    ) {
      throw new Error("signaling session response is malformed");
    }
    const joined = await handleSignalingRequest(
      new Request(
        `http://localhost/api/signaling/sessions/${session.code}/joins`,
        { method: "POST", body: "{}" },
      ),
      {
        params: Promise.resolve({
          path: ["sessions", session.code, "joins"],
        }),
      },
    );
    const join = await joined.json();
    if (
      typeof join !== "object" ||
      join === null ||
      !("id" in join) ||
      !("joinToken" in join) ||
      typeof join.id !== "string" ||
      typeof join.joinToken !== "string"
    ) {
      throw new Error("join response is malformed");
    }
    const command = {
      commandId: "command-1",
      kind: "question.submit",
      text: "HTTP 질문",
      anonymous: true,
      authorName: "익명",
    };
    const waitingCommand = handleSignalingRequest(
      new Request(
        `http://localhost/api/signaling/sessions/${session.code}/joins/${join.id}/command?hostToken=${session.hostToken}`,
      ),
      {
        params: Promise.resolve({
          path: ["sessions", session.code, "joins", join.id, "command"],
        }),
      },
    );
    const publishedCommand = await handleSignalingRequest(
      new Request(
        `http://localhost/api/signaling/sessions/${session.code}/joins/${join.id}/command`,
        {
          method: "POST",
          body: JSON.stringify({ joinToken: join.joinToken, command }),
        },
      ),
      {
        params: Promise.resolve({
          path: ["sessions", session.code, "joins", join.id, "command"],
        }),
      },
    );

    expect(publishedCommand.status).toBe(200);
    await expect((await waitingCommand).json()).resolves.toEqual({ command });

    const namedWaiting = handleSignalingRequest(
      new Request(
        `http://localhost/api/signaling/sessions/${session.code}/joins/${join.id}/command?hostToken=${session.hostToken}`,
      ),
      {
        params: Promise.resolve({
          path: ["sessions", session.code, "joins", join.id, "command"],
        }),
      },
    );
    const namedPublished = await handleSignalingRequest(
      new Request(
        `http://localhost/api/signaling/sessions/${session.code}/joins/${join.id}/command`,
        {
          method: "POST",
          headers: { authorization: "Bearer student-token" },
          body: JSON.stringify({
            joinToken: join.joinToken,
            command: {
              commandId: "command-2",
              kind: "question.submit",
              text: "실명 질문",
              anonymous: false,
              authorName: "위조 이름",
            },
          }),
        },
      ),
      {
        params: Promise.resolve({
          path: ["sessions", session.code, "joins", join.id, "command"],
        }),
      },
      async () => ({
        id: "student-1",
        nickname: "김학생",
        email: "student@e-mirim.hs.kr",
        role: "STUDENT",
      }),
    );

    expect(namedPublished.status).toBe(200);
    await expect((await namedWaiting).json()).resolves.toEqual({
      command: {
        commandId: "command-2",
        kind: "question.submit",
        text: "실명 질문",
        anonymous: false,
        authorName: "김학생",
        authorId: "student-1",
        authorEmail: "student@e-mirim.hs.kr",
      },
    });

    const snapshot = createSession("session-1", "teacher", "HTTP relay");
    const waitingSnapshot = handleSignalingRequest(
      new Request(
        `http://localhost/api/signaling/sessions/${session.code}/joins/${join.id}/snapshot?joinToken=${join.joinToken}`,
      ),
      {
        params: Promise.resolve({
          path: ["sessions", session.code, "joins", join.id, "snapshot"],
        }),
      },
    );
    const publishedSnapshot = await handleSignalingRequest(
      new Request(
        `http://localhost/api/signaling/sessions/${session.code}/joins/${join.id}/snapshot`,
        {
          method: "POST",
          body: JSON.stringify({ hostToken: session.hostToken, snapshot }),
        },
      ),
      {
        params: Promise.resolve({
          path: ["sessions", session.code, "joins", join.id, "snapshot"],
        }),
      },
    );

    expect(publishedSnapshot.status).toBe(200);
    await expect((await waitingSnapshot).json()).resolves.toEqual({ snapshot });
  });
});
