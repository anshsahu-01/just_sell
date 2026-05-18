import { ApiResponse, Order, PaymentMethod, PaymentStatus } from "@/types";
import { apiRequest } from "./api";

export async function createOrder(
  productId: string,
  paymentMethod: PaymentMethod,
  token: string
) {
  const res = await apiRequest<ApiResponse<Order>>("/orders", {
    method: "POST",
    body: { productId, paymentMethod },
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
  status: PaymentStatus,
  token: string
) {
  const res = await apiRequest<ApiResponse<Order>>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status },
    token,
  });
  return res.data;
}
