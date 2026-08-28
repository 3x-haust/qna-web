import { describe, expect, it, vi } from "vitest";

import {
  deriveTokenEncryptionKey,
  resolveArchiveConfigOwner,
  resolveArchiveLocation,
} from "@/archive/gitdb-config";

const baseConfig = {
  owner: "3x-haust",
  repo: "qna",
  privateRepo: "qna-private",
  branch: "main",
  token: "github-token",
};

describe("GitDB archive mode configuration", () => {
  it.each([
    [
      { visibility: "public", encryption: "plain" },
      { repo: "qna", prefix: "gitdb/archive-plain/v2" },
    ],
    [
      { visibility: "public", encryption: "encrypted" },
      { repo: "qna", prefix: "gitdb/archive-encrypted/v2" },
    ],
    [
      { visibility: "private", encryption: "plain" },
      { repo: "qna-private", prefix: "gitdb/archive-plain/v2" },
    ],
    [
      { visibility: "private", encryption: "encrypted" },
      { repo: "qna-private", prefix: "gitdb/archive-encrypted/v2" },
    ],
  ] as const)("resolves %o to an isolated repository prefix", (settings, expected) => {
    expect(resolveArchiveLocation(baseConfig, settings)).toMatchObject(expected);
  });

  it("derives a stable AES-256 key from the GitHub token", () => {
    const first = deriveTokenEncryptionKey("github-token");
    const second = deriveTokenEncryptionKey("github-token");
    const different = deriveTokenEncryptionKey("other-token");

    expect(Buffer.from(first, "base64url")).toHaveLength(32);
    expect(second).toBe(first);
    expect(different).not.toBe(first);
  });

  it("resolves a blank owner from the authenticated GitHub token", async () => {
    const github = vi
      .fn()
      .mockResolvedValue(Response.json({ login: "3x-haust" }));

    await expect(
      resolveArchiveConfigOwner({ ...baseConfig, owner: "" }, github),
    ).resolves.toMatchObject({ owner: "3x-haust" });
  });
});
