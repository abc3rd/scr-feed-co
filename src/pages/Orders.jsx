import React from "react";
import { useQueries } from "@tanstack/react-query";
import { api, STORES } from "@/lib/api";
import OrdersSection from "@/components/dashboard/OrdersSection";

export default function Orders() {
  const results = useQueries({
    queries: STORES.map((loc) => ({
      queryKey: ["dashboard", loc],
      queryFn: () => api.getDashboard(loc),
    })),
  });
  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error;
  const activeOrders = results.flatMap((r) => r.data?.activeOrders || []);
  const pastOrders = results.flatMap((r) => r.data?.pastOrders || []);

  return (
    <div className="pt-4 space-y-8">
      <div>
        <h1 className="font-heading text-5xl leading-none">Orders</h1>
        <p className="text-muted-foreground mt-2">All your active and past orders across stores.</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl bg-card border border-border p-5 text-center">
          <p className="font-semibold text-destructive">{error.message}</p>
        </div>
      ) : (
        <div className="space-y-9">
          <OrdersSection title="Active orders" orders={activeOrders} emptyText="No active orders." />
          <OrdersSection title="Past orders" orders={pastOrders} emptyText="No past orders yet." />
        </div>
      )}
    </div>
  );
}