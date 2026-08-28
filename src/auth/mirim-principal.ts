import { z } from "zod";

export type MirimPrincipal = {
  readonly id: string;
  readonly nickname: string;
  readonly email: string;
  readonly role: "TEACHER" | "STUDENT";
};

type PrincipalConfig = {
  readonly oauthOrigin: string;
  readonly e2eAuth?: boolean;
};

const principalResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    nickname: z.string().min(1),
    email: z.string().email(),
    role: z.enum(["TEACHER", "STUDENT"]),
  }),
});

export class MirimAuthenticationError extends Error {
  override readonly name = "MirimAuthenticationError";
}

export async function authenticateMirimRequest(
  request: Request,
  upstream: typeof fetch = fetch,
  config: PrincipalConfig = {
    oauthOrigin:
      process.env.MIRIM_OAUTH_SERVER_URL ?? "https://api-auth.mmhs.app",
    e2eAuth: process.env.QNA_E2E_AUTH === "1",
  },
): Promise<MirimPrincipal> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new MirimAuthenticationError("로그인이 필요합니다");
  }
  if (config.e2eAuth) {
    const fixture = e2ePrincipal(authorization.slice("Bearer ".length));
    if (fixture) return fixture;
  }
  const headers = new Headers({ authorization });
  const response = await upstream(
    new URL("/api/v1/user", config.oauthOrigin),
    { method: "GET", headers, cache: "no-store" },
  );
  if (!response.ok) {
    throw new MirimAuthenticationError("로그인 정보를 확인하지 못했습니다");
  }
  return principalResponseSchema.parse(await response.json()).data;
}

function e2ePrincipal(token: string): MirimPrincipal | null {
  if (token === "teacher-access-token") {
    return {
      id: "teacher-user-42",
      nickname: "김미림 선생님",
      email: "teacher@e-mirim.hs.kr",
      role: "TEACHER",
    };
  }
  if (token === "test-access-token") {
    return {
      id: "student-1",
      nickname: "김학생",
      email: "student@e-mirim.hs.kr",
      role: "STUDENT",
    };
  }
  return null;
}
