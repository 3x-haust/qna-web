import { describe, expect, it, vi } from "vitest";

import {
  authenticateMirimRequest,
  MirimAuthenticationError,
} from "@/auth/mirim-principal";

describe("Mirim server principal", () => {
  it("rejects a request without a bearer token", async () => {
    await expect(
      authenticateMirimRequest(
        new Request("https://qna.test/api/archive"),
        vi.fn(),
        { oauthOrigin: "https://oauth.test" },
      ),
    ).rejects.toBeInstanceOf(MirimAuthenticationError);
  });

  it("resolves the trusted user from the OAuth server", async () => {
    const upstream = vi.fn().mockResolvedValue(
      Response.json({
        status: 200,
        data: {
          id: "teacher-42",
          nickname: "김미림 선생님",
          email: "teacher@e-mirim.hs.kr",
          role: "TEACHER",
        },
      }),
    );

    const principal = await authenticateMirimRequest(
      new Request("https://qna.test/api/archive", {
        headers: { authorization: "Bearer access-token" },
      }),
      upstream,
      { oauthOrigin: "https://oauth.test" },
    );

    expect(principal).toEqual({
      id: "teacher-42",
      nickname: "김미림 선생님",
      email: "teacher@e-mirim.hs.kr",
      role: "TEACHER",
    });
    expect(upstream).toHaveBeenCalledWith(
      new URL("/api/v1/user", "https://oauth.test"),
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const headers = upstream.mock.calls[0]?.[1]?.headers;
    expect(headers).toBeInstanceOf(Headers);
    expect((headers as Headers).get("authorization")).toBe(
      "Bearer access-token",
    );
  });
});
