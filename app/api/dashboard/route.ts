import { apiError, apiResponse, getDashboard, getViewer } from "@/lib/dcf-db";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return apiResponse(await getDashboard(getViewer(request).id, new URL(request.url).searchParams.get("organizationId"))); }
  catch (error) { return apiError(error); }
}
