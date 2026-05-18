import { z } from "zod";

export const SERVICE_TYPES = ["Service 1", "Service 2", "Service 3"] as const;

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10,}$/, "Phone must be a string containing at least 10 digits."),
  city: z.string().trim().min(1, "City is required."),
  serviceType: z.enum(SERVICE_TYPES),
  description: z.string().trim().min(1, "Description is required."),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
