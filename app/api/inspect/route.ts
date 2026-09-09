import { ApiError, apiError, apiResponse, assertOrganization, assertSameOrigin, getDatabase, getViewer, readBody } from "@/lib/dcf-db";
import { scenarios, type ScenarioKey } from "@/lib/dcf-demo";
import { z } from "zod";
const schema = z.object({ organizationId: z.string().uuid(), lineId: z.string().uuid(), scenario: z.string().refine(value => Object.hasOwn(scenarios, value), "Choose a valid demo scenario."), requestId: z.string().uuid() });
export async function POST(request: Request) {
  try {
    const viewer = getViewer(request); assertSameOrigin(request);
    const body = schema.parse(await readBody(request));
    await assertOrganization(viewer.id, body.organizationId);
    const db = getDatabase();
    const line = await db.prepare("SELECT id FROM production_lines WHERE id = ? AND organization_id = ?").bind(body.lineId, body.organizationId).first();
    if (!line) throw new ApiError(404, "Production line not found.");
    const scenario = scenarios[body.scenario as ScenarioKey];
    const now = new Date().toISOString();
    const inserted = await db.prepare("INSERT INTO inspection_events (id, organization_id, line_id, category, status, confidence, message, affected_units, created_at, source, scenario, expected, observed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING")
      .bind(body.requestId, body.organizationId, body.lineId, scenario.category, scenario.status, 0, scenario.message, scenario.affectedUnits, now, "demo", body.scenario, scenario.expected, scenario.observed).run();
    const record = await db.prepare("SELECT id, scenario, line_id AS lineId, created_at AS createdAt FROM inspection_events WHERE id = ? AND organization_id = ?").bind(body.requestId, body.organizationId).first<{ id: string; scenario: string; lineId: string; createdAt: string }>();
    if (!record || record.scenario !== body.scenario || record.lineId !== body.lineId) throw new ApiError(409, "This request was already used for a different result. Start a new demo run.");
    return apiResponse({ ...record, source: "demo", status: scenario.status, message: scenario.message }, inserted.meta.changes ? 201 : 200);
  } catch (error) { return apiError(error); }
}
