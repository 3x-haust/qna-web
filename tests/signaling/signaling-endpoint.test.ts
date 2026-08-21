import { describe, expect, it } from "vitest";

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
});
