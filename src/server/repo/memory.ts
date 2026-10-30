import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type {
  User,
  Document,
  DocumentStatus,
  Extraction,
  ExtractedField,
  MedicalRecord,
  WellnessEntry,
  HealthSummary,
} from "@/lib/schemas";
import type {
  Repository,
  CreateUserInput,
  CreateDocumentInput,
  StoredFile,
  CreateExtractionInput,
  CreateMedicalRecordInput,
  WellnessUpsertInput,
  CreateHealthSummaryInput,
} from "./types";
import documentsFixture from "../../../fixtures/documents.json";
import extractionsFixture from "../../../fixtures/extractions.json";
import recordsFixture from "../../../fixtures/records.json";
import wellnessFixture from "../../../fixtures/wellness.json";
import summaryFixture from "../../../fixtures/summary.json";

export const DEMO_USER_ID = "demo_user_001";
export const DEMO_EMAIL = "demo@medisathi.app";
export const DEMO_PASSWORD = "demo1234";

const DAY_MS = 86_400_000;

function daysAgoDate(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function daysAgoISODate(days: number): string {
  return daysAgoDate(days).toISOString().slice(0, 10);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MemoryRepository implements Repository {
  private users = new Map<string, User>();
  private usersByEmail = new Map<string, User>();
  private documents = new Map<string, Document>();
  private files = new Map<string, StoredFile & { userId: string }>();
  private extractions = new Map<string, Extraction>();
  private records = new Map<string, MedicalRecord>();
  private wellness = new Map<string, WellnessEntry>();
  private summaries = new Map<string, HealthSummary>();

  constructor(opts?: { seed?: boolean }) {
    if (opts?.seed !== false) this.seed();
  }

  private seed(): void {
    const now = new Date();
    const demoUser: User = {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      locale: "bn",
      createdAt: daysAgoDate(30),
    };
    this.users.set(demoUser.id, demoUser);
    this.usersByEmail.set(demoUser.email, demoUser);

    for (const d of documentsFixture) {
      const doc: Document = {
        id: d.id,
        userId: DEMO_USER_ID,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        checksum: d.checksum,
        status: d.status as DocumentStatus,
        createdAt: daysAgoDate(d.daysAgo),
        fileRef: d.fileRef,
      };
      this.documents.set(doc.id, doc);
      this.files.set(`${DEMO_USER_ID}:${d.fileRef}`, {
        userId: DEMO_USER_ID,
        bytes: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          "base64"
        ),
        mimeType: d.mimeType,
        fileName: d.fileName,
      });
    }

    for (const e of extractionsFixture) {
      const ext: Extraction = {
        id: e.id,
        documentId: e.documentId,
        userId: DEMO_USER_ID,
        documentType: e.documentType as Extraction["documentType"],
        documentDateRaw: e.documentDateRaw,
        documentDate:
          e.documentDateDaysAgo === null
            ? null
            : daysAgoISODate(e.documentDateDaysAgo),
        fields: e.fields as ExtractedField[],
        ocrText: e.ocrText,
        createdAt: daysAgoDate(e.createdDaysAgo),
      };
      this.extractions.set(ext.id, ext);
    }

    for (const r of recordsFixture) {
      const rec: MedicalRecord = {
        id: r.id,
        userId: DEMO_USER_ID,
        documentId: r.documentId,
        recordType: r.recordType as MedicalRecord["recordType"],
        recordDate: daysAgoISODate(r.recordDateDaysAgo),
        observations: r.observations as MedicalRecord["observations"],
        medications: r.medications as MedicalRecord["medications"],
        confirmedAt: daysAgoDate(r.confirmedDaysAgo),
      };
      this.records.set(rec.id, rec);
    }

    for (const w of wellnessFixture) {
      const entry: WellnessEntry = {
        id: `well_demo_${w.daysAgo}`,
        userId: DEMO_USER_ID,
        date: daysAgoISODate(w.daysAgo),
        sleepHours: w.sleepHours,
        waterGlasses: w.waterGlasses,
        activityMinutes: w.activityMinutes,
        energy: w.energy as WellnessEntry["energy"],
        symptomLevel: w.symptomLevel as WellnessEntry["symptomLevel"],
        symptoms: w.symptoms,
        note: w.note,
      };
      this.wellness.set(`${DEMO_USER_ID}:${entry.date}`, entry);
    }

    const summary: HealthSummary = {
      id: "sum_demo_001",
      userId: DEMO_USER_ID,
      version: 1,
      generatedAt: now,
      coveredFrom: daysAgoISODate(summaryFixture.coveredFromDaysAgo),
      coveredTo: daysAgoISODate(summaryFixture.coveredToDaysAgo),
      payload: summaryFixture.payload as HealthSummary["payload"],
      sourceRecordIds: summaryFixture.sourceRecordIds,
      model: summaryFixture.model,
      isSample: summaryFixture.isSample,
    };
    this.summaries.set(summary.id, summary);
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase();
    if (this.usersByEmail.has(email)) throw new Error("User already exists");
    const user: User = {
      id: randomUUID(),
      email,
      passwordHash: input.passwordHash,
      locale: input.locale,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    this.usersByEmail.set(email, user);
    return clone(user);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return clone(this.usersByEmail.get(email.toLowerCase()) ?? null);
  }

  async getUserById(id: string): Promise<User | null> {
    return clone(this.users.get(id) ?? null);
  }

  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const doc: Document = {
      id: randomUUID(),
      userId: input.userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
      status: "uploaded",
      createdAt: new Date(),
      fileRef: input.fileRef,
    };
    this.documents.set(doc.id, doc);
    return clone(doc);
  }

  async getDocument(userId: string, id: string): Promise<Document | null> {
    const doc = this.documents.get(id);
    if (!doc || doc.userId !== userId) return null;
    return clone(doc);
  }

  async listDocuments(userId: string): Promise<Document[]> {
    return [...this.documents.values()]
      .filter((d) => d.userId === userId)
      .map((d, i) => ({ d, i }))
      .sort(
        (a, b) =>
          b.d.createdAt.getTime() - a.d.createdAt.getTime() || b.i - a.i
      )
      .map(({ d }) => clone(d));
  }

  async updateDocumentStatus(
    userId: string,
    id: string,
    status: DocumentStatus
  ): Promise<Document | null> {
    const doc = this.documents.get(id);
    if (!doc || doc.userId !== userId) return null;
    doc.status = status;
    return clone(doc);
  }

  async storeFile(
    userId: string,
    fileRef: string,
    bytes: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<void> {
    this.files.set(`${userId}:${fileRef}`, {
      userId,
      bytes: Buffer.from(bytes),
      mimeType,
      fileName,
    });
  }

  async getFile(userId: string, fileRef: string): Promise<StoredFile | null> {
    const f = this.files.get(`${userId}:${fileRef}`);
    if (!f) return null;
    return { bytes: Buffer.from(f.bytes), mimeType: f.mimeType, fileName: f.fileName };
  }

  async createExtraction(input: CreateExtractionInput): Promise<Extraction> {
    const ext: Extraction = {
      id: randomUUID(),
      userId: input.userId,
      documentId: input.documentId,
      documentType: input.documentType,
      documentDateRaw: input.documentDateRaw,
      documentDate: input.documentDate,
      fields: clone(input.fields),
      ocrText: input.ocrText,
      createdAt: new Date(),
    };
    this.extractions.set(ext.id, ext);
    return clone(ext);
  }

  async getExtraction(userId: string, id: string): Promise<Extraction | null> {
    const ext = this.extractions.get(id);
    if (!ext || ext.userId !== userId) return null;
    return clone(ext);
  }

  async getExtractionByDocument(
    userId: string,
    documentId: string
  ): Promise<Extraction | null> {
    for (const ext of this.extractions.values()) {
      if (ext.userId === userId && ext.documentId === documentId) return clone(ext);
    }
    return null;
  }

  async updateExtractionFields(
    userId: string,
    id: string,
    fields: ExtractedField[]
  ): Promise<Extraction | null> {
    const ext = this.extractions.get(id);
    if (!ext || ext.userId !== userId) return null;
    ext.fields = clone(fields);
    return clone(ext);
  }

  async createMedicalRecord(input: CreateMedicalRecordInput): Promise<MedicalRecord> {
    const rec: MedicalRecord = {
      id: randomUUID(),
      userId: input.userId,
      documentId: input.documentId,
      recordType: input.recordType,
      recordDate: input.recordDate,
      observations: clone(input.observations),
      medications: clone(input.medications),
      confirmedAt: new Date(),
    };
    this.records.set(rec.id, rec);
    return clone(rec);
  }

  async getMedicalRecord(
    userId: string,
    id: string
  ): Promise<MedicalRecord | null> {
    const rec = this.records.get(id);
    if (!rec || rec.userId !== userId) return null;
    return clone(rec);
  }

  async listMedicalRecords(
    userId: string,
    opts?: { from?: string; to?: string }
  ): Promise<MedicalRecord[]> {
    return [...this.records.values()]
      .filter((r) => {
        if (r.userId !== userId) return false;
        if (opts?.from && (r.recordDate === null || r.recordDate < opts.from))
          return false;
        if (opts?.to && (r.recordDate === null || r.recordDate > opts.to))
          return false;
        return true;
      })
      .sort((a, b) => {
        if (a.recordDate === null && b.recordDate === null) return 0;
        if (a.recordDate === null) return 1;
        if (b.recordDate === null) return -1;
        if (a.recordDate !== b.recordDate)
          return a.recordDate < b.recordDate ? -1 : 1;
        return a.confirmedAt.getTime() - b.confirmedAt.getTime();
      })
      .map(clone);
  }

  async upsertWellnessEntry(
    userId: string,
    date: string,
    data: WellnessUpsertInput
  ): Promise<WellnessEntry> {
    const key = `${userId}:${date}`;
    const existing = this.wellness.get(key);
    const entry: WellnessEntry = {
      id: existing?.id ?? randomUUID(),
      userId,
      date,
      sleepHours: data.sleepHours ?? existing?.sleepHours,
      waterGlasses: data.waterGlasses ?? existing?.waterGlasses,
      activityMinutes: data.activityMinutes ?? existing?.activityMinutes,
      energy: data.energy ?? existing?.energy,
      symptomLevel: data.symptomLevel ?? existing?.symptomLevel,
      symptoms: data.symptoms ?? existing?.symptoms,
      note: data.note ?? existing?.note,
    };
    this.wellness.set(key, entry);
    return clone(entry);
  }

  async listWellnessEntries(
    userId: string,
    from: string,
    to: string
  ): Promise<WellnessEntry[]> {
    return [...this.wellness.values()]
      .filter((w) => w.userId === userId && w.date >= from && w.date <= to)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map(clone);
  }

  async createHealthSummary(
    input: CreateHealthSummaryInput
  ): Promise<HealthSummary> {
    let version = 0;
    for (const s of this.summaries.values()) {
      if (s.userId === input.userId && s.version > version) version = s.version;
    }
    const summary: HealthSummary = {
      id: randomUUID(),
      userId: input.userId,
      version: version + 1,
      generatedAt: new Date(),
      coveredFrom: input.coveredFrom,
      coveredTo: input.coveredTo,
      payload: clone(input.payload),
      sourceRecordIds: [...input.sourceRecordIds],
      model: input.model,
      isSample: input.isSample,
    };
    this.summaries.set(summary.id, summary);
    return clone(summary);
  }

  async getHealthSummary(
    userId: string,
    id: string
  ): Promise<HealthSummary | null> {
    const s = this.summaries.get(id);
    if (!s || s.userId !== userId) return null;
    return clone(s);
  }

  async getLatestHealthSummary(userId: string): Promise<HealthSummary | null> {
    let latest: HealthSummary | null = null;
    for (const s of this.summaries.values()) {
      if (s.userId !== userId) continue;
      if (!latest || s.version > latest.version) latest = s;
    }
    return clone(latest);
  }

  async listHealthSummaries(userId: string): Promise<HealthSummary[]> {
    return [...this.summaries.values()]
      .filter((s) => s.userId === userId)
      .map((d, i) => ({ d, i }))
      .sort(
        (a, b) =>
          b.d.generatedAt.getTime() - a.d.generatedAt.getTime() || b.i - a.i
      )
      .map(({ d }) => clone(d));
  }
}
