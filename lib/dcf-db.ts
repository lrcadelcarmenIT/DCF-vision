import { ZodError } from "zod";
import type { DashboardData, InspectionEvent, Organization, ProductionLine } from "./dcf-demo";

const env = (globalThis as typeof globalThis & { env?: { DB?: D1Database } }).env;
const isPublicDemo = process.env.VERCEL === "1";

type DemoOrganization = { id: string; owner_id: string; name: string; site: string; created_at: string };
type DemoLine = { id: string; organization_id: string; name: string; code: string; product: string; status: string; target_rate: number; current_rate: number; quality_score: number; downtime_minutes: number; created_at: string };
type DemoEvent = { id: string; organization_id: string; line_id: string; category: string; status: string; confidence: number; message: string; affected_units: number; created_at: string; source: string; scenario: string | null; expected: string | null; observed: string | null; review_status: string; review_note: string; reviewed_at: string | null; reviewed_by: string | null };

const publicDemoState: { organizations: DemoOrganization[]; lines: DemoLine[]; events: DemoEvent[] } = {
  organizations: [],
  lines: [],
  events: [],
};
const publicDemoOwner = "public-demo-user";
const publicDemoDb = {
  prepare(sql: string) {
    let args: unknown[] = [];
    const statement = {
      bind(...values: unknown[]) { args = values; return statement; },
      async first<T>() {
        if (sql.includes("SELECT id FROM organizations WHERE owner_id")) {
          return (publicDemoState.organizations.find(item => item.owner_id === args[0]) ?? null) as T | null;
        }
        if (sql.includes("SELECT id FROM organizations WHERE id = ? AND owner_id")) {
          const row = publicDemoState.organizations.find(item => item.id === args[0] && item.owner_id === args[1]);
          return (row ? { id: row.id } : null) as T | null;
        }
        if (sql.includes("SELECT id FROM production_lines WHERE id = ? AND organization_id")) {
          const row = publicDemoState.lines.find(item => item.id === args[0] && item.organization_id === args[1]);
          return (row ? { id: row.id } : null) as T | null;
        }
        if (sql.includes("COUNT(*) AS total")) {
          const rows = publicDemoState.events.filter(item => item.organization_id === args[0]);
          return { total: rows.length, passes: rows.filter(item => item.status === "pass").length, needsReview: rows.filter(item => item.status !== "pass" && item.review_status === "unreviewed").length, reviewed: rows.filter(item => item.review_status !== "unreviewed").length } as T;
        }
        if (sql.includes("SELECT id, scenario, line_id AS lineId")) {
          const row = publicDemoState.events.find(item => item.id === args[0] && item.organization_id === args[1]);
          return (row ? { id: row.id, scenario: row.scenario, lineId: row.line_id, createdAt: row.created_at } : null) as T | null;
        }
        if (sql.includes("SELECT review_status AS status")) {
          const row = publicDemoState.events.find(item => item.id === args[0] && item.organization_id === args[1]);
          return (row ? { status: row.review_status, note: row.review_note } : null) as T | null;
        }
        if (sql.includes("SELECT name, product, target_rate AS targetRate")) {
          const row = publicDemoState.lines.find(item => item.id === args[0] && item.organization_id === args[1]);
          return (row ? { name: row.name, product: row.product, targetRate: row.target_rate } : null) as T | null;
        }
        if (sql.includes("SELECT name, site FROM organizations")) {
          const row = publicDemoState.organizations.find(item => item.id === args[0] && item.owner_id === args[1]);
          return (row ? { name: row.name, site: row.site } : null) as T | null;
        }
        return null;
      },
      async all<T>() {
        if (sql.includes("FROM organizations WHERE owner_id")) {
          return { results: publicDemoState.organizations.filter(item => item.owner_id === args[0]).map(item => ({ id: item.id, name: item.name, site: item.site })) as T[] };
        }
        if (sql.includes("FROM production_lines WHERE organization_id")) {
          return { results: publicDemoState.lines.filter(item => item.organization_id === args[0]).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(item => ({ id: item.id, name: item.name, code: item.code, product: item.product, targetRate: item.target_rate })) as T[] };
        }
        if (sql.includes("FROM inspection_events e JOIN production_lines")) {
          const rows = publicDemoState.events.filter(item => item.organization_id === args[0]).sort((a, b) => b.created_at.localeCompare(a.created_at));
          return { results: rows.slice(0, 100).map(item => ({ id: item.id, lineId: item.line_id, lineName: publicDemoState.lines.find(line => line.id === item.line_id)?.name ?? "Demo line", category: item.category, status: item.status, message: item.message, affectedUnits: item.affected_units, createdAt: item.created_at, source: item.source, scenario: item.scenario, expected: item.expected, observed: item.observed, reviewStatus: item.review_status, reviewNote: item.review_note, reviewedAt: item.reviewed_at })) as T[] };
        }
        return { results: [] as T[] };
      },
      async run() {
        if (sql.includes("INTO organizations")) {
          const [id, owner_id, name, site, created_at] = args as [string, string, string, string, string];
          if (publicDemoState.organizations.some(item => item.id === id)) return { meta: { changes: 0 } };
          publicDemoState.organizations.push({ id, owner_id, name, site, created_at });
          return { meta: { changes: 1 } };
        }
        if (sql.includes("INTO production_lines")) {
          const [id, organization_id, name, code, product, status, target_rate, current_rate, quality_score, downtime_minutes, created_at] = args as [string, string, string, string, string, string, number, number, number, number, string];
          if (publicDemoState.lines.some(item => item.id === id)) return { meta: { changes: 0 } };
          publicDemoState.lines.push({ id, organization_id, name, code, product, status, target_rate, current_rate, quality_score, downtime_minutes, created_at });
          return { meta: { changes: 1 } };
        }
        if (sql.includes("INSERT INTO inspection_events")) {
          const [id, organization_id, line_id, category, status, confidence, message, affected_units, created_at, source, scenario, expected, observed] = args as [string, string, string, string, string, number, string, number, string, string, string, string, string];
          if (publicDemoState.events.some(item => item.id === id)) return { meta: { changes: 0 } };
          publicDemoState.events.push({ id, organization_id, line_id, category, status, confidence, message, affected_units, created_at, source, scenario, expected, observed, review_status: "unreviewed", review_note: "", reviewed_at: null, reviewed_by: null });
          return { meta: { changes: 1 } };
        }
        if (sql.includes("UPDATE inspection_events SET review_status")) {
          const [review_status, review_note, reviewed_at, reviewed_by, id, organization_id] = args as [string, string, string, string, string, string];
          const row = publicDemoState.events.find(item => item.id === id && item.organization_id === organization_id && item.review_status === "unreviewed");
          if (!row) return { meta: { changes: 0 } };
          Object.assign(row, { review_status, review_note, reviewed_at, reviewed_by });
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      },
    };
    return statement;
  },
  async batch(statements: Array<{ run: () => Promise<unknown> }>) {
    for (const statement of statements) await statement.run();
    return [];
  },
} as unknown as D1Database;

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function getDatabase(): D1Database {
  const db = env?.DB;
  if (db) return db;
  if (isPublicDemo) return publicDemoDb;
  throw new ApiError(503, "The workspace is temporarily unavailable. Please try again.");
}
/** Identity is supplied by Sites dispatch. Anonymous requests never share an owner. */
export function getViewer(request: Request) {
  const id = request.headers.get("oai-authenticated-user-id")?.trim();
  if (!id) {
    if (isPublicDemo) return { id: publicDemoOwner };
    throw new ApiError(401, "Please sign in to open your workspace.");
  }
  return { id };
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new ApiError(403, "This request must come from your DCF Vision workspace.");
  }
}
export async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError(415, "Send a JSON request.");
  if (Number(request.headers.get("content-length") ?? 0) > 16000) throw new ApiError(413, "This request is too large.");
  if (!request.body) throw new ApiError(400, "The request could not be read.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, raw = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 16000) { await reader.cancel(); throw new ApiError(413, "This request is too large."); }
    raw += decoder.decode(chunk.value, { stream: true });
  }
  raw += decoder.decode();
  try { return JSON.parse(raw); } catch { throw new ApiError(400, "The request could not be read."); }
}
export function apiResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return apiResponse({ error: error.message }, error.status);
  if (error instanceof ZodError) return apiResponse({ error: error.issues[0]?.message ?? "Check the values and try again." }, 400);
  console.error("DCF workspace request failed", error);
  return apiResponse({ error: "We couldn't complete that request. Your input has been kept; please try again." }, 500);
}
async function stableId(input: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].slice(0, 16).map(x => x.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}
async function ensureDemoOrganization(ownerId: string) {
  const db = getDatabase();
  const existing = await db.prepare("SELECT id FROM organizations WHERE owner_id = ? ORDER BY created_at ASC, id ASC LIMIT 1").bind(ownerId).first<{ id: string }>();
  if (existing) return existing.id;
  // Stable IDs + an atomic batch prevent duplicate onboarding on concurrent requests.
  const orgId = await stableId("dcf-demo:" + ownerId);
  const lineId = await stableId("dcf-demo-line:" + ownerId);
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO organizations (id, owner_id, name, site, created_at) VALUES (?, ?, ?, ?, ?)").bind(orgId, ownerId, "Demonstration plant", "Sample facility", now),
    db.prepare("INSERT OR IGNORE INTO production_lines (id, organization_id, name, code, product, status, target_rate, current_rate, quality_score, downtime_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(lineId, orgId, "Packaging line 01", "PKG-01", "Six-piece dumpling trays", "setup", 120, 0, 0, 0, now),
  ]);
  return orgId;
}
export async function assertOrganization(ownerId: string, orgId: string) {
  const row = await getDatabase().prepare("SELECT id FROM organizations WHERE id = ? AND owner_id = ?").bind(orgId, ownerId).first<{ id: string }>();
  if (!row) throw new ApiError(404, "Facility not found or unavailable to your account.");
}
export async function getDashboard(ownerId: string, requestedId?: string | null): Promise<DashboardData> {
  const db = getDatabase();
  if (requestedId) await assertOrganization(ownerId, requestedId);
  const orgId = requestedId || await ensureDemoOrganization(ownerId);
  const [orgResult, lineResult, eventResult, metrics] = await Promise.all([
    db.prepare("SELECT id, name, site FROM organizations WHERE owner_id = ? ORDER BY created_at ASC, id ASC").bind(ownerId).all<Organization>(),
    db.prepare("SELECT id, name, code, product, target_rate AS targetRate FROM production_lines WHERE organization_id = ? ORDER BY created_at ASC, id ASC").bind(orgId).all<ProductionLine>(),
    db.prepare("SELECT e.id, e.line_id AS lineId, l.name AS lineName, e.category, e.status, e.message, e.affected_units AS affectedUnits, e.created_at AS createdAt, e.source, e.scenario, e.expected, e.observed, e.review_status AS reviewStatus, e.review_note AS reviewNote, e.reviewed_at AS reviewedAt FROM inspection_events e JOIN production_lines l ON l.id = e.line_id AND l.organization_id = e.organization_id WHERE e.organization_id = ? ORDER BY e.created_at DESC, e.id DESC LIMIT 100").bind(orgId).all<InspectionEvent>(),
    db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(status = 'pass'), 0) AS passes, COALESCE(SUM(status != 'pass' AND review_status = 'unreviewed'), 0) AS needsReview, COALESCE(SUM(review_status != 'unreviewed'), 0) AS reviewed FROM inspection_events WHERE organization_id = ?").bind(orgId).first<DashboardData["metrics"]>(),
  ]);
  return { organizations: orgResult.results, selectedOrganizationId: orgId, lines: lineResult.results, events: eventResult.results, metrics: metrics ?? { total: 0, passes: 0, needsReview: 0, reviewed: 0 }, updatedAt: new Date().toISOString() };
}
