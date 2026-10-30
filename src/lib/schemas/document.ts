import { z } from "zod";

export const documentStatusSchema = z.enum([
  "uploaded",
  "processing",
  "needs_review",
  "confirmed",
  "failed",
]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const documentSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().min(1),
  status: documentStatusSchema,
  createdAt: z.coerce.date(),
  fileRef: z.string().min(1),
});
export type Document = z.infer<typeof documentSchema>;
