/** Focused, offline API regression checks against in-memory SQLite.
 * This is not a Cloudflare runtime, browser, or production integration test.
 * Run: node --experimental-vm-modules scripts/verify-dcf.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { DatabaseSync } from "node:sqlite";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import * as zod from "zod";

const root = path.resolve(import.meta.dirname, "..");
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON");
const migrations = readdirSync(path.join(root, "drizzle")).filter(file => file.endsWith(".sql")).sort();
sqlite.exec(readFileSync(path.join(root, "drizzle", migrations[0]), "utf8"));
// Existing rows survive the additive migration and are correctly marked as demo data.
sqlite.prepare("INSERT INTO organizations VALUES (?, ?, ?, ?, ?)").run("legacy-org", "legacy-owner", "Existing plant", "Existing location", "2026-01-01");
sqlite.prepare("INSERT INTO production_lines VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("legacy-line", "legacy-org", "Existing line", "LEG-01", "Pack", "running", 120, 115, 98, 2, "2026-01-01");
sqlite.prepare("INSERT INTO inspection_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("legacy-event", "legacy-org", "legacy-line", "package", "alert", 98, "Legacy sample", 1, "2026-01-01");
for (const migration of migrations.slice(1)) sqlite.exec(readFileSync(path.join(root, "drizzle", migration), "utf8"));
assert.deepEqual({ ...sqlite.prepare("SELECT message, source, review_status, scenario FROM inspection_events WHERE id = 'legacy-event'").get() }, { message: "Legacy sample", source: "demo", review_status: "unreviewed", scenario: null });

class Statement {
  constructor(sql, values = []) { this.sql = sql; this.values = values; }
  bind(...values) { return new Statement(this.sql, values); }
  async first() { return sqlite.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.values), success: true }; }
  async run() { const result = sqlite.prepare(this.sql).run(...this.values); return { success: true, meta: { changes: Number(result.changes) } }; }
}
const db = {
  prepare: sql => new Statement(sql),
  async batch(statements) {
    sqlite.exec("BEGIN");
    try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec("COMMIT"); return result; }
    catch (error) { sqlite.exec("ROLLBACK"); throw error; }
  },
};
const context = vm.createContext({ Request, Response, URL, TextEncoder, TextDecoder, crypto: webcrypto, console, setTimeout, clearTimeout });
const modules = new Map();
function synthetic(name, exports) { return new vm.SyntheticModule(Object.keys(exports), function() { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context, identifier: name }); }
modules.set("cloudflare:workers", synthetic("cloudflare:workers", { env: { DB: db } }));
modules.set("zod", synthetic("zod", zod));
function getModule(specifier, parent = path.join(root, "index.ts")) {
  if (modules.has(specifier)) return modules.get(specifier);
  const filename = (specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(parent), specifier)).replace(/(?<!\.ts)$/, ".ts");
  if (modules.has(filename)) return modules.get(filename);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const module = new vm.SourceTextModule(code, { context, identifier: filename });
  modules.set(filename, module);
  return module;
}
async function importModule(specifier) {
  const module = getModule(specifier);
  if (module.status === "unlinked") await module.link((specifier, parent) => getModule(specifier, parent.identifier));
  if (module.status === "linked") await module.evaluate();
  return module.namespace;
}
const routes = {};
for (const name of ["dashboard", "organizations", "lines", "inspect", "review"]) routes[name] = await importModule("@/app/api/" + name + "/route.ts");
const client = await importModule("@/lib/dcf-client.ts");
let checks = 1;
async function call(route, { user = "owner-a", body, query = "", headers = {} } = {}) {
  const request = new Request("https://dcf.test/api/" + route + query, { method: body === undefined ? "GET" : "POST", headers: { ...(user ? { "oai-authenticated-user-id": user } : {}), ...(body === undefined ? {} : { "content-type": "application/json", origin: "https://dcf.test" }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const response = await routes[route][body === undefined ? "GET" : "POST"](request);
  return { status: response.status, data: await response.json(), headers: response.headers };
}
function eq(actual, expected, name) { assert.deepEqual(actual, expected, name); checks++; }
for (const route of Object.keys(routes)) eq((await call(route, { user: null, ...(route === "dashboard" ? {} : { body: {} }) })).status, 401, "anonymous " + route);
const first = await call("dashboard");
eq(first.status, 200, "dashboard opens");
eq(first.data.events.length, 0, "no fabricated seed results");
eq(first.data.metrics.total, 0, "truthful initial total");
eq(first.headers.get("cache-control"), "private, no-store", "private response caching");
const orgId = first.data.selectedOrganizationId, lineId = first.data.lines[0].id;
const second = await call("dashboard");
eq(second.data.selectedOrganizationId, orgId, "stable onboarding");
eq(second.data.lines.length, 1, "no duplicate onboarding lines");
eq((await call("dashboard", { user: "owner-b", query: "?organizationId=" + orgId })).status, 404, "cross-account read denied");
const bob = await call("dashboard", { user: "owner-b" });
const orgBody = { requestId: webcrypto.randomUUID(), name: "Second plant", site: "Cavite" };
eq((await call("organizations", { body: orgBody })).status, 201, "create facility");
eq((await call("organizations", { body: orgBody })).status, 200, "facility retry idempotent");
eq((await call("organizations", { user: "owner-b", body: orgBody })).status, 409, "facility id collision protected");
eq((await call("organizations", { body: { ...orgBody, requestId: webcrypto.randomUUID(), name: " " } })).status, 400, "facility validation");
eq((await call("dashboard", { query: "?organizationId=" + orgBody.requestId })).data.lines.length, 0, "new facility has no fake equipment");
const lineBody = { requestId: webcrypto.randomUUID(), organizationId: orgBody.requestId, name: "Pack line", product: "Dumplings", targetRate: 80 };
eq((await call("lines", { body: lineBody })).status, 201, "create line");
eq((await call("lines", { body: lineBody })).status, 200, "line retry idempotent");
eq((await call("lines", { user: "owner-b", body: lineBody })).status, 404, "cross-account line write denied");
eq((await call("lines", { body: { ...lineBody, targetRate: 0 } })).status, 400, "line rate validation");
eq({ ...sqlite.prepare("SELECT status, current_rate, quality_score FROM production_lines WHERE id = ?").get(lineBody.requestId) }, { status: "setup", current_rate: 0, quality_score: 0 }, "no invented live output on new line");
const sample = { organizationId: orgId, lineId, scenario: "missing-item", requestId: webcrypto.randomUUID() };
eq((await call("inspect", { body: sample })).status, 201, "save sample");
eq((await call("inspect", { body: sample })).status, 200, "sample retry idempotent");
eq((await call("inspect", { body: { ...sample, scenario: "pack-pass" } })).status, 409, "cannot reuse sample id with different scenario");
eq((await call("inspect", { body: { ...sample, requestId: webcrypto.randomUUID(), scenario: "__proto__" } })).status, 400, "prototype scenario rejected");
eq((await call("inspect", { body: { ...sample, requestId: webcrypto.randomUUID(), lineId: bob.data.lines[0].id } })).status, 404, "line must belong to selected facility");
eq((await call("inspect", { user: "owner-b", body: sample })).status, 404, "cross-account inspection denied");
eq((await call("inspect", { body: sample, headers: { origin: "https://other.test" } })).status, 403, "cross-origin mutation rejected");
eq((await call("inspect", { body: sample, headers: { "sec-fetch-site": "cross-site" } })).status, 403, "cross-site request rejected");
eq((await call("inspect", { body: sample, headers: { "content-type": "text/plain" } })).status, 415, "content type enforced");
eq((await call("inspect", { body: { padding: "x".repeat(17000) } })).status, 413, "streamed body bounded");
const saved = (await call("dashboard")).data;
eq(saved.metrics, { total: 1, passes: 0, needsReview: 1, reviewed: 0 }, "summary comes from saved records");
eq(saved.events[0].source, "demo", "demo source retained");
eq(saved.events[0].expected, "6 items", "expected evidence saved");
eq(saved.events[0].observed, "5 items", "observed evidence saved");
eq("confidence" in saved.events[0], false, "no fake confidence exposed");
const reviewBody = { organizationId: orgId, eventId: sample.requestId, status: "confirmed", note: "Verified the empty compartment in this sample." };
eq((await call("review", { user: "owner-b", body: reviewBody })).status, 404, "cross-account review denied");
eq((await call("review", { body: { ...reviewBody, note: " " } })).status, 400, "review needs a note");
eq((await call("review", { body: reviewBody })).status, 200, "review saved");
eq((await call("review", { body: reviewBody })).status, 200, "review retry idempotent");
eq((await call("review", { body: { ...reviewBody, status: "dismissed" } })).status, 409, "review cannot be silently overwritten");
const reviewed = (await call("dashboard")).data;
eq(reviewed.metrics, { total: 1, passes: 0, needsReview: 0, reviewed: 1 }, "review totals updated");
eq(reviewed.events[0].reviewNote, reviewBody.note, "review survives reload");
eq(sqlite.prepare("SELECT reviewed_by FROM inspection_events WHERE id = ?").get(sample.requestId).reviewed_by, "owner-a", "review attribution saved");
eq((await call("inspect", { body: { ...sample, scenario: "pack-pass", requestId: webcrypto.randomUUID() } })).status, 201, "passing sample saved");
eq((await call("dashboard")).data.metrics.passes, 1, "pass total updated");
eq(client.csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"', "CSV formula guarded");
eq(client.csvCell('Text, "quoted"'), '"Text, ""quoted"""', "CSV quotes escaped");
eq(client.csvCell("  +SUM(1,2)"), '"\'  +SUM(1,2)"', "CSV leading spaces guarded");
const schemaColumns = sqlite.prepare("PRAGMA table_info(inspection_events)").all();
eq(schemaColumns.length, 17, "schema migration complete");
sqlite.close();
console.log("PASS: " + checks + " focused checks (in-memory SQLite and real route handlers; not browser or Cloudflare runtime verification).");
