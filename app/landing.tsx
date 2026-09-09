"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Check, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "./brand";
import { InspectionEvidence } from "./inspection-evidence";

const chapters = [
  { title: "Start with the product.", body: "A six-piece tray. Five items inside. The walkthrough starts with a deliberately incomplete sample.", label: "Observe", detail: "Sample image / six-compartment tray" },
  { title: "Make the exception visible.", body: "Highlight the empty compartment and compare the observation with the expected pack count.", label: "Flag", detail: "Expected 6 / sample contains 5" },
  { title: "Put a person in the loop.", body: "Give the operator the evidence and a clear place to confirm or dismiss the finding, with a review note.", label: "Review", detail: "Operator review / decision + note" },
  { title: "Leave a useful record.", body: "Save the result against its facility and production line. Return to it later or export the records for discussion.", label: "Record", detail: "Saved history / downloadable CSV" },
];
const capabilities = [
  ["01", "Pack inspection", "Is the pack complete?", "Compare product counts and flag a pack for review.", "Missing-item demo available"],
  ["02", "Label verification", "Does the code match?", "Compare printed information with an approved reference.", "Preset code scenarios"],
  ["03", "Count & throughput", "Are we on target?", "Compare output across a defined time window.", "Preset count scenarios"],
  ["04", "Line stops", "Where is time lost?", "Bring short interruptions into the shift conversation.", "Preset stop scenarios"],
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chapter, setChapter] = useState(0);
  const scene = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    if (menuOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (media.matches || window.innerWidth < 900 || !scene.current) return;
      const rect = scene.current.getBoundingClientRect();
      if (rect.top > 0 || rect.bottom < window.innerHeight) return;
      const progress = Math.max(0, Math.min(.999, -rect.top / Math.max(1, rect.height - window.innerHeight)));
      setChapter(Math.floor(progress * 4));
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); };
  }, []);

  return <main id="top" className="marketing">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-nav"><Brand />
      <nav id="main-navigation" className={menuOpen ? "is-open" : ""} aria-label="Main navigation">
        <a href="#system" onClick={() => setMenuOpen(false)}>The system</a>
        <a href="#capabilities" onClick={() => setMenuOpen(false)}>Applications</a>
        <a href="#founders" onClick={() => setMenuOpen(false)}>Company</a>
        <Button asChild className="solid-button"><a href="/control-room">Open demo <ArrowRight /></a></Button>
      </nav>
      <Button ref={menuButton} variant="ghost" size="icon" className="menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
    </header>

    <section id="main-content" className="editorial-hero">
      <div className="hero-art"><Image src="/dcf-vision-hero.png" alt="Concept rendering of a stainless steel conveyor with an overhead inspection camera." fill priority sizes="100vw" /><div /></div>
      <div className="hero-content"><p className="overline">MACHINE VISION / FOOD PRODUCTION</p><h1>A clearer view.<br /><span>A better line.</span></h1>
        <p className="hero-summary">An inspection platform in development for the people who build and run food production lines.</p>
        <div className="button-row"><Button asChild className="solid-button"><a href="/control-room">Explore the working demo <ArrowRight /></a></Button><a className="text-link" href="#system">See how it works <ArrowDown /></a></div>
      </div>
      <div className="hero-baseline"><span>DCF VISION / PRODUCT CONCEPT</span><span>Hardware concept rendering · not an installed system</span></div>
    </section>

    <section ref={scene} id="system" className="story-section">
      <div className="story-sticky">
        <div className="section-heading"><p className="overline">01 / FROM PRODUCT TO DECISION</p><span className="quiet-tag">Interactive sample walkthrough</span></div>
        <div className="story-layout">
          <div className={"story-visual chapter-" + chapter}>
            <InspectionEvidence scenarioKey="missing-item" highlighted={chapter > 0} />
            {chapter > 1 && <div className="story-receipt"><span className="overline">DEMO WORKFLOW</span><strong>{chapter === 2 ? "Ready for operator review" : "Keep the evidence. Keep the decision."}</strong><p>{chapter === 2 ? "Confirm finding or dismiss with a note." : "Facility · Line · Scenario · Timestamp · Review"}</p></div>}
          </div>
          <div className="story-copy"><span className="chapter-count">0{chapter + 1}<small> / 04</small></span><h2>{chapters[chapter].title}</h2><p>{chapters[chapter].body}</p><div className="story-detail">{chapters[chapter].detail}</div><Button asChild variant="outline"><a href="/control-room">Try this workflow <ArrowRight /></a></Button></div>
        </div>
        <div className="chapter-controls" role="group" aria-label="Walkthrough chapters">{chapters.map((item, index) => <button key={item.label} aria-pressed={chapter === index} onClick={() => setChapter(index)}><span>0{index + 1}</span>{item.label}<i /></button>)}</div>
        <p className="story-disclaimer">Generated image and preset outcomes. The demo saves records; it does not run a vision model or control machinery.</p>
      </div>
    </section>

    <section id="capabilities" className="applications section-pad">
      <div className="applications-intro"><p className="overline">02 / FOUR PRACTICAL QUESTIONS</p><h2>Start with the problem.<br /><span>Prove the result.</span></h2><p>Choose one task on one line. Validate the camera, lighting and detection performance before expanding.</p></div>
      <div className="application-list">{capabilities.map(([number, name, question, body, label]) => <article key={number}><span className="overline">{number} / {name}</span><div><h3>{question}</h3><p>{body}</p></div><span className="application-stage">{label}</span></article>)}</div>
    </section>

    <section id="pilot" className="pilot-section section-pad">
      <div><p className="overline">03 / THE PATH TO A PLANT PILOT</p><h2>One line.<br />One measurable goal.</h2><p>The next step is a scoped validation project—not a promise of perfect inspection.</p><Button asChild className="solid-button"><a href="/control-room">Explore the demo first <ArrowRight /></a></Button></div>
      <ol className="pilot-steps"><li><span>01</span><div><h3>Define the loss</h3><p>Pick a specific issue, product format and baseline: incomplete packs, label rework or lost output.</p></div></li><li><span>02</span><div><h3>Collect representative evidence</h3><p>Obtain approved line footage, including good products, defects and difficult lighting conditions.</p></div></li><li><span>03</span><div><h3>Validate before rollout</h3><p>Agree acceptance criteria, measure missed defects and false alarms, and test the operator workflow.</p></div></li></ol>
    </section>

    <section id="founders" className="company-section section-pad"><div><p className="overline">04 / THE PEOPLE BEHIND DCF</p><h2>Built around<br />the production floor.</h2><p>We are building DCF Vision to help food processors and machinery companies make inspection evidence easier to use.</p></div><div className="founders"><article><span>Co-founder</span><h3>Christian Del Carmen</h3></article><article><span>Co-founder</span><h3>Steven Flogio</h3></article><p className="company-note"><Check />Facility setup, demo records and review notes work today. Camera integration, model validation and shared company accounts are the next engineering milestones.</p></div></section>
    <footer className="site-footer"><Brand /><span>Food production. In clearer view.</span><a href="/control-room">Open the demonstration <ArrowRight /></a></footer>
  </main>;
}
