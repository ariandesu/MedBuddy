/**
 * Red-flag rules (deterministic, not model-dependent). AGENTS.md §10.
 */
export const RED_FLAG_SYMPTOMS = new Set([
  "chest pain",
  "chest_pain",
  "difficulty breathing",
  "difficulty_breathing",
  "breathing difficulty",
  "shortness of breath",
  "fainting",
  "fainted",
  "severe bleeding",
  "severe_bleeding",
  "bleeding",
  "confusion",
  "confused",
  "stroke",
  "stroke signs",
  "face drooping",
  "arm weakness",
  "speech difficulty",
]);

export function isRedFlag(entry: {
  symptomLevel?: "none" | "mild" | "moderate" | "severe";
  symptoms?: string[];
}): boolean {
  if (entry.symptomLevel === "severe") return true;
  const symptoms = (entry.symptoms ?? []).map((s) => s.toLowerCase().trim());
  return symptoms.some((s) => RED_FLAG_SYMPTOMS.has(s));
}

export const URGENT_MESSAGE_BN =
  "এটি জরুরি চিকিৎসার প্রয়োজন হতে পারে। বাংলাদেশে ৯৯৯ নম্বরে কল করুন অথবা নিকটতম হাসপাতালে যান।";
export const URGENT_MESSAGE_EN =
  "This may need urgent care. In Bangladesh call 999 or go to the nearest hospital.";

export function urgentMessage(locale: "bn" | "en"): string {
  return locale === "bn" ? URGENT_MESSAGE_BN : URGENT_MESSAGE_EN;
}
