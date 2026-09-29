import { z } from "zod";

export const customerStatusSchema = z.enum(["lead", "active", "inactive"]);

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a customer name.")
    .max(120, "Use no more than 120 characters."),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address.")])
    .refine((value) => value.length <= 254, "Use no more than 254 characters."),
  phone: z.string().trim().max(40, "Use no more than 40 characters."),
  status: customerStatusSchema,
  notes: z.string().trim().max(2000, "Use no more than 2,000 characters."),
  organizationId: z.union([z.literal(""), z.uuid()]).default(""),
});

export const customerMutationSchema = customerFormSchema.extend({
  id: z.uuid(),
});

export const customerIdSchema = z.uuid();

const firstQueryValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const customerListQuerySchema = z.object({
  page: z
    .preprocess(firstQueryValue, z.coerce.number().int().min(1).max(10_000))
    .default(1)
    .catch(1),
  pageSize: z
    .preprocess(
      firstQueryValue,
      z.coerce
        .number()
        .int()
        .refine((value) => [10, 20, 50].includes(value)),
    )
    .default(10)
    .catch(10),
  search: z
    .preprocess(firstQueryValue, z.string().trim().max(100))
    .default("")
    .catch(""),
  status: z
    .preprocess(firstQueryValue, z.enum(["all", "lead", "active", "inactive"]))
    .default("all")
    .catch("all"),
  sort: z
    .preprocess(firstQueryValue, z.enum(["name", "status", "created_at"]))
    .default("created_at")
    .catch("created_at"),
  direction: z
    .preprocess(firstQueryValue, z.enum(["asc", "desc"]))
    .default("desc")
    .catch("desc"),
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerListQuery = z.output<typeof customerListQuerySchema>;
