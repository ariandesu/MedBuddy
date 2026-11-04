/**
 * Official medicine labels from openFDA (U.S. FDA, public, no key). Only the
 * medicine's name leaves the server: never a question, a record or a user id.
 *
 * Dosing sections are deliberately not read, so the model can't repeat a dose.
 * The labels are American, so a local brand usually has none. That is reported
 * as "not found": a brand is never guessed into a generic (AGENTS.md §6).
 */

export type MedicineLabel = {
  /** The name as the label gives it. */
  name: string;
  medicineClass: string | null;
  uses: string;
  warnings: string | null;
  sourceTitle: string;
  sourceUrl: string;
};

export type MedicineLookup =
  | { status: "found"; label: MedicineLabel }
  | { status: "not_found" }
  | { status: "unavailable" };

const API = "https://api.fda.gov/drug/label.json";
const TIMEOUT_MS = 5000;
const MAX_SECTION = 1500;
const MIN_USES = 40;

/** The same ingredient under its other official name. Ingredients only: never a brand. */
const INGREDIENT_ALIASES: Record<string, string> = {
  paracetamol: "acetaminophen",
  salbutamol: "albuterol",
  adrenaline: "epinephrine",
  noradrenaline: "norepinephrine",
};

type RawLabel = {
  set_id?: string;
  purpose?: string[];
  indications_and_usage?: string[];
  warnings?: string[];
  boxed_warning?: string[];
  openfda?: { generic_name?: string[]; brand_name?: string[]; pharm_class_epc?: string[] };
};

/** "Omeprazole 20mg (?)" → "omeprazole". Null when nothing safe to search for is left. */
export function cleanMedicineName(raw: string): string | null {
  const cleaned = raw
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|%)\b/g, " ")
    .replace(/\b(tablets?|tabs?|capsules?|caps?|syrup|injection|cream|drops?)\b/g, " ")
    .replace(/[^a-z0-9 -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 3 || cleaned.length > 60) return null;
  return INGREDIENT_ALIASES[cleaned] ?? cleaned;
}

function firstText(values: string[] | undefined): string | null {
  const text = values?.join(" ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, MAX_SECTION) : null;
}

/** One ingredient only. A combination product would describe other medicines too. */
function isSingleIngredient(generic: string): boolean {
  return !/,| and | \/ /.test(generic);
}

function pickLabel(results: RawLabel[], query: string, field: "generic" | "brand"): RawLabel | null {
  const usable = results.filter((r) => {
    const uses = firstText(r.indications_and_usage) ?? firstText(r.purpose);
    return r.set_id && uses && uses.length >= MIN_USES;
  });
  const generics = (r: RawLabel) => (r.openfda?.generic_name ?? []).map((g) => g.toLowerCase());
  if (field === "brand") {
    return usable.find((r) => (r.openfda?.brand_name ?? []).some((b) => b.toLowerCase() === query)) ?? null;
  }
  return (
    usable.find((r) => generics(r).includes(query)) ??
    // "metformin" should still find "metformin hydrochloride", but not a combination.
    usable.find((r) => generics(r).some((g) => g.startsWith(`${query} `) && isSingleIngredient(g))) ??
    null
  );
}

async function search(field: "generic" | "brand", query: string): Promise<RawLabel[]> {
  const term = field === "generic" ? "openfda.generic_name" : "openfda.brand_name";
  // rxcui: real medicines only. Without it, homeopathic labels come back for ordinary names.
  const url = `${API}?search=${term}:"${encodeURIComponent(query)}"+AND+_exists_:openfda.rxcui&limit=20`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`openFDA ${res.status}`);
  const data = (await res.json()) as { results?: RawLabel[] };
  return data.results ?? [];
}

export async function lookupMedicine(rawName: string): Promise<MedicineLookup> {
  const query = cleanMedicineName(rawName);
  if (!query) return { status: "not_found" };
  try {
    const picked =
      pickLabel(await search("generic", query), query, "generic") ??
      pickLabel(await search("brand", query), query, "brand");
    if (!picked?.set_id) return { status: "not_found" };
    const name = picked.openfda?.generic_name?.[0] ?? picked.openfda?.brand_name?.[0] ?? query;
    const display = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    return {
      status: "found",
      label: {
        name: display,
        medicineClass: picked.openfda?.pharm_class_epc?.[0]?.replace(/\s*\[EPC\]$/, "") ?? null,
        uses: firstText(picked.indications_and_usage) ?? firstText(picked.purpose) ?? "",
        warnings: firstText(picked.boxed_warning) ?? firstText(picked.warnings),
        sourceTitle: `U.S. FDA label: ${display}`,
        sourceUrl: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(picked.set_id)}`,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}

const MEDICINE_QUESTION = new RegExp(
  [
    "\\b(medicines?|medications?|drugs?|tablets?|capsules?|syrup|pills?)\\b",
    "\\b(used for|use of|uses of|side effects?|what does .+ do|why .*tak)",
    "^\\s*(what is|what's|what are|tell me about)\\b",
    "ওষুধ|ঔষধ|ট্যাবলেট|ক্যাপসুল|সিরাপ|পার্শ্বপ্রতিক্রিয়া|কিসের|কীসের|কী কাজ|কি কাজ|কেন খা|কী জন্য|কি জন্য",
  ].join("|"),
  "i"
);

const NAMED_MEDICINE = [
  /^\s*(?:what is|what's|what are)\s+([a-z][a-z0-9 -]{2,40}?)\s+used for\b/i,
  /\bside effects? of\s+([a-z][a-z0-9 -]{2,40}?)\s*[?.!]*\s*$/i,
  /^\s*what does\s+([a-z][a-z0-9 -]{2,40}?)\s+do\b/i,
];

/**
 * The name, when the wording makes it certain. Saves a model call and many seconds
 * against the function's time limit. Anything else goes to the model.
 */
export function namedMedicine(question: string): string | null {
  for (const pattern of NAMED_MEDICINE) {
    const match = question.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/** A cheap first gate, so most record questions skip the extra model call. */
export function mightAskAboutMedicine(question: string): boolean {
  return MEDICINE_QUESTION.test(question);
}
