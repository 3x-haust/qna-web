export type MirimProxyConfig = {
  appOrigin: string;
  clientId: string;
  clientSecret: string;
  oauthOrigin: string;
  redirectUri: string;
};

const allowedRoutes = new Map([
  ["GET:/api/v1/oauth/authorize", true],
  ["POST:/api/v1/oauth/token", true],
  ["POST:/api/v1/auth/refresh", true],
  ["GET:/api/v1/user", true],
]);

export async function handleMirimProxy(
  request: Request,
  path: string,
  upstream: typeof fetch,
  config: MirimProxyConfig,
): Promise<Response> {
  if (!allowedRoutes.has(`${request.method}:${path}`)) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }
  if (!config.clientId || !config.clientSecret) {
    return Response.json({ message: "Mirim OAuth is not configured" }, { status: 503 });
  }
  if (request.method === "POST" && request.headers.get("origin") !== config.appOrigin) {
    return Response.json({ message: "Invalid origin" }, { status: 403 });
  }

  const target = new URL(path, config.oauthOrigin);
  if (request.method === "GET" && path === "/api/v1/oauth/authorize") {
    const source = new URL(request.url);
    source.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    target.searchParams.set("client_id", config.clientId);
    target.searchParams.set("redirect_uri", config.redirectUri);
    return Response.redirect(target);
  }

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  if (request.method === "GET") {
    const response = await upstream(target, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "cache-control": "no-store",
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const incoming = (await request.json()) as Record<string, unknown>;
  const body =
    path === "/api/v1/oauth/token"
      ? {
          ...incoming,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
        }
      : incoming;
  headers.set("content-type", "application/json");
  const response = await upstream(target, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return new Response(response.body, {
    status: response.status,
    headers: {
      "cache-control": "no-store",
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
