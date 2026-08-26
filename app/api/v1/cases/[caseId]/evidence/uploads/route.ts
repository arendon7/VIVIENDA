import { evidenceHttpApi } from "@/server/evidence-api/runtime.server";
import { bindRequestToTrustedOrigin } from "@/server/evidence-api/trusted-origin.server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const guardedRequest = bindRequestToTrustedOrigin(request);
  if (guardedRequest instanceof Response) return guardedRequest;

  const { caseId } = await context.params;
  return evidenceHttpApi.prepare(guardedRequest, { caseId });
}
