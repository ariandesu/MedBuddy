/**
 * Renders the synthetic "paper" behind every demo document (AGENTS.md §12).
 * HTML → screenshot via Playwright, so the paper shows exactly the values in the
 * fixtures, watermarked SAMPLE. Also records where each value sits on the paper
 * so the review page can highlight it.
 *
 * Writes public/samples/*.jpg and fixtures/sample-papers.json. Run after any
 * fixture change: pnpm tsx scripts/make-fixture-images.ts
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

type Field = {
  key: string;
  label: string;
  rawValue: string;
  unit: string | null;
  referenceRangeRaw: string | null;
};
type Paper = {
  fileRef: string;
  kind: "lab_report" | "prescription" | "other";
  dateRaw: string | null;
  title?: string;
  fields: Field[];
};

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "public", "samples");

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fixturePapers(): Paper[] {
  const sources: { documents: { id: string; fileRef: string }[]; extractions: { documentId: string; documentType: Paper["kind"]; documentDateRaw: string | null; fields: Field[] }[] }[] = [
    {
      documents: JSON.parse(readFileSync(join(ROOT, "fixtures/documents.json"), "utf8")),
      extractions: JSON.parse(readFileSync(join(ROOT, "fixtures/extractions.json"), "utf8")),
    },
    ...readdirSync(join(ROOT, "fixtures/profiles")).map((f) =>
      JSON.parse(readFileSync(join(ROOT, "fixtures/profiles", f), "utf8"))
    ),
  ];
  const papers: Paper[] = [];
  for (const { documents, extractions } of sources) {
    for (const d of documents) {
      const e = extractions.find((x) => x.documentId === d.id);
      if (!e) continue;
      papers.push({ fileRef: d.fileRef, kind: e.documentType, dateRaw: e.documentDateRaw, fields: e.fields });
    }
  }
  return papers;
}

/** Extra papers the "Try a sample" buttons send through the real OCR + Muse pipeline. */
const LIVE_SAMPLES: Paper[] = [
  {
    fileRef: "sample-cbc",
    kind: "lab_report",
    dateRaw: "03/11/2026",
    title: "Complete Blood Count",
    fields: [
      ["hemoglobin", "Hemoglobin", "11.2", "g/dL", "12.0-15.5"],
      ["wbc", "WBC", "9.4", "x10^9/L", "4.0-11.0"],
      ["rbc", "RBC", "4.1", "x10^12/L", "3.8-5.2"],
      ["platelets", "Platelets", "310", "x10^9/L", "150-450"],
      ["hematocrit", "Hematocrit", "34.5", "%", "36-46"],
      ["fasting_glucose", "Fasting Glucose", "6.8", "mmol/L", "3.9-5.5"],
    ].map(([key, label, rawValue, unit, referenceRangeRaw]) => ({ key, label, rawValue, unit, referenceRangeRaw })),
  },
  {
    fileRef: "sample-prescription",
    kind: "prescription",
    dateRaw: "03/11/2026",
    fields: [
      ["med_0_name", "Medicine 1 name", "Napa 500mg"],
      ["med_0_dose", "Medicine 1 dose", "1 tablet"],
      ["med_0_frequency", "Medicine 1 frequency", "1+0+1"],
      ["med_0_duration", "Medicine 1 duration", "7 days"],
      ["med_1_name", "Medicine 2 name", "Omeprazole 20mg"],
      ["med_1_dose", "Medicine 2 dose", "1 capsule"],
      ["med_1_frequency", "Medicine 2 frequency", "1+0+0"],
      ["med_1_duration", "Medicine 2 duration", "14 days"],
    ].map(([key, label, rawValue]) => ({ key, label, rawValue, unit: null, referenceRangeRaw: null })),
  },
];

function labBody(p: Paper): string {
  const rows = p.fields
    .map(
      (f) => `<tr><td>${esc(f.label)}</td><td class="v"><span data-key="${esc(f.key)}">${esc(f.rawValue)}</span></td><td>${esc(f.unit ?? "")}</td><td>${esc(f.referenceRangeRaw ?? "")}</td></tr>`
    )
    .join("");
  return `<h2>${esc(p.title ?? "Laboratory Report")}</h2>
    <table><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference range</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="sign">Checked by: Sample Pathologist</p>`;
}

function rxBody(p: Paper): string {
  const groups = new Map<string, Field[]>();
  for (const f of p.fields) {
    const m = f.key.match(/^med_(\d+)_/);
    const id = m ? m[1] : f.key;
    groups.set(id, [...(groups.get(id) ?? []), f]);
  }
  // A question mark in the data means the reader was unsure; the pen didn't write it.
  const shown = (f: Field) => `<span data-key="${esc(f.key)}">${esc(f.rawValue.replace(/\s*\(\?\)/g, ""))}</span>`;
  const items = [...groups.values()]
    .map((fs) => `<li>${fs.filter((f) => f.rawValue.trim()).map(shown).join(" &nbsp; ")}</li>`)
    .join("");
  return `<div class="rx"><span class="symbol">Rx</span><ol>${items}</ol></div><p class="sign hand">Dr. Sample Name</p>`;
}

function html(p: Paper): string {
  const isRx = p.kind !== "lab_report";
  return `<!doctype html><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Kalam&family=Noto+Sans+Bengali:wght@400;700&family=Noto+Serif:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; }
    body { width: 1000px; padding: 56px 64px 72px; background: #fdfcf8; color: #1b1b1b; font: 25px/1.45 "Noto Serif", "Noto Sans Bengali", serif; position: relative; overflow: hidden; }
    header { border-bottom: 3px double #1b1b1b; padding-bottom: 16px; margin-bottom: 22px; }
    h1 { font-size: 36px; } .bn { font: 700 28px "Noto Sans Bengali", sans-serif; } .addr { font-size: 19px; color: #444; }
    .meta { display: flex; justify-content: space-between; font-size: 22px; margin-bottom: 22px; }
    h2 { font-size: 27px; text-align: center; text-decoration: underline; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; border-bottom: 2px solid #1b1b1b; padding: 8px 6px; font-size: 22px; }
    td { padding: 12px 6px; border-bottom: 1px solid #bbb; } .v { font-weight: 700; }
    .sign { margin-top: 48px; text-align: right; font-size: 21px; }
    .rx { display: flex; gap: 24px; min-height: 340px; font: 36px/1.7 Kalam, cursive; color: #17306b; transform: rotate(-0.6deg); }
    .symbol { font: 700 54px "Noto Serif", serif; color: #1b1b1b; } ol { padding-left: 34px; } li { margin-bottom: 18px; }
    .hand { font: 32px Kalam, cursive; color: #17306b; }
    .mark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
    .mark span { transform: rotate(-28deg); font: 700 54px sans-serif; color: rgba(180, 40, 30, .13); white-space: nowrap; }
    .banner { font: 700 19px sans-serif; color: #b4281e; text-align: center; margin-bottom: 14px; letter-spacing: .02em; }
  </style>
  <div class="banner">SAMPLE — NOT REAL PATIENT DATA</div>
  <header>${
    isRx
      ? `<h1>Dr. Sample Name</h1><div class="addr">MBBS (Sample) · General Medicine · স্যাম্পল চেম্বার, ঢাকা</div>`
      : `<div class="bn">সবুজ উপত্যকা ডায়াগনস্টিক সেন্টার</div><h1>Green Valley Diagnostics</h1><div class="addr">Sample Road, Dhaka · Fictional laboratory</div>`
  }</header>
  <div class="meta"><span>Patient: Sample Person</span><span>Date: ${esc(p.dateRaw ?? "__/__/____")}</span></div>
  ${isRx ? rxBody(p) : labBody(p)}
  <div class="mark"><span>SAMPLE — NOT REAL PATIENT DATA</span></div>`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const manifest: Record<string, { sizeBytes: number; boxes: Record<string, { x: number; y: number; w: number; h: number }> }> = {};
  for (const p of [...fixturePapers(), ...LIVE_SAMPLES]) {
    await page.setContent(html(p), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const boxes = await page.evaluate(() => {
      const W = document.body.offsetWidth;
      const H = document.body.offsetHeight;
      const out: Record<string, { x: number; y: number; w: number; h: number }> = {};
      document.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
        const r = el.getBoundingClientRect();
        out[el.dataset.key as string] = { x: r.x / W, y: r.y / H, w: r.width / W, h: r.height / H };
      });
      return out;
    });
    const bytes = await page.locator("body").screenshot({ type: "jpeg", quality: 80 });
    writeFileSync(join(OUT_DIR, `${p.fileRef}.jpg`), bytes);
    manifest[p.fileRef] = { sizeBytes: bytes.length, boxes };
  }
  await browser.close();
  writeFileSync(join(ROOT, "fixtures/sample-papers.json"), JSON.stringify(manifest, null, 1) + "\n");
  console.log(`Rendered ${Object.keys(manifest).length} papers`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
