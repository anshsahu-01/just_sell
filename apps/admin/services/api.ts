"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { AdminListing, AdminOrder, AdminUser, ApiEnvelope } from "@/types/api";

export type DashboardStats = {
  totalUsers: number;
  totalListings: number;
  totalOrders: number;
  activeListings: number;
  soldListings: number;
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function useAdminApiService() {
  const { getToken } = useAuth();

  return useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const request = async <T>(path: string, method: string = "GET"): Promise<T> => {
      if (!baseUrl) throw new ApiError("Missing NEXT_PUBLIC_API_URL", 500);
      const url = `${baseUrl}${path}`;
      const token = await getToken();
      console.log("ADMIN API TOKEN:", { path, method, tokenExists: Boolean(token) });
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = payload?.message ?? `Request failed (${res.status})`;
        console.error("ADMIN API ERROR:", {
          url,
          status: res.status,
          response: payload,
          message,
        });
        throw new ApiError(message, res.status);
      }
      return payload as T;
    };

    const getUsers = async () => (await request<ApiEnvelope<AdminUser[]>>("/admin/users")).data ?? [];
    const getListings = async () => (await request<ApiEnvelope<AdminListing[]>>("/admin/products")).data ?? [];
    const getOrders = async () => (await request<ApiEnvelope<AdminOrder[]>>("/admin/orders")).data ?? [];
    const approveOrder = async (id: string) =>
      await request<ApiEnvelope<AdminOrder>>(`/admin/orders/${id}/approve`, "PATCH");
    const rejectOrder = async (id: string) =>
      await request<ApiEnvelope<AdminOrder>>(`/admin/orders/${id}/reject`, "PATCH");
    const getDashboardStats = async (): Promise<DashboardStats> =>
      (await request<ApiEnvelope<DashboardStats>>("/admin/stats")).data;

    const markListingSold = async (id: string) =>
      await request<ApiEnvelope<AdminListing>>(`/admin/products/${id}/sold`, "PATCH");
    const hideListing = async (id: string) =>
      await request<ApiEnvelope<AdminListing>>(`/admin/products/${id}/hide`, "PATCH");
    const restoreListing = async (id: string) =>
      await request<ApiEnvelope<AdminListing>>(`/admin/products/${id}/restore`, "PATCH");
    const deleteListing = async (id: string) =>
      await request<ApiEnvelope<{ id: string }>>(`/admin/products/${id}`, "DELETE");

    return { getUsers, getListings, getOrders, getDashboardStats, markListingSold, hideListing, restoreListing, deleteListing, approveOrder, rejectOrder };
  }, [getToken]);
}
