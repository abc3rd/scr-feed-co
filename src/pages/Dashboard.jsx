import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { api, STORES } from "@/lib/api";
import { indexProducts } from "@/lib/format";
import { readPendingAdd } from "@/lib/deepLink";
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
import HoldPlacedDialog from "@/components/cart/HoldPlacedDialog";
import PullToRefresh from "@/components/dashboard/PullToRefresh";

export default function Dashboard() {
  const { customer } = useSession();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState(() => {
    const loc = readPendingAdd()?.loc;
    return STORES.includes(loc) ? loc : customer.preferredStore || STORES[0];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [placed, setPlaced] = useState(null);
  const cart = useCart(location);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", location],
    queryFn: () => api.getDashboard(location),
  });

  const productIndex = useMemo(() => indexProducts(data), [data]);
  const liveItems = cart.items.map((i) => ({ ...i, available: 0, ...productIndex[i.sku], qty: i.qty }));
  const cartQty = Object.fromEntries(cart.items.map((i) => [i.sku, i.qty]));
  usePendingAdd(data, productIndex, cart.add, () => setCartOpen(true));

  const onPlaced = (order) => {
    cart.clear();
    setCartOpen(false);
    setPlaced(order);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Howdy,</p>
          <h1 className="font-heading text-5xl leading-none truncate">{customer.firstName}</h1>
        </div>
        {customer.card && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 pb-1">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            {customer.card.brand} •• {customer.card.last4}
          </p>
        )}
      </div>
      <StoreSwitcher value={location} onChange={setLocation} />

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
            <CategoryBrowser key={location} categories={data.categories} cartQty={cartQty} onAdd={cart.add} />
            <TrucksSection trucks={data.trucks} location={location} />
            <OrdersSection title="Past orders" orders={data.pastOrders} emptyText="No past orders yet." />
          </div>
        )}
      </div>

      <CartBar count={cart.count} location={location} onOpen={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} items={liveItems} cart={cart} location={location} onPlaced={onPlaced} />
      <HoldPlacedDialog order={placed} onClose={() => setPlaced(null)} />
    </div>
    </PullToRefresh>
  );
}