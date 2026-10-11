import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { api, STORES } from "@/lib/api";
import { indexProducts } from "@/lib/format";
import { readPendingAdd, readPendingReorder, clearPendingReorder } from "@/lib/deepLink";
import { useSession } from "@/lib/SessionContext";
import useCart from "@/hooks/useCart";
import usePendingAdd from "@/hooks/usePendingAdd";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";
import ProductSection from "@/components/dashboard/ProductSection";
import CategoryBrowser from "@/components/dashboard/CategoryBrowser";
import OrdersSection from "@/components/dashboard/OrdersSection";
import TrucksSection from "@/components/dashboard/TrucksSection";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import CartBar from "@/components/cart/CartBar";
import CartDrawer from "@/components/cart/CartDrawer";
import PullToRefresh from "@/components/dashboard/PullToRefresh";

const linesForReorder = (order, index) =>
  (order.lines || [])
    .map((l) => {
      const p = index[l.sku];
      return {
        sku: l.sku,
        name: p?.name || l.name,
        size: p?.size || "",
        price: p?.price ?? 0,
        qty: Math.min(l.qty, p?.available ?? 0),
      };
    })
    .filter((l) => l.qty > 0);

export default function Dashboard() {
  const { customer } = useSession();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(() => {
    const pending = readPendingReorder();
    const loc = pending?.location || readPendingAdd()?.loc;
    return STORES.includes(loc) ? loc : customer.preferredStore || STORES[0];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart(location);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", location],
    queryFn: () => api.getDashboard(location),
    refetchInterval: 15000,
  });

  const productIndex = useMemo(() => indexProducts(data), [data]);
  const liveItems = cart.items.map((i) => ({ ...i, available: 0, ...productIndex[i.sku], qty: i.qty }));
  const cartQty = Object.fromEntries(cart.items.map((i) => [i.sku, i.qty]));
  usePendingAdd(data, productIndex, cart.add, () => setCartOpen(true));

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  // Applies a reorder started from a member barn QR, once this store's data is loaded.
  const qrReorderAppliedRef = useRef(false);
  useEffect(() => {
    if (qrReorderAppliedRef.current || isLoading || !data) return;
    const pending = readPendingReorder();
    if (!pending) return;
    qrReorderAppliedRef.current = true;
    if (data.location !== location) { qrReorderAppliedRef.current = false; return; }
    clearPendingReorder();
    const lines = linesForReorder(pending, productIndex);
    if (lines.length) {
      cart.setAll(lines);
      setCartOpen(true);
    }
  }, [data, isLoading, location]);

  const pendingReorderRef = useRef(null);

  const reorder = (order) => {
    if (order.location !== location) {
      pendingReorderRef.current = order;
      setLocation(order.location);
      return;
    }
    const lines = linesForReorder(order, productIndex);
    if (lines.length) {
      cart.setAll(lines);
      setCartOpen(true);
    }
  };

  useEffect(() => {
    if (!pendingReorderRef.current || isLoading || !data) return;
    const order = pendingReorderRef.current;
    if (order.location !== location || data.location !== location) return;
    pendingReorderRef.current = null;
    const lines = linesForReorder(order, indexProducts(data));
    if (lines.length) {
      cart.setAll(lines);
      setCartOpen(true);
    }
  }, [data, isLoading, location]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Howdy,</p>
          <h1 className="font-heading text-5xl leading-none truncate">{customer.firstName}</h1>
        </div>
      </div>
      <StoreSwitcher value={location} onChange={setLocation} />

      <Link
        to="/assistant"
        className="mt-4 inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-accent text-accent-foreground font-bold select-none active:opacity-80"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Ask the SCR assistant
      </Link>

      <div className="mt-6">
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div role="alert" className="rounded-2xl bg-card border border-border p-5 text-center">
            <p className="font-semibold text-destructive">{error.message}</p>
            <button type="button" onClick={() => refetch()} className="mt-3 h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold">Try again</button>
          </div>
        ) : (
          <div className="space-y-9">
            {data.activeOrders.length > 0 && <OrdersSection title="Active orders" orders={data.activeOrders} />}
            <ProductSection title="Order again" products={data.orderAgain} cartQty={cartQty} onAdd={cart.add} emptyText="Your past orders will show up here." />
            <ProductSection title="Favorites" products={data.favorites} cartQty={cartQty} onAdd={cart.add} emptyText="No favorites yet." />
            {!data.categories.length && <p className="rounded-2xl bg-card border border-border p-5 text-muted-foreground">The store has not published products at this location yet.</p>}
            <CategoryBrowser key={location} categories={data.categories} cartQty={cartQty} onAdd={cart.add} />
            <TrucksSection trucks={data.trucks} location={location} />
            <OrdersSection title="Past orders" orders={data.pastOrders} emptyText="No past orders yet." onReorder={reorder} />
          </div>
        )}
      </div>

      <CartBar count={cart.count} location={location} onOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} items={liveItems} cart={cart} location={location} />
    </div>
    </PullToRefresh>
  );
}