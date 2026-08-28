import { z } from "zod";

import {
  relayCommandSchema,
  sessionStateSchema,
  type RelayClientCommand,
  type RelayCommand,
} from "@/signaling/relay-schema";
import { mirimAuthorizationHeaders } from "@/auth/client-token";

const createSessionResponseSchema = z.object({ code: z.string(), hostToken: z.string() }).strict();
const requestJoinResponseSchema = z.object({ id: z.string(), joinToken: z.string() }).strict();
const waitJoinResponseSchema = z.object({ id: z.string() }).strict();
const waitCommandResponseSchema = z.object({ command: relayCommandSchema }).strict();
const waitSnapshotResponseSchema = z.object({ snapshot: sessionStateSchema }).strict();
const okResponseSchema = z.object({ ok: z.literal(true) }).strict();

type RequestOptions = {
  signal?: AbortSignal;
};

export type SignalingSession = z.infer<typeof createSessionResponseSchema>;
export type SignalingJoin = z.infer<typeof requestJoinResponseSchema>;

export async function createSignalingSession(options: RequestOptions = {}): Promise<SignalingSession> {
  return requestJson("/api/signaling/sessions", {
    method: "POST",
    body: {},
    signal: options.signal,
    schema: createSessionResponseSchema,
  });
}

export async function requestSessionJoin(
  code: string,
  options: RequestOptions = {},
): Promise<SignalingJoin> {
  return requestJson(`/api/signaling/sessions/${encodeURIComponent(code)}/joins`, {
    method: "POST",
    body: {},
    signal: options.signal,
    schema: requestJoinResponseSchema,
  });
}

export async function waitForJoin(
  code: string,
  hostToken: string,
  options: RequestOptions = {},
): Promise<{ id: string }> {
  return waitUntilJson(
    `/api/signaling/sessions/${encodeURIComponent(code)}/joins/next?hostToken=${encodeURIComponent(hostToken)}`,
    waitJoinResponseSchema,
    options.signal,
  );
}

export async function publishCommand(
  code: string,
  joinId: string,
  joinToken: string,
  command: RelayClientCommand,
  options: RequestOptions = {},
): Promise<void> {
  await requestJson(`/api/signaling/sessions/${encodeURIComponent(code)}/joins/${encodeURIComponent(joinId)}/command`, {
    method: "POST",
    body: { joinToken, command },
    headers: command.kind === "question.submit" && !command.anonymous
      ? mirimAuthorizationHeaders()
      : undefined,
    signal: options.signal,
    schema: okResponseSchema,
  });
}

export async function waitForCommand(
  code: string,
  joinId: string,
  hostToken: string,
  options: RequestOptions = {},
): Promise<RelayCommand> {
  const result = await waitUntilJson(
    `/api/signaling/sessions/${encodeURIComponent(code)}/joins/${encodeURIComponent(joinId)}/command?hostToken=${encodeURIComponent(hostToken)}`,
    waitCommandResponseSchema,
    options.signal,
  );
  return result.command;
}

export async function publishSnapshot(
  code: string,
  joinId: string,
  hostToken: string,
  snapshot: z.infer<typeof sessionStateSchema>,
  options: RequestOptions = {},
): Promise<void> {
  await requestJson(`/api/signaling/sessions/${encodeURIComponent(code)}/joins/${encodeURIComponent(joinId)}/snapshot`, {
    method: "POST",
    body: { hostToken, snapshot },
    signal: options.signal,
    schema: okResponseSchema,
  });
}

export async function waitForSnapshot(
  code: string,
  joinId: string,
  joinToken: string,
  options: RequestOptions = {},
): Promise<z.infer<typeof sessionStateSchema>> {
  const result = await waitUntilJson(
    `/api/signaling/sessions/${encodeURIComponent(code)}/joins/${encodeURIComponent(joinId)}/snapshot?joinToken=${encodeURIComponent(joinToken)}`,
    waitSnapshotResponseSchema,
    options.signal,
  );
  return result.snapshot;
}

export async function closeSignalingSession(
  code: string,
  hostToken: string,
  options: RequestOptions = {},
): Promise<void> {
  await requestJson(`/api/signaling/sessions/${encodeURIComponent(code)}?hostToken=${encodeURIComponent(hostToken)}`, {
    method: "DELETE",
    body: {},
    signal: options.signal,
    schema: okResponseSchema,
  });
}

async function waitUntilJson<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  while (!signal?.aborted) {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal,
    });

    if (response.status === 204) {
      continue;
    }

    await ensureOk(response);
    return schema.parse(await response.json());
  }

  throw new Error("요청이 취소되었습니다");
}

async function requestJson<T>(
  url: string,
  options: {
    method: "POST" | "DELETE";
    body: unknown;
    signal?: AbortSignal;
    schema: z.ZodType<T>;
    headers?: Headers;
  },
): Promise<T> {
  const response = await fetch(url, {
    method: options.method,
    headers: { "Content-Type": "application/json" },
    ...(options.headers
      ? {
          headers: new Headers({
            ...Object.fromEntries(options.headers.entries()),
            "Content-Type": "application/json",
          }),
        }
      : {}),
    body: JSON.stringify(options.body),
    cache: "no-store",
    signal: options.signal,
  });

  await ensureOk(response);
  return options.schema.parse(await response.json());
}

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const errorResponse = await parseErrorResponse(response);
  throw new Error(errorResponse.error);
}

async function parseErrorResponse(response: Response): Promise<{ error: string }> {
  const fallback = { error: `Signaling request failed with HTTP ${response.status}` };
  try {
    return z.object({ error: z.string() }).strict().parse(await response.json());
  } catch {
    return fallback;
  }
}
