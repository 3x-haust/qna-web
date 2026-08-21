import { handleSignalingRequest } from "@/signaling/signaling-endpoint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return handleSignalingRequest(request, context);
}

export function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleSignalingRequest(request, context);
}

export function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return handleSignalingRequest(request, context);
}
