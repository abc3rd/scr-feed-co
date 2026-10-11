import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import OrdersSection from "@/components/dashboard/OrdersSection";
import PullToRefresh from "@/components/dashboard/PullToRefresh";
export default function Orders() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(),
    refetchInterval: 15000,
  });
  const active = (data?.orders || []).filter(
    (o) => !["Done", "Cancelled"].includes(o.status),
  );
  const past = (data?.orders || []).filter((o) =>
    ["Done", "Cancelled"].includes(o.status),
  );
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-5xl">Orders</h1>
        <p className="text-muted-foreground">
          Active and past orders across stores.
        </p>
      </div>
      <PullToRefresh onRefresh={() => refetch()}>
        <div className="space-y-8">
          {isLoading ? (
            <p role="status">Loading orders…</p>
          ) : error ? (
            <div role="alert">
              <p>{error.message}</p>
              <button onClick={() => refetch()} className="mt-3 underline">
                Try again
              </button>
            </div>
          ) : (
            <>
              <OrdersSection
                title="Active orders"
                orders={active}
                emptyText="No active orders."
              />
              <OrdersSection
                title="Past orders"
                orders={past}
                emptyText="No past orders yet."
              />
            </>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
