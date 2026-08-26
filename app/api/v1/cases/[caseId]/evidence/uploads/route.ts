import { evidenceHttpApi } from "@/server/evidence-api/runtime.server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { caseId } = await context.params;
  return evidenceHttpApi.prepare(request, { caseId });
}
