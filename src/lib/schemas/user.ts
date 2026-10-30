import { z } from "zod";

export const localeSchema = z.enum(["bn", "en"]);
export type Locale = z.infer<typeof localeSchema>;

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().min(1),
  locale: localeSchema,
  createdAt: z.coerce.date(),
});
export type User = z.infer<typeof userSchema>;
