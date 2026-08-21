import { handleArchiveRequest } from "@/archive/archive-endpoint";
import { createGitDbArchiveWriter } from "@/archive/gitdb-writer";
import { after } from "next/server";

export async function POST(request: Request): Promise<Response> {
  const session = await request.json();
  const writer = createGitDbArchiveWriter({
    owner: process.env.GITDB_GITHUB_OWNER ?? "",
    repo: process.env.GITDB_GITHUB_REPO ?? "qna-archive",
    branch: process.env.GITDB_GITHUB_BRANCH ?? "main",
    prefix: process.env.GITDB_GITHUB_PREFIX ?? "gitdb/v1",
    token: process.env.GITDB_GITHUB_TOKEN ?? "",
  });
  return handleArchiveRequest(session, writer, after);
}
