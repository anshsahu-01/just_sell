import { ApiResponse, Order, OrderStatus, PaymentMethod, PaymentStatus } from "@/types";
import { apiRequest } from "./api";

export type OrderActionStatus = PaymentStatus | Extract<OrderStatus, "shipped" | "delivered">;

export async function createOrder(
  productId: string,
  paymentMethod: PaymentMethod,
  mobileNumber: string,
  deliveryAddress: string,
  token: string,
  options?: {
    utrNumber?: string;
    paymentScreenshot?: string;
    paymentStatus?: PaymentStatus;
  }
) {
  const payload = {
    productId,
    paymentMethod,
    mobileNumber,
    deliveryAddress,
    locationDetails: deliveryAddress,
    utrNumber: options?.utrNumber,
    paymentScreenshot: options?.paymentScreenshot,
    paymentStatus: options?.paymentStatus,
  };
  const payloadSizeBytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  console.log("Final payload size (bytes)", payloadSizeBytes);
  console.log("ONLINE ORDER PAYLOAD", payload);

  const res = await apiRequest<ApiResponse<Order>>("/orders", {
    method: "POST",
    body: payload,
    token,
  });
  return res.data;
}

export async function getMyOrders(token: string) {
  const res = await apiRequest<ApiResponse<Order[]>>("/orders/my-orders", {
    token,
  });
  return res.data;
}

export async function getMySales(token: string) {
  const res = await apiRequest<ApiResponse<Order[]>>("/orders/my-sales", {
    token,
  });
  return res.data;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderActionStatus,
  token: string
) {
  const res = await apiRequest<ApiResponse<Order>>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status },
    token,
  });
  return res.data;
}
