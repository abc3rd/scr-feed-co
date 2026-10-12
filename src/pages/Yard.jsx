import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import BackHeader from '@/components/layout/BackHeader';
import OrdersSection from '@/components/dashboard/OrdersSection';
export default function Yard() {
  const query = useQuery({ queryKey: ['yard'], queryFn: () => api.getYard() });
  return <div className="space-y-5"><BackHeader title="Yard orders" />
    {query.isLoading ? <p role="status">Loading yard orders…</p> : query.error ? <p role="alert">{query.error.message}</p> : <OrdersSection title="Active orders" orders={query.data.orders} emptyText="No active orders." />}
  </div>;
}
