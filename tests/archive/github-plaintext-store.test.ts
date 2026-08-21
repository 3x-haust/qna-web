import { describe, expect, it, vi } from "vitest";

import { GitHubPlaintextStore } from "@/archive/github-plaintext-store";

const config = {
  owner: "teacher",
  repo: "qna",
  branch: "main",
  prefix: "qna/v1",
  token: "token",
};

describe("plaintext GitDB GitHub store", () => {
  it("writes mutation SQL as readable JSON", async () => {
    const mutation = {
      sequence: 1,
      sql: "INSERT INTO session_archives VALUES ('session-1')",
      at: "2026-08-21T00:00:00.000Z",
    };
    const github = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ message: "Not Found" }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ content: { sha: "created" } }))
      .mockResolvedValueOnce(
        Response.json({
          content: Buffer.from(JSON.stringify(mutation)).toString("base64"),
          sha: "mutation-sha",
        }),
      );
    const store = new GitHubPlaintextStore(config, github);

    const segment = await store.appendMutation(mutation);
    const restored = await store.readMutations([segment]);

    expect(segment).toBe("00000000000000000001");
    expect(github.mock.calls[0]?.[0]).toContain(
      "/qna/v1/log/00000000000000000001.json",
    );
    expect(github.mock.calls[2]?.[0]).toContain(
      "/qna/v1/log/00000000000000000001.json",
    );
    expect(restored).toEqual([mutation]);
    const put = github.mock.calls[1];
    const init = put?.[1];
    if (!init || typeof init.body !== "string") throw new Error("missing GitHub PUT");
    const body = JSON.parse(init.body);
    if (
      typeof body !== "object" ||
      body === null ||
      !("content" in body) ||
      typeof body.content !== "string"
    ) {
      throw new Error("missing plaintext content");
    }
    const decoded = Buffer.from(body.content, "base64").toString("utf8");

    expect(decoded).toContain("INSERT INTO session_archives");
    expect(decoded).not.toContain(".enc");
  });

  it("retries manifest updates with the latest SHA after a conflict", async () => {
    const encodedManifest = Buffer.from(
      JSON.stringify({
        version: 1,
        sequence: 1,
        createdAt: "2026-08-21T00:00:00.000Z",
        updatedAt: "2026-08-21T00:00:00.000Z",
        logSegments: [],
      }),
    ).toString("base64");
    const github = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ content: encodedManifest, sha: "stale-sha" }),
      )
      .mockResolvedValueOnce(Response.json({ message: "Conflict" }, { status: 409 }))
      .mockResolvedValueOnce(
        Response.json({ content: encodedManifest, sha: "latest-sha" }),
      )
      .mockResolvedValueOnce(Response.json({ content: { sha: "updated" } }));
    const store = new GitHubPlaintextStore(config, github);

    await store.writeManifest({
      version: 1,
      sequence: 2,
      createdAt: "2026-08-21T00:00:00.000Z",
      updatedAt: "2026-08-21T00:01:00.000Z",
      logSegments: [],
    });

    const putBodies = github.mock.calls
      .filter((call) => call[1]?.method === "PUT")
      .map((call) => JSON.parse(String(call[1]?.body)));
    expect(putBodies).toHaveLength(2);
    expect(putBodies[0]?.sha).toBe("stale-sha");
    expect(putBodies[1]?.sha).toBe("latest-sha");
  });
});
