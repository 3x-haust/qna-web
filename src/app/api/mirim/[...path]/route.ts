import { handleMirimProxy } from "@/auth/mirim-proxy";

type Context = {
  params: Promise<{ path: string[] }>;
};

function config() {
  return {
    appOrigin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    clientId:
      process.env.MIRIM_CLIENT_ID ??
      process.env.NEXT_PUBLIC_MIRIM_CLIENT_ID ??
      "",
    clientSecret: process.env.MIRIM_CLIENT_SECRET ?? "",
    oauthOrigin: process.env.MIRIM_OAUTH_SERVER_URL ?? "https://api-auth.mmhs.app",
    redirectUri:
      process.env.MIRIM_REDIRECT_URI ??
      process.env.NEXT_PUBLIC_MIRIM_REDIRECT_URI ??
      "http://localhost:3000/auth/callback",
  };
}

async function proxy(request: Request, context: Context): Promise<Response> {
  const { path } = await context.params;
  return handleMirimProxy(request, `/${path.join("/")}`, fetch, config());
}

export const GET = proxy;
export const POST = proxy;
