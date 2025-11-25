import { z } from "zod";

export const requestFormSchema = z.object({
  requesterName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  
  division: z
    .string()
    .trim()
    .min(1, "Division is required")
    .max(100, "Division must be less than 100 characters"),
  
  contactWa: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^[\d\s\-\+\(\)]+$/.test(val),
      "Invalid WhatsApp number format"
    ),
  
  contactLine: z
    .string()
    .trim()
    .optional(),
  
  targetDivision: z.enum(["CD", "MEDPRO", "MS", "CC"]).refine(
    (val) => val !== undefined,
    { message: "Please select a target division" }
  ),
  
  requestType: z
    .string()
    .trim()
    .min(1, "Request type is required")
    .max(100, "Request type must be less than 100 characters"),
  
  projectTitle: z
    .string()
    .trim()
    .min(1, "Project title is required")
    .max(200, "Title must be less than 200 characters"),
  
  projectDescription: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters"),
  
  referenceLinks: z
    .array(z.string().url("Invalid URL format"))
    .optional(),
  
  usageDate: z.date(),
});

export type RequestFormData = z.infer<typeof requestFormSchema>;
