import { ApiError, apiError, apiResponse, assertOrganization, assertSameOrigin, getDatabase, getViewer, readBody } from "@/lib/dcf-db";
import { z } from "zod";
const schema = z.object({ requestId: z.string().uuid(), organizationId: z.string().uuid(), name: z.string().trim().min(2, "Enter a line name with at least 2 characters.").max(80), product: z.string().trim().min(2, "Enter the product name.").max(100), targetRate: z.number().int().min(1).max(10000) });
export async function POST(request: Request) {
  try {
    const viewer = getViewer(request); assertSameOrigin(request);
    const body = schema.parse(await readBody(request));
    await assertOrganization(viewer.id, body.organizationId);
    const id = body.requestId, db = getDatabase();
    const inserted = await db.prepare("INSERT INTO production_lines (id, organization_id, name, code, product, status, target_rate, current_rate, quality_score, downtime_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
      .bind(id, body.organizationId, body.name, "DCF-" + id.slice(0, 8).toUpperCase(), body.product, "setup", body.targetRate, 0, 0, 0, new Date().toISOString()).run();
    const record = await db.prepare("SELECT name, product, target_rate AS targetRate FROM production_lines WHERE id = ? AND organization_id = ?").bind(id, body.organizationId).first<{ name: string; product: string; targetRate: number }>();
    if (!record || record.name !== body.name || record.product !== body.product || record.targetRate !== body.targetRate) throw new ApiError(409, "This request was already used. Reopen the form to create another line.");
    return apiResponse({ id }, inserted.meta.changes ? 201 : 200);
  } catch (error) { return apiError(error); }
}
