import { MongoClient, Db, GridFSBucket, ObjectId } from "mongodb";
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

export const COLLECTIONS = {
  users: "users",
  documents: "documents",
  extractions: "extractions",
  medicalRecords: "medical_records",
  wellness: "wellness",
  healthSummaries: "health_summaries",
} as const;

export const FILES_BUCKET = "files";

/** String-_id docs (ids are opaque strings in both impls). */
type FlexDoc = { _id: string; [key: string]: unknown };

/** Idempotent — safe to run on every first connection and from init-indexes script. */
export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection<FlexDoc>(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true });
  await db
    .collection<FlexDoc>(COLLECTIONS.documents)
    .createIndex({ userId: 1, createdAt: -1 });
  await db
    .collection<FlexDoc>(COLLECTIONS.extractions)
    .createIndex({ userId: 1, documentId: 1 });
  await db
    .collection<FlexDoc>(COLLECTIONS.medicalRecords)
    .createIndex({ userId: 1, recordDate: 1 });
  await db
    .collection<FlexDoc>(COLLECTIONS.wellness)
    .createIndex({ userId: 1, date: 1 }, { unique: true });
  await db
    .collection<FlexDoc>(COLLECTIONS.healthSummaries)
    .createIndex({ userId: 1, generatedAt: -1 });
}

function newId(): string {
  return new ObjectId().toHexString();
}

function toDoc<T extends { id: string }>(obj: T): Record<string, unknown> {
  const { id, ...rest } = obj;
  return { ...rest, _id: id };
}

function fromDoc<T>(raw: Record<string, unknown>): T {
  const { _id, ...rest } = raw;
  return { ...rest, id: _id } as T;
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

export class MongoRepository implements Repository {
  private client: MongoClient | null = null;
  private indexesReady = false;

  constructor(
    private readonly uri: string,
    private readonly dbName: string
  ) {}

  private async db(): Promise<Db> {
    if (!this.client) {
      this.client = new MongoClient(this.uri);
      await this.client.connect();
    }
    const db = this.client.db(this.dbName);
    if (!this.indexesReady) {
      await ensureIndexes(db);
      this.indexesReady = true;
    }
    return db;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.indexesReady = false;
    }
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const db = await this.db();
    const user: User = {
      id: newId(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      locale: input.locale,
      createdAt: new Date(),
    };
    try {
      await db.collection<FlexDoc>(COLLECTIONS.users).insertOne(toDoc(user) as never);
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new Error("User already exists");
      throw err;
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.db();
    const raw = await db
      .collection<FlexDoc>(COLLECTIONS.users)
      .findOne({ email: email.toLowerCase() });
    return raw ? fromDoc<User>(raw as Record<string, unknown>) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const db = await this.db();
    const raw = await db.collection<FlexDoc>(COLLECTIONS.users).findOne({ _id: id });
    return raw ? fromDoc<User>(raw as Record<string, unknown>) : null;
  }

  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const db = await this.db();
    const doc: Document = {
      id: newId(),
      userId: input.userId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
      status: "uploaded",
      createdAt: new Date(),
      fileRef: input.fileRef,
    };
    await db.collection<FlexDoc>(COLLECTIONS.documents).insertOne(toDoc(doc) as never);
    return doc;
  }

  async getDocument(userId: string, id: string): Promise<Document | null> {
    const db = await this.db();
    const raw = await db
      .collection<FlexDoc>(COLLECTIONS.documents)
      .findOne({ _id: id, userId });
    return raw ? fromDoc<Document>(raw as Record<string, unknown>) : null;
  }

  async listDocuments(userId: string): Promise<Document[]> {
    const db = await this.db();
    const raws = await db
      .collection<FlexDoc>(COLLECTIONS.documents)
      .find({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();
    return raws.map((r) => fromDoc<Document>(r as Record<string, unknown>));
  }

  async updateDocumentStatus(
    userId: string,
    id: string,
    status: DocumentStatus
  ): Promise<Document | null> {
    const db = await this.db();
    const res = await db
      .collection<FlexDoc>(COLLECTIONS.documents)
      .updateOne({ _id: id, userId }, { $set: { status } });
    if (res.matchedCount === 0) return null;
    return this.getDocument(userId, id);
  }

  async storeFile(
    userId: string,
    fileRef: string,
    bytes: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<void> {
    const db = await this.db();
    const bucket = new GridFSBucket(db, { bucketName: FILES_BUCKET });
    const existing = await bucket
      .find({ filename: fileRef, "metadata.userId": userId })
      .toArray();
    for (const f of existing) {
      await bucket.delete(f._id);
    }
    await new Promise<void>((resolve, reject) => {
      const stream = bucket.openUploadStream(fileRef, {
        metadata: { userId, mimeType, fileName },
      });
      stream.on("error", reject);
      stream.on("finish", () => resolve());
      stream.end(bytes);
    });
  }

  async getFile(userId: string, fileRef: string): Promise<StoredFile | null> {
    const db = await this.db();
    const bucket = new GridFSBucket(db, { bucketName: FILES_BUCKET });
    const matches = await bucket
      .find({ filename: fileRef, "metadata.userId": userId })
      .toArray();
    if (matches.length === 0) return null;
    const meta = (matches[0].metadata ?? {}) as {
      mimeType?: string;
      fileName?: string;
    };
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = bucket.openDownloadStream(matches[0]._id);
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("error", reject);
      stream.on("end", () => resolve());
    });
    return {
      bytes: Buffer.concat(chunks),
      mimeType: meta.mimeType ?? "application/octet-stream",
      fileName: meta.fileName ?? fileRef,
    };
  }

  async createExtraction(input: CreateExtractionInput): Promise<Extraction> {
    const db = await this.db();
    const ext: Extraction = {
      id: newId(),
      userId: input.userId,
      documentId: input.documentId,
      documentType: input.documentType,
      documentDateRaw: input.documentDateRaw,
      documentDate: input.documentDate,
      fields: input.fields,
      ocrText: input.ocrText,
      createdAt: new Date(),
    };
    await db.collection<FlexDoc>(COLLECTIONS.extractions).insertOne(toDoc(ext) as never);
    return ext;
  }

  async getExtraction(userId: string, id: string): Promise<Extraction | null> {
    const db = await this.db();
    const raw = await db
      .collection<FlexDoc>(COLLECTIONS.extractions)
      .findOne({ _id: id, userId });
    return raw ? fromDoc<Extraction>(raw as Record<string, unknown>) : null;
  }

  async getExtractionByDocument(
    userId: string,
    documentId: string
  ): Promise<Extraction | null> {
    const db = await this.db();
    const raw = await db
      .collection<FlexDoc>(COLLECTIONS.extractions)
      .findOne({ userId, documentId });
    return raw ? fromDoc<Extraction>(raw as Record<string, unknown>) : null;
  }

  async updateExtractionFields(
    userId: string,
    id: string,
    fields: ExtractedField[]
  ): Promise<Extraction | null> {
    const db = await this.db();
    const res = await db
      .collection<FlexDoc>(COLLECTIONS.extractions)
      .updateOne({ _id: id, userId }, { $set: { fields } });
    if (res.matchedCount === 0) return null;
    return this.getExtraction(userId, id);
  }

  async createMedicalRecord(
    input: CreateMedicalRecordInput
  ): Promise<MedicalRecord> {
    const db = await this.db();
    const rec: MedicalRecord = {
      id: newId(),
      userId: input.userId,
      documentId: input.documentId,
      recordType: input.recordType,
      recordDate: input.recordDate,
      observations: input.observations,
      medications: input.medications,
      confirmedAt: new Date(),
    };
    await db
      .collection<FlexDoc>(COLLECTIONS.medicalRecords)
      .insertOne(toDoc(rec) as never);
    return rec;
  }

  async getMedicalRecord(
    userId: string,
    id: string
  ): Promise<MedicalRecord | null> {
    const db = await this.db();
    const raw = await db
      .collection<FlexDoc>(COLLECTIONS.medicalRecords)
      .findOne({ _id: id, userId });
    return raw ? fromDoc<MedicalRecord>(raw as Record<string, unknown>) : null;
  }

  async listMedicalRecords(
    userId: string,
    opts?: { from?: string; to?: string }
  ): Promise<MedicalRecord[]> {
    const db = await this.db();
    const query: Record<string, unknown> = { userId };
    if (opts?.from || opts?.to) {
      const range: Record<string, string> = {};
      if (opts.from) range.$gte = opts.from;
      if (opts.to) range.$lte = opts.to;
      query.recordDate = range;
    }
    const raws = await db
      .collection<FlexDoc>(COLLECTIONS.medicalRecords)
      .find(query)
      .sort({ recordDate: 1, confirmedAt: 1 })
      .toArray();
    return raws.map((r) => fromDoc<MedicalRecord>(r as Record<string, unknown>));
  }

  async upsertWellnessEntry(
    userId: string,
    date: string,
    data: WellnessUpsertInput
  ): Promise<WellnessEntry> {
    const db = await this.db();
    await db.collection<FlexDoc>(COLLECTIONS.wellness).updateOne(
      { userId, date },
      {
        $set: stripUndefined({ ...data, userId, date }),
        $setOnInsert: { _id: newId() },
      },
      { upsert: true }
    );
    const raw = await db
      .collection<FlexDoc>(COLLECTIONS.wellness)
      .findOne({ userId, date });
    if (!raw) throw new Error("Wellness upsert failed");
    return fromDoc<WellnessEntry>(raw as Record<string, unknown>);
  }

  async listWellnessEntries(
    userId: string,
    from: string,
    to: string
  ): Promise<WellnessEntry[]> {
    const db = await this.db();
    const raws = await db
      .collection<FlexDoc>(COLLECTIONS.wellness)
      .find({ userId, date: { $gte: from, $lte: to } })
      .sort({ date: 1 })
      .toArray();
    return raws.map((r) => fromDoc<WellnessEntry>(r as Record<string, unknown>));
  }

  async createHealthSummary(
    input: CreateHealthSummaryInput
  ): Promise<HealthSummary> {
    const db = await this.db();
    const latest = await db
      .collection<FlexDoc>(COLLECTIONS.healthSummaries)
      .find({ userId: input.userId })
      .sort({ version: -1 })
      .limit(1)
      .toArray();
    const version =
      latest.length > 0 ? ((latest[0].version as number) ?? 0) + 1 : 1;
    const summary: HealthSummary = {
      id: newId(),
      userId: input.userId,
      version,
      generatedAt: new Date(),
      coveredFrom: input.coveredFrom,
      coveredTo: input.coveredTo,
      payload: input.payload,
      sourceRecordIds: input.sourceRecordIds,
      model: input.model,
      isSample: input.isSample,
    };
    await db
      .collection<FlexDoc>(COLLECTIONS.healthSummaries)
      .insertOne(toDoc(summary) as never);
    return summary;
  }

  async getHealthSummary(
    userId: string,
    id: string
  ): Promise<HealthSummary | null> {
    const db = await this.db();
    const raw = await db
      .collection<FlexDoc>(COLLECTIONS.healthSummaries)
      .findOne({ _id: id, userId });
    return raw ? fromDoc<HealthSummary>(raw as Record<string, unknown>) : null;
  }

  async getLatestHealthSummary(userId: string): Promise<HealthSummary | null> {
    const db = await this.db();
    const raws = await db
      .collection<FlexDoc>(COLLECTIONS.healthSummaries)
      .find({ userId })
      .sort({ version: -1 })
      .limit(1)
      .toArray();
    return raws.length > 0
      ? fromDoc<HealthSummary>(raws[0] as Record<string, unknown>)
      : null;
  }

  async listHealthSummaries(userId: string): Promise<HealthSummary[]> {
    const db = await this.db();
    const raws = await db
      .collection<FlexDoc>(COLLECTIONS.healthSummaries)
      .find({ userId })
      .sort({ generatedAt: -1, _id: -1 })
      .toArray();
    return raws.map((r) => fromDoc<HealthSummary>(r as Record<string, unknown>));
  }
}
