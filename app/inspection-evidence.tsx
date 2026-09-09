import Image from "next/image";
import { FileText, ScanLine } from "lucide-react";
import { scenarios, type ScenarioKey } from "@/lib/dcf-demo";

const visualScenarios: Record<string, { className: string; kicker: string; metric: string; caption: string }> = {
  "pack-pass": { className: "visual-pack-pass", kicker: "PACK INSPECTION", metric: "6 / 6", caption: "Generated line view · complete pack preset" },
  "label-unreadable": { className: "visual-label-unreadable", kicker: "LABEL VERIFICATION", metric: "OCR ?", caption: "Generated line view · unreadable code preset" },
  "label-pass": { className: "visual-label-pass", kicker: "LABEL VERIFICATION", metric: "MATCH", caption: "Generated line view · matching code preset" },
  "count-short": { className: "visual-count-short", kicker: "THROUGHPUT", metric: "112 / 120", caption: "Generated line view · below-target count preset" },
  "count-pass": { className: "visual-count-pass", kicker: "THROUGHPUT", metric: "120 / 120", caption: "Generated line view · target count preset" },
  "line-stop": { className: "visual-line-stop", kicker: "LINE STOPS", metric: "24 sec", caption: "Generated line view · extended-stop preset" },
  "line-moving": { className: "visual-line-moving", kicker: "LINE STOPS", metric: "2 sec", caption: "Generated line view · moving-line preset" },
};

export function InspectionEvidence({ scenarioKey, highlighted = true }: { scenarioKey: string | null; highlighted?: boolean }) {
  const scenario = scenarioKey && Object.hasOwn(scenarios, scenarioKey) ? scenarios[scenarioKey as ScenarioKey] : null;
  if (scenarioKey === "missing-item") return <figure className="evidence-figure">
    <div className="evidence-image">
      <Image src="/inspection-sample.png" alt="Generated sample: five dumplings in a six-compartment tray, with the bottom-right compartment empty." width={1536} height={1024} sizes="(max-width: 800px) 100vw, 60vw" priority />
      {highlighted && <div className="sample-annotation"><span>01 / Empty compartment</span></div>}
    </div>
    <figcaption><ScanLine aria-hidden="true" />Generated sample image · preset annotation, not an AI detection</figcaption>
  </figure>;
  const visual = scenarioKey ? visualScenarios[scenarioKey] : null;
  if (scenario && visual) return <figure className="evidence-figure">
    <div className={"scenario-visual " + visual.className}>
      <Image src="/dcf-vision-hero.png" alt={scenario.title + " visual demonstration"} width={1536} height={1024} sizes="(max-width: 800px) 100vw, 60vw" />
      <div className="scenario-visual-wash" />
      <div className="scenario-visual-readout"><span>{visual.kicker}</span><strong>{visual.metric}</strong><small>{scenario.title}</small></div>
      <div className="scenario-visual-signal"><i />{scenario.status === "pass" ? "Preset pass" : "Preset flagged"}</div>
    </div>
    <figcaption><ScanLine aria-hidden="true" />{visual.caption} · not an AI detection</figcaption>
  </figure>;
  return <div className="preset-evidence"><FileText aria-hidden="true" /><p className="overline">{scenario ? "SCENARIO DATA" : "EARLIER DEMO RECORD"}</p><h3>{scenario?.title ?? "No image attached"}</h3><p>{scenario ? "This scenario uses fixed values to demonstrate a decision. It has no camera image or video." : "This record was created by an earlier simulator. Its original message is preserved; it is not a measured production result."}</p>{scenario && <dl className="comparison"><div><dt>Expected</dt><dd>{scenario.expected}</dd></div><div><dt>Preset observation</dt><dd>{scenario.observed}</dd></div></dl>}</div>;
}
