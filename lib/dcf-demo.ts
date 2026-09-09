/** Fixed teaching scenarios. No image analysis or model inference is performed. */
export const modules = { package: "Pack inspection", label: "Label verification", count: "Count & throughput", downtime: "Line stops" } as const;
export type ModuleKey = keyof typeof modules;
export const scenarios = {
  "missing-item": { category: "package", title: "One item missing", status: "alert", message: "Tray contains 5 of the 6 expected items.", expected: "6 items", observed: "5 items", affectedUnits: 1, evidence: "sample-tray-v1", action: "Review the highlighted compartment; in a plant pilot, verify with an operator before deciding what to do." },
  "pack-pass": { category: "package", title: "Complete pack", status: "pass", message: "The preset pack count matches the expected count.", expected: "6 items", observed: "6 items", affectedUnits: 0, evidence: "preset-values", action: "Record the sample outcome. This scenario has no camera image." },
  "label-unreadable": { category: "label", title: "Unreadable date code", status: "alert", message: "The preset date-code reading is blank.", expected: "Readable date code", observed: "No readable value", affectedUnits: 1, evidence: "preset-values", action: "In a plant pilot, check print contrast, lighting and the approved label template." },
  "label-pass": { category: "label", title: "Matching date code", status: "pass", message: "The preset printed date matches the reference.", expected: "2027-03-01", observed: "2027-03-01", affectedUnits: 0, evidence: "preset-values", action: "Record the sample match. No OCR or barcode decoding has been performed." },
  "count-short": { category: "count", title: "Output below target", status: "warning", message: "The preset one-minute count is 8 units below target.", expected: "120 units / minute", observed: "112 units / minute", affectedUnits: 8, evidence: "preset-values", action: "Review the variance. A real pilot needs calibrated counting and a verified time window." },
  "count-pass": { category: "count", title: "Target count reached", status: "pass", message: "The preset one-minute output matches its target.", expected: "120 units / minute", observed: "120 units / minute", affectedUnits: 0, evidence: "preset-values", action: "Record the sample outcome. This does not measure the selected line's actual output." },
  "line-stop": { category: "downtime", title: "24-second stop", status: "warning", message: "A preset 24-second stop exceeds the 10-second threshold.", expected: "Stop less than 10 seconds", observed: "24 seconds", affectedUnits: 0, evidence: "preset-values", action: "In a plant pilot, confirm the stop cause with the operator. No equipment is controlled here." },
  "line-moving": { category: "downtime", title: "No extended stop", status: "pass", message: "The preset stop duration is below the threshold.", expected: "Stop less than 10 seconds", observed: "2 seconds", affectedUnits: 0, evidence: "preset-values", action: "Record the sample outcome. No real motion tracking has been performed." },
} as const;
export type ScenarioKey = keyof typeof scenarios;

export type Organization = { id: string; name: string; site: string };
export type ProductionLine = { id: string; name: string; code: string; product: string; targetRate: number };
export type InspectionEvent = {
  id: string; lineId: string; lineName: string; category: ModuleKey; status: string;
  message: string; affectedUnits: number; createdAt: string; source: string;
  scenario: string | null; expected: string | null; observed: string | null;
  reviewStatus: string; reviewNote: string; reviewedAt: string | null;
};
export type DashboardData = {
  organizations: Organization[]; selectedOrganizationId: string; lines: ProductionLine[]; events: InspectionEvent[];
  metrics: { total: number; passes: number; needsReview: number; reviewed: number };
  updatedAt: string;
};
