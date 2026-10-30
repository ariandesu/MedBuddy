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
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: 1 | 2 | 3 | 4;
  symptomLevel?: "none" | "mild" | "moderate" | "severe";
  symptoms?: string[];
  note?: string;
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
 * Single data-access interface. MemoryRepository (demo) and MongoRepository
 * (production) both implement this. All user-data methods scope by userId.
 */
export interface Repository {
  createUser(input: CreateUserInput): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;

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

  createHealthSummary(input: CreateHealthSummaryInput): Promise<HealthSummary>;
  getHealthSummary(userId: string, id: string): Promise<HealthSummary | null>;
  getLatestHealthSummary(userId: string): Promise<HealthSummary | null>;
  listHealthSummaries(userId: string): Promise<HealthSummary[]>;
}
