"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowRight, Building2, Check, CheckCircle2, ClipboardList, Download, Factory, FileText, Info, Loader2, Plus, RefreshCw, ScanLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Brand } from "./brand";
import { InspectionEvidence } from "./inspection-evidence";
import { csvCell, requestJson } from "@/lib/dcf-client";
import { modules, scenarios, type DashboardData, type InspectionEvent, type ModuleKey, type ScenarioKey } from "@/lib/dcf-demo";

type Notice = { text: string; error?: boolean };
const moduleIcons = { package: ScanLine, label: FileText, count: ClipboardList, downtime: AlertTriangle };
function dateTime(value: string) { return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
function errorText(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }
function Status({ status }: { status: string }) {
  return <span className={"status-label status-" + status}>{status === "pass" || status === "confirmed" ? <CheckCircle2 /> : status === "alert" || status === "warning" ? <AlertTriangle /> : null}{({ pass: "Pass", alert: "Flagged", warning: "Flagged", unreviewed: "Not reviewed", confirmed: "Confirmed", dismissed: "Dismissed" } as Record<string, string>)[status] ?? status}</span>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lineId, setLineId] = useState("");
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("missing-item");
  const [tab, setTab] = useState("inspect");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const loadSequence = useRef(0);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const runRequest = useRef<{ key: string; id: string } | null>(null);
  const formRequest = useRef<{ key: string; id: string } | null>(null);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [recordFilter, setRecordFilter] = useState("all");

  const load = useCallback(async (requested?: string, signal?: AbortSignal) => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    try {
      const next = await requestJson<DashboardData>("/api/dashboard" + (requested ? "?organizationId=" + encodeURIComponent(requested) : ""), undefined, signal);
      if (sequence !== loadSequence.current || signal?.aborted) return;
      setData(next);
      setLineId(current => next.lines.some(item => item.id === current) ? current : next.lines[0]?.id ?? "");
    } finally { if (sequence === loadSequence.current && !signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(undefined, controller.signal).catch(error => { if (!controller.signal.aborted) setNotice({ text: errorText(error), error: true }); });
    return () => controller.abort();
  }, [load]);

  const organization = data?.organizations.find(item => item.id === data.selectedOrganizationId);
  const line = data?.lines.find(item => item.id === lineId);
  const scenario = scenarios[scenarioKey];
  const selectedRecord = data?.events.find(item => item.id === recordId);
  const lastSaved = data?.events.find(item => item.id === lastSavedId);
  const unavailable = busy || loading;
  const filteredEvents = (data?.events ?? []).filter(item => {
    const matchesText = (item.message + " " + item.lineName + " " + modules[item.category]).toLowerCase().includes(search.toLowerCase());
    const matchesFilter = recordFilter === "all" || (recordFilter === "pending" ? item.status !== "pass" && item.reviewStatus === "unreviewed" : recordFilter === "reviewed" ? item.reviewStatus !== "unreviewed" : item.status === "pass");
    return matchesText && matchesFilter;
  });

  async function refresh() {
    setNotice(null);
    try { await load(data?.selectedOrganizationId); } catch (error) { setNotice({ text: errorText(error), error: true }); }
  }
  async function switchFacility(id: string) {
    setNotice(null); setRecordId(null); setLastSavedId(null); setSearch(""); setRecordFilter("all");
    try { await load(id); } catch (error) { setNotice({ text: errorText(error), error: true }); }
  }
  function chooseScenario(key: ScenarioKey) { setScenarioKey(key); setLastSavedId(null); setNotice(null); }
  async function runDemo() {
    if (!data || !line || busyRef.current || loading) return;
    busyRef.current = true; setBusy(true); setNotice(null);
    const key = data.selectedOrganizationId + ":" + line.id + ":" + scenarioKey;
    if (runRequest.current?.key !== key) runRequest.current = { key, id: crypto.randomUUID() };
    try {
      const result = await requestJson<{ id: string }>("/api/inspect", { organizationId: data.selectedOrganizationId, lineId: line.id, scenario: scenarioKey, requestId: runRequest.current.id });
      runRequest.current = null;
      setLastSavedId(result.id);
      setNotice({ text: "Demo result saved. No camera analysis or machine action was performed." });
      try { await load(data.selectedOrganizationId); }
      catch { setNotice({ text: "Your result was saved, but the list could not refresh. Use Refresh to retrieve it.", error: true }); }
    } catch (error) { setNotice({ text: errorText(error), error: true }); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function createRecord(event: FormEvent<HTMLFormElement>, kind: "facility" | "line") {
    event.preventDefault();
    if (busyRef.current || !data) return;
    const values = new FormData(event.currentTarget);
    busyRef.current = true; setBusy(true); setFormError("");
    try {
      const body = kind === "facility" ? { name: values.get("name"), site: values.get("site") } : { organizationId: data.selectedOrganizationId, name: values.get("name"), product: values.get("product"), targetRate: Number(values.get("targetRate")) };
      const key = kind + ":" + JSON.stringify(body);
      if (formRequest.current?.key !== key) formRequest.current = { key, id: crypto.randomUUID() };
      const result = await requestJson<{ id: string }>(kind === "facility" ? "/api/organizations" : "/api/lines", { ...body, requestId: formRequest.current.id });
      formRequest.current = null;
      if (kind === "facility") { setFacilityOpen(false); setRecordId(null); setLastSavedId(null); } else { setLineOpen(false); setLineId(result.id); }
      setNotice({ text: kind === "facility" ? "Facility saved. Add its first production line to begin." : "Line configuration saved. No camera is connected." });
      try { await load(kind === "facility" ? result.id : data.selectedOrganizationId); }
      catch { setNotice({ text: "The record was saved, but the list could not refresh. Use Refresh to retrieve it.", error: true }); }
    } catch (error) { setFormError(errorText(error)); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function review(eventId: string, status: string, note: string) {
    if (!data || busyRef.current) throw new Error("Please wait for the current operation.");
    busyRef.current = true; setBusy(true);
    try {
      await requestJson("/api/review", { organizationId: data.selectedOrganizationId, eventId, status, note });
      setData(current => current ? { ...current, events: current.events.map(item => item.id === eventId ? { ...item, reviewStatus: status, reviewNote: note, reviewedAt: new Date().toISOString() } : item) } : current);
      setNotice({ text: "Review saved to the demo record." });
      try { await load(data.selectedOrganizationId); }
      catch { setNotice({ text: "Review saved. Refresh to update the summary totals.", error: true }); }
    } finally { busyRef.current = false; setBusy(false); }
  }
  function exportRecords(events: InspectionEvent[]) {
    const rows = [["Source", "Facility", "Line", "Module", "Scenario", "Outcome", "Expected", "Preset observation", "Message", "Created at (UTC)", "Review", "Review note", "Reviewed at (UTC)"], ...events.map(item => ["DEMO — NOT PRODUCTION DATA", organization?.name ?? "", item.lineName, modules[item.category], item.scenario ?? "Earlier simulator", item.status, item.expected ?? "", item.observed ?? "", item.message, item.createdAt, item.reviewStatus, item.reviewNote, item.reviewedAt ?? ""])];
    const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "dcf-vision-demo-records.csv"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="workspace">
    <a className="skip-link" href="#workspace-content">Skip to workspace</a>
    <header className="workspace-header"><Brand /><span className="workspace-breadcrumb">/ Control room</span><a className="text-link" href="/">Product website <ArrowRight /></a></header>
    <div className="workspace-body" id="workspace-content">
      <div className="workspace-title"><div><p className="overline">YOUR FACILITIES / INSPECTION WORKSPACE</p><h1>Control room</h1><p>Configure a line. Run a sample. Review the evidence.</p></div>
        <div className="workspace-tools">
          {data && <Select value={data.selectedOrganizationId} onValueChange={switchFacility} disabled={unavailable}><SelectTrigger className="facility-picker" aria-label="Select facility"><Building2 /><SelectValue /></SelectTrigger><SelectContent>{data.organizations.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>}
          <Dialog open={facilityOpen} onOpenChange={value => { if (!busy) { setFacilityOpen(value); setFormError(""); } }}><DialogTrigger asChild><Button variant="outline" disabled={unavailable || !data}><Plus />Facility</Button></DialogTrigger>
            <DialogContent className="workspace-dialog"><DialogHeader><DialogTitle>Add a facility</DialogTitle><DialogDescription>This facility is private to your signed-in account. Shared team access is not connected yet.</DialogDescription></DialogHeader>
              <form className="field-form" onSubmit={event => createRecord(event, "facility")}><Label htmlFor="facility-name">Company or plant name</Label><Input id="facility-name" name="name" minLength={2} maxLength={80} required placeholder="Example: North Plant" disabled={busy} /><Label htmlFor="facility-site">Location</Label><Input id="facility-site" name="site" minLength={2} maxLength={80} required placeholder="City or site" disabled={busy} />{formError && <p className="inline-error" role="alert">{formError}</p>}<DialogFooter><Button type="submit" disabled={busy}>{busy ? <Loader2 className="spin" /> : <Plus />}Save facility</Button></DialogFooter></form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={refresh} disabled={unavailable} aria-label="Refresh workspace"><RefreshCw className={loading ? "spin" : ""} /></Button>
        </div>
      </div>

      <div className="demo-banner"><Info /><div><strong>Demonstration workspace</strong><span>All outcomes are simulated. No camera, vision model or reject mechanism is connected.</span></div><span className="quiet-tag">DEMO MODE</span></div>
      {notice && <div className={"notice " + (notice.error ? "notice-error" : "")} role={notice.error ? "alert" : "status"}>{notice.error ? <AlertTriangle /> : <CheckCircle2 />}<span>{notice.text}</span>{notice.error && <Button variant="outline" onClick={refresh} disabled={unavailable}>Retry refresh</Button>}</div>}

      {!data ? loading ? <div className="workspace-loading" aria-label="Loading workspace"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /><p>Opening your saved workspace…</p></div> : <div className="empty-surface"><Factory /><h2>Your workspace could not be loaded</h2><p>Try again. If your session has ended, sign in to reopen it.</p><div className="button-row"><Button onClick={refresh}>Try again</Button><Button asChild variant="outline"><a href="/signin-with-chatgpt?return_to=%2Fcontrol-room" target="_top">Sign in with ChatGPT</a></Button></div></div> : <>
        <div className="facility-context"><span><Building2 />{organization?.name}<small>{organization?.site}</small></span><span className="secondary-text">Retrieved {dateTime(data.updatedAt)} · manual refresh</span></div>
        <section className="summary-strip" aria-label="All-time demo record totals">
          <div><span>Saved demo records</span><strong>{data.metrics.total.toLocaleString()}</strong><small>All time · this facility</small></div>
          <div><span>Flagged, awaiting review</span><strong className={data.metrics.needsReview ? "attention-text" : ""}>{data.metrics.needsReview.toLocaleString()}</strong><small>Not a production alarm count</small></div>
          <div><span>Passing demo outcomes</span><strong>{data.metrics.passes.toLocaleString()}</strong><small>Not a measured accuracy rate</small></div>
          <div><span>Reviewed records</span><strong>{data.metrics.reviewed.toLocaleString()}</strong><small>Saved human decisions</small></div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="workspace-tabs">
          <TabsList variant="line" className="workspace-tab-list" aria-label="Control room sections"><TabsTrigger value="inspect"><ScanLine />Inspect</TabsTrigger><TabsTrigger value="records"><ClipboardList />Records</TabsTrigger><TabsTrigger value="lines"><Factory />Production lines</TabsTrigger><TabsTrigger value="reports"><FileText />Reports</TabsTrigger></TabsList>
          <TabsContent value="inspect">
            <div className="inspection-grid">
              <section className="surface evidence-surface"><div className="surface-header"><div><p className="overline">INSPECTION EVIDENCE</p><h2>{scenario.title}</h2></div><span className="quiet-tag">SAMPLE</span></div><InspectionEvidence scenarioKey={scenarioKey} /><div className="evidence-bottom"><span>Source: {scenario.evidence === "sample-tray-v1" ? "generated sample image" : "fixed scenario values"}</span><span>Model: not connected</span></div></section>
              <section className="surface demo-controls"><div className="surface-header"><div><p className="overline">RUN A DEMONSTRATION</p><h2>Inspection setup</h2></div><span className="step-number">01—03</span></div>
                <div className="control-fields"><Label htmlFor="line-select">01 / Assign a production line</Label>{data.lines.length ? <Select value={lineId} onValueChange={value => { setLineId(value); setLastSavedId(null); }} disabled={unavailable}><SelectTrigger id="line-select" className="full-select"><SelectValue /></SelectTrigger><SelectContent>{data.lines.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select> : <Button variant="outline" onClick={() => { setFormError(""); setLineOpen(true); }}><Plus />Add your first line</Button>}
                  <Label htmlFor="scenario-select">02 / Choose a sample scenario</Label><Select value={scenarioKey} onValueChange={value => chooseScenario(value as ScenarioKey)} disabled={unavailable}><SelectTrigger id="scenario-select" className="full-select"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(scenarios).map(([key, item]) => <SelectItem value={key} key={key}>{modules[item.category]} · {item.title}</SelectItem>)}</SelectContent></Select>
                  <div className="scenario-library" aria-label="All sample scenarios">
                    {Object.entries(scenarios).map(([key, item]) => <button type="button" key={key} className={"scenario-card" + (scenarioKey === key ? " is-selected" : "")} onClick={() => chooseScenario(key as ScenarioKey)} disabled={unavailable}>
                      <span>{modules[item.category]}</span><strong>{item.title}</strong><small>{item.expected} → {item.observed}</small>
                    </button>)}
                  </div>
                  <dl className="comparison"><div><dt>Expected</dt><dd>{scenario.expected}</dd></div><div><dt>Preset observation</dt><dd>{scenario.observed}</dd></div></dl>
                  <div className="predetermined"><Status status={scenario.status} /><span>Predetermined demo outcome</span></div>
                  <Label>03 / Save this sample result</Label><Button className="run-button" onClick={runDemo} disabled={unavailable || !line}>{busy ? <Loader2 className="spin" /> : <ScanLine />}{busy ? "Saving…" : "Run & save demo"}</Button><p className="helper-text">Saves this fixed scenario to {line?.name ?? "your selected line"}. Does not analyze the image.</p>
                  {lastSaved && <div className="saved-result" role="status"><Check />Result saved<Button variant="link" onClick={() => setRecordId(lastSaved.id)}>Review record <ArrowRight /></Button></div>}
                </div>
              </section>
            </div>
            <section className="surface recent-surface"><div className="surface-header"><div><p className="overline">SAVED IN THIS FACILITY</p><h2>Recent demo records</h2></div><Button variant="ghost" onClick={() => setTab("records")}>View records <ArrowRight /></Button></div><RecordTable events={data.events.slice(0, 4)} onOpen={setRecordId} empty="No demo results yet. Choose a scenario above and save your first result." /></section>
          </TabsContent>
          <TabsContent value="records"><section className="surface">
            <div className="surface-header"><div><p className="overline">EVIDENCE & DECISIONS</p><h2>Inspection records</h2></div><Button variant="outline" disabled={!filteredEvents.length} onClick={() => exportRecords(filteredEvents)}><Download />Export filtered CSV</Button></div>
            <div className="record-toolbar"><div className="search-field"><Search /><Input aria-label="Search records" placeholder="Search line or finding…" value={search} onChange={event => setSearch(event.target.value)} /></div><Select value={recordFilter} onValueChange={setRecordFilter}><SelectTrigger aria-label="Filter records" className="filter-picker"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All records</SelectItem><SelectItem value="pending">Flagged, awaiting review</SelectItem><SelectItem value="reviewed">Reviewed</SelectItem><SelectItem value="pass">Passing outcomes</SelectItem></SelectContent></Select></div>
            <p className="table-scope">{filteredEvents.length} matching records in the latest {data.events.length} loaded. {data.metrics.total > 100 ? "The view and export are limited to the latest 100 records." : "All saved records are loaded."} All data is simulated.</p>
            <RecordTable events={filteredEvents} onOpen={setRecordId} empty={data.events.length ? "No records match these filters." : "No demo results yet. Open Inspect to save a sample result."} />
          </section></TabsContent>
          <TabsContent value="lines"><section className="surface"><div className="surface-header"><div><p className="overline">FACILITY CONFIGURATION</p><h2>Production lines</h2></div><Button onClick={() => { setFormError(""); setLineOpen(true); }} disabled={unavailable}><Plus />Add line</Button></div><p className="table-scope">These are saved configurations, not connected machines. Targets are entered manually; no live output is available.</p>{!data.lines.length ? <div className="empty-surface"><Factory /><h3>Add the first line for this facility</h3><p>Save a name, product and target rate. Camera setup comes later.</p></div> : <Table><TableHeader><TableRow><TableHead>Line / product</TableHead><TableHead>Configured target</TableHead><TableHead>Connection</TableHead><TableHead><span className="sr-only">Action</span></TableHead></TableRow></TableHeader><TableBody>{data.lines.map(item => <TableRow key={item.id}><TableCell><strong>{item.name}</strong><span className="cell-secondary">{item.product} · {item.code}</span></TableCell><TableCell>{item.targetRate} units / minute</TableCell><TableCell><span className="quiet-tag">Not connected</span></TableCell><TableCell><Button variant="ghost" onClick={() => { setLineId(item.id); setLastSavedId(null); setTab("inspect"); }}>Use in demo <ArrowRight /></Button></TableCell></TableRow>)}</TableBody></Table>}</section></TabsContent>
          <TabsContent value="reports"><div className="report-layout"><section className="surface"><div className="surface-header"><div><p className="overline">LATEST RECORDS / MODULE BREAKDOWN</p><h2>Demonstration summary</h2></div><Button variant="outline" disabled={!data.events.length} onClick={() => exportRecords(data.events)}><Download />Export CSV</Button></div><p className="table-scope">Based on the latest {data.events.length} records, not a production shift. Exports include sample source, timestamps and review notes.</p><Table><TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Records</TableHead><TableHead>Flagged</TableHead><TableHead>Reviewed</TableHead></TableRow></TableHeader><TableBody>{Object.entries(modules).map(([key, label]) => { const items = data.events.filter(item => item.category === key); return <TableRow key={key}><TableCell>{label}</TableCell><TableCell>{items.length}</TableCell><TableCell>{items.filter(item => item.status !== "pass").length}</TableCell><TableCell>{items.filter(item => item.reviewStatus !== "unreviewed").length}</TableCell></TableRow>; })}</TableBody></Table></section>
            <section className="surface readiness"><p className="overline">BEFORE A CUSTOMER ROLLOUT</p><h2>What still needs proving</h2><ul><li><Check />Facility, line and demo record storage</li><li><Check />Review notes and CSV export</li><li><span>—</span>Real camera or video ingestion</li><li><span>—</span>Trained and validated detection models</li><li><span>—</span>Shared company accounts and roles</li><li><span>—</span>Machine integration and plant acceptance</li></ul><p>Do not use these demo results for production quality decisions or claim measured savings.</p></section>
          </div></TabsContent>
        </Tabs>
      </>}
      <Dialog open={lineOpen} onOpenChange={value => { if (!busy) { setLineOpen(value); setFormError(""); } }}><DialogContent className="workspace-dialog"><DialogHeader><DialogTitle>Add a production line</DialogTitle><DialogDescription>Save a configuration in {organization?.name}. This does not connect or control any equipment.</DialogDescription></DialogHeader><form className="field-form" onSubmit={event => createRecord(event, "line")}><Label htmlFor="line-name">Line name</Label><Input id="line-name" name="name" minLength={2} maxLength={80} required disabled={busy} placeholder="Packaging line 02" /><Label htmlFor="line-product">Product</Label><Input id="line-product" name="product" minLength={2} maxLength={100} required disabled={busy} placeholder="Six-piece dumpling trays" /><Label htmlFor="line-target">Target output (units per minute)</Label><Input id="line-target" name="targetRate" type="number" min={1} max={10000} step={1} defaultValue={120} required disabled={busy} />{formError && <p className="inline-error" role="alert">{formError}</p>}<DialogFooter><Button type="submit" disabled={busy}>{busy ? <Loader2 className="spin" /> : <Plus />}Save line</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={Boolean(selectedRecord)} onOpenChange={open => { if (!open && !busy) setRecordId(null); }}><DialogContent className="workspace-dialog record-dialog">{selectedRecord && <RecordDetail key={selectedRecord.id} record={selectedRecord} busy={busy} onReview={review} />}</DialogContent></Dialog>
    </div>
    <footer className="workspace-footer"><span>DCF VISION / DEMONSTRATION</span><span>Christian Del Carmen & Steven Flogio · Co-founders</span></footer>
  </main>;
}

function RecordTable({ events, onOpen, empty }: { events: InspectionEvent[]; onOpen: (id: string) => void; empty: string }) {
  if (!events.length) return <div className="empty-records"><ClipboardList /><p>{empty}</p></div>;
  return <Table><TableHeader><TableRow><TableHead>Finding / production line</TableHead><TableHead>Outcome</TableHead><TableHead>Review</TableHead><TableHead>Recorded</TableHead><TableHead><span className="sr-only">Open record</span></TableHead></TableRow></TableHeader><TableBody>{events.map(item => { const Icon = moduleIcons[item.category] ?? ClipboardList; return <TableRow key={item.id}><TableCell><div className="record-finding"><Icon /><div><strong>{item.message}</strong><span className="cell-secondary">{item.lineName} · {modules[item.category]} · Demo</span></div></div></TableCell><TableCell><Status status={item.status} /></TableCell><TableCell><Status status={item.reviewStatus} /></TableCell><TableCell><time dateTime={item.createdAt}>{dateTime(item.createdAt)}</time></TableCell><TableCell><Button variant="ghost" onClick={() => onOpen(item.id)} aria-label={"Review: " + item.message}>Open <ArrowRight /></Button></TableCell></TableRow>; })}</TableBody></Table>;
}

function RecordDetail({ record, busy, onReview }: { record: InspectionEvent; busy: boolean; onReview: (id: string, status: string, note: string) => Promise<void> }) {
  const [note, setNote] = useState(record.reviewNote);
  const [decision, setDecision] = useState("confirmed");
  const [error, setError] = useState("");
  const scenario = record.scenario && Object.hasOwn(scenarios, record.scenario) ? scenarios[record.scenario as ScenarioKey] : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    try { await onReview(record.id, decision, note); } catch (error) { setError(errorText(error)); }
  }
  return <><DialogHeader><DialogTitle>Review demo record</DialogTitle><DialogDescription>{record.lineName} · {dateTime(record.createdAt)} · Simulated outcome</DialogDescription></DialogHeader><div className="record-detail-body"><div className="record-outcome"><Status status={record.status} /><h3>{record.message}</h3></div><InspectionEvidence scenarioKey={record.scenario} />{scenario && <p className="helper-text">{scenario.action}</p>}
    <dl className="record-metadata"><div><dt>Record ID</dt><dd>{record.id}</dd></div><div><dt>Evidence source</dt><dd>{scenario?.evidence === "sample-tray-v1" ? "Generated sample / preset annotation" : "Preset simulator values"}</dd></div><div><dt>Model inference</dt><dd>None performed</dd></div></dl>
    {record.reviewStatus === "unreviewed" ? <form className="field-form" onSubmit={submit}><Label htmlFor="review-decision">Your decision</Label><Select value={decision} onValueChange={setDecision} disabled={busy}><SelectTrigger id="review-decision" className="full-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="confirmed">Confirm sample outcome</SelectItem><SelectItem value="dismissed">Dismiss sample outcome</SelectItem></SelectContent></Select><Label htmlFor="review-note">Review note</Label><Textarea id="review-note" value={note} onChange={event => setNote(event.target.value)} minLength={3} maxLength={1000} required disabled={busy} placeholder="What did you verify, and why?" /><p className="helper-text">This review is saved as a final demo decision. It does not reject a product or operate a machine.</p>{error && <p className="inline-error" role="alert">{error}</p>}<Button type="submit" disabled={busy || note.trim().length < 3}>{busy ? <Loader2 className="spin" /> : <Check />}Save review</Button></form> : <div className="review-receipt"><Status status={record.reviewStatus} /><p>{record.reviewNote}</p>{record.reviewedAt && <span>Reviewed {dateTime(record.reviewedAt)}</span>}</div>}
  </div></>;
}
