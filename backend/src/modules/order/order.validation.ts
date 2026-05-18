import { z } from "zod";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export const createOrderSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    message: "Invalid payment method"
  }),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;

export const orderIdParamSchema = z.object({
  id: z.string().uuid("Invalid order ID"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([PaymentStatus.confirmed, PaymentStatus.cancelled], {
    message: "Status must be 'confirmed' or 'cancelled'"
  }),
});

export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema>;
