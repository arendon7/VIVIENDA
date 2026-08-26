import { evidenceHttpApi } from "@/server/evidence-api/runtime.server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ caseId: string; intentId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { caseId, intentId } = await context.params;
  return evidenceHttpApi.complete(request, { caseId, intentId });
}
