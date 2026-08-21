import "server-only";

import { GitDbEngine } from "@3xhaust/gitdb";

import type { ArchiveWriter } from "@/archive/archive";
import { GitHubPlaintextStore } from "@/archive/github-plaintext-store";
import { ensureGitHubArchiveRepository } from "@/archive/github-repository";

type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
  prefix: string;
  token: string;
};

function sql(value: string): string {
  return value.replaceAll("'", "''");
}

export function createGitDbArchiveWriter(config: GitHubConfig): ArchiveWriter {
  return async ({ sessionId, payload }) => {
    const repository = await ensureGitHubArchiveRepository(config);
    const store = new GitHubPlaintextStore({
      owner: repository.owner,
      repo: repository.repo,
      branch: config.branch,
      prefix: config.prefix,
      token: config.token,
    });
    const database = await GitDbEngine.open({ store, durability: "sync" });
    await database.execute(
      "CREATE TABLE IF NOT EXISTS session_archives (session_id STRING, payload_json STRING)",
    );
    await database.execute(
      `INSERT INTO session_archives (session_id, payload_json) VALUES ('${sql(sessionId)}', '${sql(payload)}')`,
    );
    await store.writeArchiveRecord(sessionId, payload);
  };
}
