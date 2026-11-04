/**
 * 5 synthetic judge demo profiles (SAMPLE ONLY — never real patient data).
 * 3 recovering (visible lab improvement + symptom ease) and 2 healthy
 * (in-range labs + steady habits). All values use real-ish reference ranges
 * and keep rawValue exactly as on paper; Bangla digits appear in one profile
 * to demo digit conversion. No diagnosis, no prescriptions, no dose changes.
 */

export type DemoProfileId =
  | "anemia-recovery"
  | "sugar-recovery"
  | "lipid-recovery"
  | "healthy-stable"
  | "healthy-active";

export type DemoProfileMeta = {
  id: DemoProfileId;
  badge: "recovering" | "stable";
  nameEn: string;
  nameBn: string;
  storyEn: string;
  storyBn: string;
};

export const DEMO_PROFILES: DemoProfileMeta[] = [
  {
    id: "anemia-recovery",
    badge: "recovering",
    nameEn: "Rahima — low iron, getting better",
    nameBn: "রহিমা — রক্ত কম ছিল, ভালো হচ্ছে",
    storyEn: "Hemoglobin 9.1 → 10.7. Tiredness eased, sleep improved.",
    storyBn: "হিমোগ্লোবিন ৯.১ → ১০.৭। ক্লান্তি কমেছে, ঘুম ভালো হয়েছে।",
  },
  {
    id: "sugar-recovery",
    badge: "recovering",
    nameEn: "Karim — high sugar, coming down",
    nameBn: "করিম — সুগার বেশি ছিল, কমছে",
    storyEn: "Fasting glucose 152 → 121. Walking up, water steady.",
    storyBn: "খালি পেটে সুগার ১৫২ → ১২১। হাঁটা বেড়েছে।",
  },
  {
    id: "lipid-recovery",
    badge: "recovering",
    nameEn: "Sharmin — cholesterol, improving",
    nameBn: "শারমিন — কোলেস্টেরল, ভালোর দিকে",
    storyEn: "Cholesterol 245 → ২০১. LDL 162 → ১৩০.",
    storyBn: "কোলেস্টেরল ২৪৫ → ২০১। LDL ১৬২ → ১৩০।",
  },
  {
    id: "healthy-stable",
    badge: "stable",
    nameEn: "Arif — steady and healthy",
    nameBn: "আরিফ — সুস্থ ও নিয়মিত",
    storyEn: "Labs in range. Sleep 7–8h, 30–45 min activity.",
    storyBn: "সব রিপোর্ট স্বাভাবিক। ঘুম ৭–৮ ঘণ্টা, হাঁটা ৩০–৪৫ মিনিট।",
  },
  {
    id: "healthy-active",
    badge: "stable",
    nameEn: "Nusrat — active student",
    nameBn: "নুসরাত — কর্মঠ ছাত্রী",
    storyEn: "Good hydration, one mild headache, otherwise well.",
    storyBn: "পানি ভালো খায়, একদিন হালকা মাথাব্যথা, বাকি দিন ভালো।",
  },
];

export function isDemoProfileId(v: unknown): v is DemoProfileId {
  return (
    v === "anemia-recovery" ||
    v === "sugar-recovery" ||
    v === "lipid-recovery" ||
    v === "healthy-stable" ||
    v === "healthy-active"
  );
}

type ProfileBundle = {
  documents: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    fileRef: string;
    status: string;
    daysAgo: number;
  }>;
  extractions: Array<{
    id: string;
    documentId: string;
    documentType: string;
    documentDateRaw: string | null;
    documentDateDaysAgo: number | null;
    ocrText: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fields: any[];
  }>;
  records: Array<{
    id: string;
    documentId: string;
    recordType: string;
    recordDateDaysAgo: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    observations: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    medications: any[];
  }>;
  wellness: Array<{
    daysAgo: number;
    sleepHours?: number;
    waterGlasses?: number;
    activityMinutes?: number;
    energy?: number;
    symptomLevel?: string;
    symptoms?: string[];
    note?: string;
  }>;
  summary: {
    coveredFromDaysAgo: number;
    coveredToDaysAgo: number;
    model: string;
    isSample: boolean;
    sourceRecordIds: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
  };
};

const bundleCache = new Map<DemoProfileId, ProfileBundle>();

export async function loadProfileBundle(id: DemoProfileId): Promise<ProfileBundle> {
  const cached = bundleCache.get(id);
  if (cached) return cached;
  // Dynamic import keeps the default fixture path unchanged for tests.
  const mod = await import(`../../fixtures/profiles/${id}.json`);
  const bundle = (mod.default ?? mod) as ProfileBundle;
  bundleCache.set(id, bundle);
  return bundle;
}
