import type {
  User,
  Document,
  DocumentStatus,
  Extraction,
  ExtractedField,
  MedicalRecord,
  Observation,
  MedicationAsWritten,
  WellnessEntry,
  DeviceReading,
  ReadingInput,
  HealthSummary,
  HealthSummaryPayload,
} from "@/lib/schemas";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  locale: "bn" | "en";
}

export interface CreateDocumentInput {
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  fileRef: string;
}

export interface StoredFile {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}

export interface CreateExtractionInput {
  userId: string;
  documentId: string;
  documentType: "lab_report" | "prescription" | "other";
  documentDateRaw: string | null;
  documentDate: string | null;
  dateNeedsReview?: boolean;
  fields: ExtractedField[];
  ocrText: string;
}

export interface CreateMedicalRecordInput {
  userId: string;
  documentId: string;
  recordType: "lab_report" | "prescription" | "other";
  recordDate: string | null;
  observations: Observation[];
  medications: MedicationAsWritten[];
}

export interface WellnessUpsertInput {
  date?: string;
  sleepHours?: number | null;
  waterGlasses?: number | null;
  activityMinutes?: number | null;
  energy?: 1 | 2 | 3 | 4 | null;
  symptomLevel?: "none" | "mild" | "moderate" | "severe" | null;
  symptoms?: string[];
  note?: string | null;
}

export interface CreateHealthSummaryInput {
  userId: string;
  coveredFrom: string;
  coveredTo: string;
  payload: HealthSummaryPayload;
  sourceRecordIds: string[];
  model: string;
  isSample: boolean;
}

/**
 * Prepared demo bundle: every id is pre-generated and every cross-reference
 * already remapped, so a repo can insert it with one round-trip per collection.
 * Only used for brand-new demo accounts (never merges into existing data).
 */
export interface DemoBundleDocument extends CreateDocumentInput {
  id: string;
  status: DocumentStatus;
  createdAt: Date;
}

export interface DemoBundleExtraction extends CreateExtractionInput {
  id: string;
  createdAt: Date;
}

export interface DemoBundleRecord extends CreateMedicalRecordInput {
  id: string;
  confirmedAt: Date;
}

export interface DemoBundleWellness {
  id: string;
  userId: string;
  date: string;
  entry: WellnessUpsertInput;
}

export interface DemoBundleSummary extends CreateHealthSummaryInput {
  id: string;
  version: number;
  generatedAt: Date;
}

export interface DemoBundle {
  documents: DemoBundleDocument[];
  extractions: DemoBundleExtraction[];
  records: DemoBundleRecord[];
  wellness: DemoBundleWellness[];
  summary: DemoBundleSummary;
}

/**
 * Single data-access interface. MemoryRepository (demo) and MongoRepository
 * (production) both implement this. All user-data methods scope by userId.
 */
export interface Repository {
  createUser(input: CreateUserInput): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  /** Removes demo accounts created before `before`, with all their data. Returns how many. */
  deleteExpiredDemoUsers(before: Date, limit: number): Promise<number>;

  deleteDocument(userId: string, id: string): Promise<boolean>;
  findDocumentByChecksum(userId: string, checksum: string): Promise<Document | null>;

  createDocument(input: CreateDocumentInput): Promise<Document>;
  getDocument(userId: string, id: string): Promise<Document | null>;
  listDocuments(userId: string): Promise<Document[]>;
  updateDocumentStatus(
    userId: string,
    id: string,
    status: DocumentStatus
  ): Promise<Document | null>;

  storeFile(
    userId: string,
    fileRef: string,
    bytes: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<void>;
  getFile(userId: string, fileRef: string): Promise<StoredFile | null>;

  createExtraction(input: CreateExtractionInput): Promise<Extraction>;
  getExtraction(userId: string, id: string): Promise<Extraction | null>;
  getExtractionByDocument(
    userId: string,
    documentId: string
  ): Promise<Extraction | null>;
  updateExtractionFields(
    userId: string,
    id: string,
    fields: ExtractedField[]
  ): Promise<Extraction | null>;
  updateExtractionDate(
    userId: string,
    id: string,
    documentDate: string | null,
    dateNeedsReview: boolean
  ): Promise<Extraction | null>;

  createMedicalRecord(input: CreateMedicalRecordInput): Promise<MedicalRecord>;
  getMedicalRecord(userId: string, id: string): Promise<MedicalRecord | null>;
  listMedicalRecords(
    userId: string,
    opts?: { from?: string; to?: string }
  ): Promise<MedicalRecord[]>;

  upsertWellnessEntry(
    userId: string,
    date: string,
    data: WellnessUpsertInput
  ): Promise<WellnessEntry>;
  listWellnessEntries(
    userId: string,
    from: string,
    to: string
  ): Promise<WellnessEntry[]>;

  upsertDeviceReading(userId: string, date: string, input: ReadingInput): Promise<DeviceReading>;
  listDeviceReadings(userId: string, opts?: { from?: string; to?: string }): Promise<DeviceReading[]>;
  deleteDeviceReading(userId: string, id: string): Promise<boolean>;

  createHealthSummary(input: CreateHealthSummaryInput): Promise<HealthSummary>;
  getHealthSummary(userId: string, id: string): Promise<HealthSummary | null>;
  getLatestHealthSummary(userId: string): Promise<HealthSummary | null>;
  listHealthSummaries(userId: string): Promise<HealthSummary[]>;

  /**
   * Bulk-insert a prepared demo bundle (one round-trip per collection).
   * Optional: repos may omit it and demo-seed falls back to per-item writes.
   * Only ever called for brand-new demo accounts.
   */
  insertDemoBundle?(userId: string, bundle: DemoBundle): Promise<void>;
}
