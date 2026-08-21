import { describe, expect, it, vi } from "vitest";

import { handleMirimProxy } from "@/auth/mirim-proxy";

describe("Mirim OAuth server secret proxy", () => {
  it("forwards authenticated user reads instead of redirecting them", async () => {
    const upstream = vi.fn().mockResolvedValue(
      Response.json({ status: 200, data: { id: "teacher" } }),
    );
    const request = new Request("http://localhost:3000/api/mirim/api/v1/user", {
      headers: { authorization: "Bearer access-token" },
    });

    const response = await handleMirimProxy(request, "/api/v1/user", upstream, {
      appOrigin: "http://localhost:3000",
      clientId: "client",
      clientSecret: "server-secret",
      oauthOrigin: "https://api-auth.mmhs.app",
      redirectUri: "http://localhost:3000/auth/callback",
    });

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledWith(
      new URL("https://api-auth.mmhs.app/api/v1/user"),
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
    const init = upstream.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer access-token");
  });

  it("replaces every browser-supplied client secret on token exchange", async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 200, data: { access_token: "token" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const request = new Request("http://localhost:3000/api/mirim/api/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        code: "code",
        clientId: "client",
        clientSecret: "browser-leak",
        redirectUri: "http://localhost:3000/auth/callback",
      }),
    });

    const response = await handleMirimProxy(request, "/api/v1/oauth/token", upstream, {
      appOrigin: "http://localhost:3000",
      clientId: "client",
      clientSecret: "server-secret",
      oauthOrigin: "https://api-auth.mmhs.app",
      redirectUri: "http://localhost:3000/auth/callback",
    });

    expect(response.status).toBe(200);
    const init = upstream.mock.calls[0]?.[1] as RequestInit;
    expect(String(init.body)).toContain('"clientSecret":"server-secret"');
    expect(String(init.body)).not.toContain("browser-leak");
  });

  it("rejects paths outside the OAuth allowlist", async () => {
    const upstream = vi.fn();
    const response = await handleMirimProxy(
      new Request("http://localhost:3000/api/mirim/admin"),
      "/admin",
      upstream,
      {
        appOrigin: "http://localhost:3000",
        clientId: "client",
        clientSecret: "server-secret",
        oauthOrigin: "https://api-auth.mmhs.app",
        redirectUri: "http://localhost:3000/auth/callback",
      },
    );

    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
});
