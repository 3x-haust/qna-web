import { z } from "zod";

const createSessionResponseSchema = z.object({ code: z.string(), hostToken: z.string() }).strict();
const requestJoinResponseSchema = z.object({ id: z.string(), joinToken: z.string() }).strict();
const waitJoinResponseSchema = z.object({ id: z.string() }).strict();
const waitOfferResponseSchema = z.object({ offer: z.string() }).strict();
const waitAnswerResponseSchema = z.object({ answer: z.string() }).strict();
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

export async function publishOffer(
  code: string,
  joinId: string,
  hostToken: string,
  offer: string,
  options: RequestOptions = {},
): Promise<void> {
  await requestJson(`/api/signaling/sessions/${encodeURIComponent(code)}/joins/${encodeURIComponent(joinId)}/offer`, {
    method: "POST",
    body: { hostToken, offer },
    signal: options.signal,
    schema: okResponseSchema,
  });
}

export async function waitForOffer(
  code: string,
  joinId: string,
  joinToken: string,
  options: RequestOptions = {},
): Promise<string> {
  const result = await waitUntilJson(
    `/api/signaling/sessions/${encodeURIComponent(code)}/joins/${encodeURIComponent(joinId)}/offer?joinToken=${encodeURIComponent(joinToken)}`,
    waitOfferResponseSchema,
    options.signal,
  );
  return result.offer;
}

export async function publishAnswer(
  code: string,
  joinId: string,
  joinToken: string,
  answer: string,
  options: RequestOptions = {},
): Promise<void> {
  await requestJson(`/api/signaling/sessions/${encodeURIComponent(code)}/joins/${encodeURIComponent(joinId)}/answer`, {
    method: "POST",
    body: { joinToken, answer },
    signal: options.signal,
    schema: okResponseSchema,
  });
}

export async function waitForAnswer(
  code: string,
  joinId: string,
  hostToken: string,
  options: RequestOptions = {},
): Promise<string> {
  const result = await waitUntilJson(
    `/api/signaling/sessions/${encodeURIComponent(code)}/joins/${encodeURIComponent(joinId)}/answer?hostToken=${encodeURIComponent(hostToken)}`,
    waitAnswerResponseSchema,
    options.signal,
  );
  return result.answer;
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
  },
): Promise<T> {
  const response = await fetch(url, {
    method: options.method,
    headers: { "Content-Type": "application/json" },
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
