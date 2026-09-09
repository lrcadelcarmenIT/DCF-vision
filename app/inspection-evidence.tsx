import Image from "next/image";
import { FileText, ScanLine } from "lucide-react";
import { scenarios, type ScenarioKey } from "@/lib/dcf-demo";

export function InspectionEvidence({ scenarioKey, highlighted = true }: { scenarioKey: string | null; highlighted?: boolean }) {
  const scenario = scenarioKey && Object.hasOwn(scenarios, scenarioKey) ? scenarios[scenarioKey as ScenarioKey] : null;
  if (scenarioKey === "missing-item") return <figure className="evidence-figure">
    <div className="evidence-image">
      <Image src="/inspection-sample.png" alt="Generated sample: five dumplings in a six-compartment tray, with the bottom-right compartment empty." width={1536} height={1024} sizes="(max-width: 800px) 100vw, 60vw" priority />
      {highlighted && <div className="sample-annotation"><span>01 / Empty compartment</span></div>}
    </div>
    <figcaption><ScanLine aria-hidden="true" />Generated sample image · preset annotation, not an AI detection</figcaption>
  </figure>;
  return <div className="preset-evidence"><FileText aria-hidden="true" /><p className="overline">{scenario ? "SCENARIO DATA" : "EARLIER DEMO RECORD"}</p><h3>{scenario?.title ?? "No image attached"}</h3><p>{scenario ? "This scenario uses fixed values to demonstrate a decision. It has no camera image or video." : "This record was created by an earlier simulator. Its original message is preserved; it is not a measured production result."}</p>{scenario && <dl className="comparison"><div><dt>Expected</dt><dd>{scenario.expected}</dd></div><div><dt>Preset observation</dt><dd>{scenario.observed}</dd></div></dl>}</div>;
}
