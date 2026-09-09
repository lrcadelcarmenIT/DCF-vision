import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  site: text("site").notNull(),
  createdAt: text("created_at").notNull(),
}, (t) => [index("idx_organizations_owner_id").on(t.ownerId)]);

export const productionLines = sqliteTable("production_lines", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  product: text("product").notNull(),
  status: text("status").notNull(),
  targetRate: integer("target_rate").notNull(),
  currentRate: integer("current_rate").notNull(),
  qualityScore: real("quality_score").notNull(),
  downtimeMinutes: integer("downtime_minutes").notNull(),
  createdAt: text("created_at").notNull(),
}, (t) => [index("idx_production_lines_org_id").on(t.organizationId)]);

export const inspectionEvents = sqliteTable("inspection_events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  lineId: text("line_id").notNull().references(() => productionLines.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  status: text("status").notNull(),
  confidence: real("confidence").notNull(),
  message: text("message").notNull(),
  affectedUnits: integer("affected_units").notNull(),
  createdAt: text("created_at").notNull(),
  source: text("source").notNull().default("demo"),
  scenario: text("scenario"),
  expected: text("expected"),
  observed: text("observed"),
  reviewStatus: text("review_status").notNull().default("unreviewed"),
  reviewNote: text("review_note").notNull().default(""),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by"),
}, (t) => [
  index("idx_inspection_events_org_created").on(t.organizationId, t.createdAt),
  index("idx_inspection_events_line_created").on(t.lineId, t.createdAt),
]);
