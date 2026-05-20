import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  mobileNumber: z
    .string()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Invalid mobile number format")
    .optional(),
  bio: z.string().max(200, "Bio cannot exceed 200 characters").optional(),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", {
    message: "Confirmation text must be 'DELETE'",
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
