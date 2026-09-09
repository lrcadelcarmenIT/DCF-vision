import { ApiError, apiError, apiResponse, assertSameOrigin, getDatabase, getViewer, readBody } from "@/lib/dcf-db";
import { z } from "zod";
const schema = z.object({ requestId: z.string().uuid(), name: z.string().trim().min(2, "Enter a facility name with at least 2 characters.").max(80), site: z.string().trim().min(2, "Enter a location with at least 2 characters.").max(80) });
export async function POST(request: Request) {
  try {
    const viewer = getViewer(request); assertSameOrigin(request);
    const body = schema.parse(await readBody(request));
    const id = body.requestId, db = getDatabase();
    const inserted = await db.prepare("INSERT INTO organizations (id, owner_id, name, site, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING").bind(id, viewer.id, body.name, body.site, new Date().toISOString()).run();
    const record = await db.prepare("SELECT name, site FROM organizations WHERE id = ? AND owner_id = ?").bind(id, viewer.id).first<{ name: string; site: string }>();
    if (!record || record.name !== body.name || record.site !== body.site) throw new ApiError(409, "This request was already used. Reopen the form to create another facility.");
    return apiResponse({ id }, inserted.meta.changes ? 201 : 200);
  } catch (error) { return apiError(error); }
}
