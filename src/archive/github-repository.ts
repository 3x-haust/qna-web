import { z } from "zod";

type RepositoryConfig = {
  owner: string;
  repo: string;
  token: string;
};

type ResolvedRepository = {
  owner: string;
  repo: string;
};

const userSchema = z.object({ login: z.string().min(1) });

function headers(token: string): Headers {
  return new Headers({
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
  });
}

export async function ensureGitHubArchiveRepository(
  config: RepositoryConfig,
  github: typeof fetch = fetch,
): Promise<ResolvedRepository> {
  if (!config.token) throw new Error("GITDB_GITHUB_TOKEN이 필요합니다");

  const requestHeaders = headers(config.token);
  const userResponse = await github("https://api.github.com/user", {
    headers: requestHeaders,
    cache: "no-store",
  });
  if (!userResponse.ok) throw new Error("GitHub 사용자를 확인하지 못했습니다");

  const authenticatedOwner = userSchema.parse(await userResponse.json()).login;
  const owner = config.owner || authenticatedOwner;
  const repo = config.repo || "qna-archive";
  const repositoryUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const repositoryResponse = await github(repositoryUrl, {
    headers: requestHeaders,
    cache: "no-store",
  });

  if (repositoryResponse.ok) return { owner, repo };
  if (repositoryResponse.status !== 404) {
    throw new Error("GitDB GitHub 저장소를 확인하지 못했습니다");
  }

  const creationUrl =
    owner.toLowerCase() === authenticatedOwner.toLowerCase()
      ? "https://api.github.com/user/repos"
      : `https://api.github.com/orgs/${encodeURIComponent(owner)}/repos`;
  const creationResponse = await github(creationUrl, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      name: repo,
      private: false,
      auto_init: true,
      description: "Public plaintext QnA session archives managed by GitDB",
    }),
    cache: "no-store",
  });
  if (creationResponse.status === 403) {
    throw new Error("GitHub 저장소를 만들 권한이 없습니다");
  }
  if (!creationResponse.ok) {
    throw new Error("GitDB GitHub 저장소를 만들지 못했습니다");
  }
  return { owner, repo };
}
