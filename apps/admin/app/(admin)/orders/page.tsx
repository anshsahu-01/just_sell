"use client";

import { DataState } from "@/components/DataState";
import { PageShell } from "@/components/PageShell";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAdminApiService } from "@/services/api";
import { useEffect, useMemo, useState } from "react";

export default function OrdersPage() {
  const api = useAdminApiService();
  const { data, loading, error } = useAsyncData(() => api.getOrders(), [api]);
  const [orders, setOrders] = useState(data ?? []);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setOrders(data ?? []);
  }, [data]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      const status = (o.paymentStatus ?? "").toString();
      if (filter === "pending") return status.includes("pending") || status === "payment_pending" || status === "verification_pending";
      if (filter === "approved") return status.includes("confirmed") || status === "approved";
      if (filter === "rejected") return status.includes("cancelled") || status === "rejected";
      return true;
    });
  }, [orders, filter]);

  const handleApprove = async (id: string) => {
    try {
      await api.approveOrder(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paymentStatus: "confirmed" } : o)));
    } catch (err) {
      console.error(err);
      try {
        const fresh = await api.getOrders();
        setOrders(fresh);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectOrder(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paymentStatus: "cancelled" } : o)));
    } catch (err) {
      console.error(err);
      try {
        const fresh = await api.getOrders();
        setOrders(fresh);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <PageShell title="Orders">
      <DataState loading={loading} error={error} isEmpty={(filtered ?? []).length === 0} emptyText="No orders found.">
        <div className="mb-4 flex gap-2">
          <button className={`rounded-md px-3 py-2 text-sm ${filter === "pending" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`} onClick={() => setFilter("pending")}>Pending Verification</button>
          <button className={`rounded-md px-3 py-2 text-sm ${filter === "approved" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`} onClick={() => setFilter("approved")}>Approved</button>
          <button className={`rounded-md px-3 py-2 text-sm ${filter === "rejected" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`} onClick={() => setFilter("rejected")}>Rejected</button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Buyer</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Pickup address</th>
                <th className="px-3 py-2">UTR</th>
                <th className="px-3 py-2">Screenshot</th>
                <th className="px-3 py-2">Payment status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {o.product?.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.product.images[0]} alt={o.product?.title ?? "product"} className="h-12 w-12 rounded-md object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-slate-50" />
                      )}
                      <div className="max-w-[200px] truncate">{o.product?.title ?? "-"}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{o.buyer?.name ?? "-"}</td>
                  <td className="px-3 py-2">{o.mobileNumber ?? "-"}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate" title={o.locationDetails ?? ""}>{o.locationDetails ?? "-"}</td>
                  <td className="px-3 py-2">{(o as any).utrNumber ?? "-"}</td>
                  <td className="px-3 py-2">
                    { (o as any).paymentScreenshot ? (
                      <img src={(o as any).paymentScreenshot} alt="proof" className="h-10 w-14 rounded-md object-cover cursor-pointer" onClick={() => setPreviewUrl((o as any).paymentScreenshot)} />
                    ) : (
                      <span className="text-slate-400">No proof</span>
                    ) }
                  </td>
                  <td className="px-3 py-2">{o.paymentStatus ?? "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button className="rounded-md bg-emerald-600 px-3 py-1 text-white text-sm" onClick={() => handleApprove(o.id)}>Approve</button>
                      <button className="rounded-md bg-red-600 px-3 py-1 text-white text-sm" onClick={() => handleReject(o.id)}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {previewUrl ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewUrl(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="preview" className="max-h-[80vh] max-w-[90vw] rounded-md shadow-lg" />
          </div>
        ) : null}
      </DataState>
    </PageShell>
  );
}
