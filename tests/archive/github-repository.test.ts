import { describe, expect, it, vi } from "vitest";

import { ensureGitHubArchiveRepository } from "@/archive/github-repository";

describe("GitDB archive repository provisioning", () => {
  it("creates a private archive repository when it is missing", async () => {
    const github = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ login: "teacher" }))
      .mockResolvedValueOnce(Response.json({ message: "Not Found" }, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json(
          { owner: { login: "teacher" }, name: "qna-archive" },
          { status: 201 },
        ),
      );

    const repository = await ensureGitHubArchiveRepository(
      { owner: "", repo: "qna-archive", token: "token" },
      github,
    );

    expect(repository).toEqual({ owner: "teacher", repo: "qna-archive" });
    expect(github).toHaveBeenLastCalledWith(
      "https://api.github.com/user/repos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "qna-archive",
          private: true,
          auto_init: true,
          description: "Encrypted QnA session archives managed by GitDB",
        }),
      }),
    );
  });

  it("keeps an existing archive repository", async () => {
    const github = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ login: "teacher" }))
      .mockResolvedValueOnce(Response.json({ name: "qna-archive" }));

    const repository = await ensureGitHubArchiveRepository(
      { owner: "teacher", repo: "qna-archive", token: "token" },
      github,
    );

    expect(repository).toEqual({ owner: "teacher", repo: "qna-archive" });
    expect(github).toHaveBeenCalledTimes(2);
  });

  it("surfaces repository creation permission failures", async () => {
    const github = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ login: "teacher" }))
      .mockResolvedValueOnce(Response.json({ message: "Not Found" }, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json({ message: "Resource not accessible" }, { status: 403 }),
      );

    await expect(
      ensureGitHubArchiveRepository(
        { owner: "", repo: "qna-archive", token: "token" },
        github,
      ),
    ).rejects.toThrow("GitHub 저장소를 만들 권한이 없습니다");
  });
});
