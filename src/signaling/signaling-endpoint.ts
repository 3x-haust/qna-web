import { z } from "zod";

import {
  relayClientCommandSchema,
  relayCommandSchema,
  sessionStateSchema,
} from "@/signaling/relay-schema";
import {
  authenticateMirimRequest,
  type MirimPrincipal,
} from "@/auth/mirim-principal";
import { signalingStore } from "@/signaling/signaling-store";

const WAIT_TIMEOUT_MS = 25_000;

const emptySchema = z.object({}).strict();
const requestJoinSchema = z.object({ code: z.string().min(1) }).strict();
const hostTokenSchema = z.object({ hostToken: z.string().min(1) }).strict();
const commandRequestSchema = z
  .object({
    joinToken: z.string().min(1),
    command: relayClientCommandSchema,
  })
  .strict();
const snapshotRequestSchema = z
  .object({
    hostToken: z.string().min(1),
    snapshot: sessionStateSchema,
  })
  .strict();

type SignalingRouteContext = {
  params: Promise<{ path?: string[] }>;
};

type WaitSignal = {
  signal: AbortSignal;
  timedOut: () => boolean;
  cleanup: () => void;
};

export async function handleSignalingRequest(
  request: Request,
  context: SignalingRouteContext,
  authenticate: (request: Request) => Promise<MirimPrincipal> =
    authenticateMirimRequest,
): Promise<Response> {
  const { path } = await context.params;
  const segments = path ?? [];
  const [root, code, joinsSegment, joinId, payloadSegment] = segments;

  try {
    if (request.method === "POST" && segments.length === 1 && root === "sessions") {
      emptySchema.parse(await readJson(request));
      return json(signalingStore.createSession());
    }

    if (request.method === "POST" && segments.length === 2 && root === "sessions" && code === "joins") {
      const body = requestJoinSchema.parse(await readJson(request));
      return json(signalingStore.requestJoin(body.code));
    }

    if (
      request.method === "POST" &&
      segments.length === 3 &&
      root === "sessions" &&
      typeof code === "string" &&
      joinsSegment === "joins"
    ) {
      emptySchema.parse(await readJson(request));
      return json(signalingStore.requestJoin(code));
    }

    if (
      request.method === "GET" &&
      segments.length === 4 &&
      root === "sessions" &&
      typeof code === "string" &&
      joinsSegment === "joins" &&
      joinId === "next"
    ) {
      const hostToken = requireSearchParam(request, "hostToken");
      return waitJson(request, (signal) => signalingStore.waitForJoin(code, hostToken, signal));
    }

    if (
      request.method === "POST" &&
      segments.length === 5 &&
      root === "sessions" &&
      typeof code === "string" &&
      joinsSegment === "joins" &&
      typeof joinId === "string" &&
      payloadSegment === "command"
    ) {
      const body = commandRequestSchema.parse(await readJson(request));
      let command: unknown = body.command;
      if (body.command.kind === "question.submit" && !body.command.anonymous) {
        const principal = await authenticate(request);
        command = {
          ...body.command,
          authorName: principal.nickname,
          authorId: principal.id,
          authorEmail: principal.email,
        };
      }
      signalingStore.publishCommand(
        code,
        joinId,
        body.joinToken,
        relayCommandSchema.parse(command),
      );
      return json({ ok: true });
    }

    if (
      request.method === "GET" &&
      segments.length === 5 &&
      root === "sessions" &&
      typeof code === "string" &&
      joinsSegment === "joins" &&
      typeof joinId === "string" &&
      payloadSegment === "command"
    ) {
      const hostToken = requireSearchParam(request, "hostToken");
      return waitJson(request, async (signal) => ({
        command: await signalingStore.waitForCommand(code, joinId, hostToken, signal),
      }));
    }

    if (
      request.method === "POST" &&
      segments.length === 5 &&
      root === "sessions" &&
      typeof code === "string" &&
      joinsSegment === "joins" &&
      typeof joinId === "string" &&
      payloadSegment === "snapshot"
    ) {
      const body = snapshotRequestSchema.parse(await readJson(request));
      signalingStore.publishSnapshot(code, joinId, body.hostToken, body.snapshot);
      return json({ ok: true });
    }

    if (
      request.method === "GET" &&
      segments.length === 5 &&
      root === "sessions" &&
      typeof code === "string" &&
      joinsSegment === "joins" &&
      typeof joinId === "string" &&
      payloadSegment === "snapshot"
    ) {
      const joinToken = requireSearchParam(request, "joinToken");
      return waitJson(request, async (signal) => ({
        snapshot: await signalingStore.waitForSnapshot(code, joinId, joinToken, signal),
      }));
    }

    if (request.method === "DELETE" && segments.length === 2 && root === "sessions" && typeof code === "string") {
      const url = new URL(request.url);
      const hostToken = url.searchParams.get("hostToken") ?? hostTokenSchema.parse(await readJson(request)).hostToken;
      signalingStore.deleteSession(code, hostToken);
      return json({ ok: true });
    }

    return json({ error: "요청 경로를 찾을 수 없습니다" }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim() === "") {
    return {};
  }

  return JSON.parse(text);
}

function requireSearchParam(request: Request, name: string): string {
  const value = new URL(request.url).searchParams.get(name);
  if (!value) {
    throw new Error(`${name}이 필요합니다`);
  }

  return value;
}

async function waitJson<T>(request: Request, wait: (signal: AbortSignal) => Promise<T>): Promise<Response> {
  const waitSignal = createWaitSignal(request.signal);
  try {
    const result = await wait(waitSignal.signal);
    return json(result);
  } catch (error) {
    if (waitSignal.timedOut() || request.signal.aborted) {
      return new Response(null, { status: 204, headers: noStoreHeaders() });
    }
    throw error;
  } finally {
    waitSignal.cleanup();
  }
}

function createWaitSignal(source: AbortSignal): WaitSignal {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, WAIT_TIMEOUT_MS);
  const abort = (): void => {
    controller.abort();
  };

  if (source.aborted) {
    controller.abort();
  } else {
    source.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timeout);
      source.removeEventListener("abort", abort);
    },
  };
}

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return json({ error: "요청 본문이 올바르지 않습니다" }, 400);
  }

  if (error instanceof SyntaxError) {
    return json({ error: "JSON 형식이 올바르지 않습니다" }, 400);
  }

  if (error instanceof Error) {
    if (error.message.includes("권한")) {
      return json({ error: error.message }, 403);
    }
    if (error.message.includes("찾을 수 없습니다")) {
      return json({ error: error.message }, 404);
    }
    return json({ error: error.message }, 400);
  }

  return json({ error: "알 수 없는 오류가 발생했습니다" }, 500);
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: noStoreHeaders() });
}

function noStoreHeaders(): Headers {
  return new Headers({ "Cache-Control": "no-store" });
}
