import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(5000),
  price: z.coerce.number().positive("Price must be greater than 0"),
  condition: z.string().trim().min(1, "Condition is required").max(50),
  categoryId: z.string().uuid("Invalid category ID"),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid("Invalid product ID"),
});

export const productSortOptions = [
  "latest",
  "price_asc",
  "price_desc",
] as const;

export const getProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  categoryId: z.string().uuid("Invalid category ID").optional(),
  condition: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  sort: z.enum(productSortOptions).default("latest"),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;

export type CreateProductInput = CreateProductBody & {
  images: string[];
};
export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>;
