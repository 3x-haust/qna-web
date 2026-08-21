import type {
  GitDbManifest,
  GitDbStore,
  PersistedMutation,
} from "@3xhaust/gitdb";
import { z } from "zod";

export type GitHubPlaintextStoreConfig = {
  owner: string;
  repo: string;
  branch: string;
  prefix: string;
  token: string;
};

type GitHubFile = {
  content: string;
  sha: string;
};

type SegmentId = GitDbManifest["logSegments"][number];

const githubFileSchema = z.object({
  content: z.string(),
  sha: z.string().min(1),
});
const mutationSchema = z.object({
  sequence: z.number().int().positive(),
  sql: z.string(),
  at: z.string(),
});
const segmentIdSchema = z.string().min(1).transform((value) => {
  if (isSegmentId(value)) return value;
  throw new Error("GitDB segment id가 올바르지 않습니다");
});
const manifestSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  sequence: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  logSegments: z.array(segmentIdSchema),
  metadata: z
    .object({
      migratedFrom: z.literal(1).optional(),
      storageEngine: z.literal("gitdb"),
    })
    .optional(),
});

export class GitHubPlaintextStore implements GitDbStore {
  constructor(
    private readonly config: GitHubPlaintextStoreConfig,
    private readonly github: typeof fetch = fetch,
  ) {}

  async readManifest(): Promise<GitDbManifest | null> {
    const file = await this.readFile("manifest.json");
    if (!file) return null;
    return manifestSchema.parse(JSON.parse(file.content));
  }

  async writeManifest(manifest: GitDbManifest): Promise<void> {
    await this.writeFile(
      "manifest.json",
      JSON.stringify(manifest, null, 2),
      `gitdb: update manifest to sequence ${manifest.sequence}`,
    );
  }

  async writeArchiveRecord(sessionId: string, payload: string): Promise<void> {
    await this.writeFile(
      `data/session_archives/${sessionId}.json`,
      payload,
      `gitdb: materialize archive ${sessionId}`,
    );
  }

  async appendMutation(mutation: PersistedMutation): Promise<SegmentId> {
    const id = toSegmentId(String(mutation.sequence).padStart(20, "0"));
    await this.writeFile(
      `log/${id}.json`,
      JSON.stringify(mutation, null, 2),
      `gitdb: append mutation ${mutation.sequence}`,
    );
    return id;
  }

  async readMutations(
    segments: readonly SegmentId[],
  ): Promise<readonly PersistedMutation[]> {
    return Promise.all(
      segments.map(async (segment) => {
        const file = await this.readFile(`log/${segment}.json`);
        if (!file) throw new Error(`GitDB mutation을 찾을 수 없습니다: ${segment}`);
        return mutationSchema.parse(JSON.parse(file.content));
      }),
    );
  }

  private async readFile(path: string): Promise<GitHubFile | null> {
    const response = await this.github(this.contentsUrl(path), {
      headers: this.headers(),
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("GitDB 파일을 읽지 못했습니다");
    const file = githubFileSchema.parse(await response.json());
    return {
      sha: file.sha,
      content: Buffer.from(file.content.replaceAll("\n", ""), "base64").toString(
        "utf8",
      ),
    };
  }

  private async writeFile(
    path: string,
    content: string,
    message: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const current = await this.readFile(path);
      const response = await this.github(this.contentsUrl(path), {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify({
          message,
          content: Buffer.from(content, "utf8").toString("base64"),
          branch: this.config.branch,
          ...(current ? { sha: current.sha } : {}),
        }),
        cache: "no-store",
      });
      if (response.ok) return;
      if (response.status === 409 || response.status === 422) continue;
      throw new Error("GitDB 파일을 저장하지 못했습니다");
    }
    throw new Error("GitDB 파일 충돌을 해결하지 못했습니다");
  }

  private contentsUrl(path: string): string {
    const encodedPath = [this.config.prefix, path]
      .join("/")
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `https://api.github.com/repos/${encodeURIComponent(this.config.owner)}/${encodeURIComponent(this.config.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(this.config.branch)}`;
  }

  private headers(): Headers {
    return new Headers({
      accept: "application/vnd.github+json",
      authorization: `Bearer ${this.config.token}`,
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    });
  }
}

function isSegmentId(value: string): value is SegmentId {
  return value.length > 0;
}

function toSegmentId(value: string): SegmentId {
  if (!isSegmentId(value)) throw new Error("GitDB segment id가 비어 있습니다");
  return value;
}
