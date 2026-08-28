import { createHash } from "node:crypto";

import {
  createAesGcmCipher,
  GitHubEncryptedStore,
  type GitDbStore,
} from "@3xhaust/gitdb";

import type { ArchiveSettings } from "@/archive/archive-rows";
import { GitHubPlaintextStore } from "@/archive/github-plaintext-store";
import { z } from "zod";

export type GitDbArchiveConfig = {
  readonly owner: string;
  readonly repo: string;
  readonly privateRepo: string;
  readonly branch: string;
  readonly token: string;
  readonly plainPrefix?: string;
  readonly encryptedPrefix?: string;
  readonly legacyPrefix?: string;
};

export type ArchiveLocation = {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  readonly prefix: string;
  readonly token: string;
  readonly settings: ArchiveSettings;
};

export function deriveTokenEncryptionKey(token: string): string {
  if (!token) throw new Error("GITDB_GITHUB_TOKEN이 필요합니다");
  return createHash("sha256").update(token).digest("base64url");
}

export function resolveArchiveLocation(
  config: GitDbArchiveConfig,
  settings: ArchiveSettings,
): ArchiveLocation {
  return {
    owner: config.owner,
    repo: settings.visibility === "private" ? config.privateRepo : config.repo,
    branch: config.branch,
    prefix:
      settings.encryption === "encrypted"
        ? (config.encryptedPrefix ?? "gitdb/archive-encrypted/v2")
        : (config.plainPrefix ?? "gitdb/archive-plain/v2"),
    token: config.token,
    settings,
  };
}

export function createArchiveStore(location: ArchiveLocation): GitDbStore {
  const github = {
    owner: location.owner,
    repo: location.repo,
    branch: location.branch,
    prefix: location.prefix,
    token: location.token,
  };
  return location.settings.encryption === "encrypted"
    ? new GitHubEncryptedStore(
        github,
        createAesGcmCipher(deriveTokenEncryptionKey(location.token)),
      )
    : new GitHubPlaintextStore(github);
}

export function archiveConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): GitDbArchiveConfig {
  const repo = env.GITDB_GITHUB_REPO ?? "qna-archive";
  return {
    owner: env.GITDB_GITHUB_OWNER ?? "",
    repo,
    privateRepo: env.GITDB_GITHUB_PRIVATE_REPO ?? `${repo}-private`,
    branch: env.GITDB_GITHUB_BRANCH ?? "main",
    token: env.GITDB_GITHUB_TOKEN ?? "",
    plainPrefix: env.GITDB_GITHUB_PLAIN_PREFIX,
    encryptedPrefix: env.GITDB_GITHUB_ENCRYPTED_PREFIX,
    legacyPrefix: env.GITDB_GITHUB_PREFIX ?? "gitdb/v1",
  };
}

export async function resolveArchiveConfigOwner(
  config: GitDbArchiveConfig,
  github: typeof fetch = fetch,
): Promise<GitDbArchiveConfig> {
  if (config.owner) return config;
  const response = await github("https://api.github.com/user", {
    headers: githubHeaders(config.token),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("GitHub 사용자를 확인하지 못했습니다");
  const owner = z
    .object({ login: z.string().min(1) })
    .parse(await response.json()).login;
  return { ...config, owner };
}

export async function archiveLocationExists(
  location: ArchiveLocation,
  github: typeof fetch = fetch,
): Promise<boolean> {
  const manifest =
    location.settings.encryption === "encrypted"
      ? "manifest.enc"
      : "manifest.json";
  const path = [location.prefix, manifest]
    .join("/")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const response = await github(
    `https://api.github.com/repos/${encodeURIComponent(location.owner)}/${encodeURIComponent(location.repo)}/contents/${path}?ref=${encodeURIComponent(location.branch)}`,
    { headers: githubHeaders(location.token), cache: "no-store" },
  );
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("GitDB 저장 위치를 확인하지 못했습니다");
  return true;
}

function githubHeaders(token: string): Headers {
  return new Headers({
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
  });
}
