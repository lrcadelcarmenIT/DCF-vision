import { ApiError, apiError, apiResponse, assertOrganization, assertSameOrigin, getDatabase, getViewer, readBody } from "@/lib/dcf-db";
import { z } from "zod";
const schema = z.object({ organizationId: z.string().uuid(), eventId: z.string().uuid(), status: z.enum(["confirmed", "dismissed"]), note: z.string().trim().min(3, "Add a short review note (at least 3 characters).").max(1000) });
export async function POST(request: Request) {
  try {
    const viewer = getViewer(request); assertSameOrigin(request);
    const body = schema.parse(await readBody(request));
    await assertOrganization(viewer.id, body.organizationId);
    const db = getDatabase();
    const updated = await db.prepare("UPDATE inspection_events SET review_status = ?, review_note = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ? AND organization_id = ? AND review_status = 'unreviewed'").bind(body.status, body.note, new Date().toISOString(), viewer.id, body.eventId, body.organizationId).run();
    if (!updated.meta.changes) {
      const existing = await db.prepare("SELECT review_status AS status, review_note AS note FROM inspection_events WHERE id = ? AND organization_id = ?").bind(body.eventId, body.organizationId).first<{ status: string; note: string }>();
      if (!existing) throw new ApiError(404, "Inspection record not found.");
      if (existing.status !== body.status || existing.note !== body.note) throw new ApiError(409, "This record has already been reviewed. Refresh to see the saved decision.");
    }
    return apiResponse({ saved: true });
  } catch (error) { return apiError(error); }
}
