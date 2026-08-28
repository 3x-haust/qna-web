import {
  handleArchiveReadRequest,
  handleArchiveRequest,
} from "@/archive/archive-endpoint";
import {
  archiveConfigFromEnv,
  resolveArchiveConfigOwner,
} from "@/archive/gitdb-config";
import { createGitDbArchiveReader } from "@/archive/gitdb-reader";
import { createGitDbArchiveWriter } from "@/archive/gitdb-writer";
import {
  authenticateMirimRequest,
  MirimAuthenticationError,
} from "@/auth/mirim-principal";
import { after } from "next/server";

export async function POST(request: Request): Promise<Response> {
  try {
    const principal = await authenticateMirimRequest(request);
    const record = await request.json();
    const config = await resolveArchiveConfigOwner(archiveConfigFromEnv());
    return handleArchiveRequest(
      record,
      createGitDbArchiveWriter(config),
      after,
      principal,
    );
  } catch (error) {
    return authenticationError(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const principal = await authenticateMirimRequest(request);
    const config = await resolveArchiveConfigOwner(archiveConfigFromEnv());
    return handleArchiveReadRequest(
      new URL(request.url),
      createGitDbArchiveReader(config),
      principal,
    );
  } catch (error) {
    return authenticationError(error);
  }
}

function authenticationError(error: unknown): Response {
  if (error instanceof MirimAuthenticationError) {
    return Response.json({ message: error.message }, { status: 401 });
  }
  throw error;
}
