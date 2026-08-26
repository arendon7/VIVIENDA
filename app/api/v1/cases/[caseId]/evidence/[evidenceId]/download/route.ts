import { evidenceHttpApi } from "@/server/evidence-api/runtime.server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ caseId: string; evidenceId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { caseId, evidenceId } = await context.params;
  return evidenceHttpApi.download(request, { caseId, evidenceId });
}
