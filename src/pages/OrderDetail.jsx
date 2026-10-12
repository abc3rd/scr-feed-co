import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import BackHeader from '@/components/layout/BackHeader';
import StatusChip from '@/components/dashboard/StatusChip';
import { formatMoney, formatDate } from '@/lib/format';

export default function OrderDetail() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ['order', id], queryFn: () => api.getOrder(id) });
  const order = query.data?.order;
  return <div className="space-y-5">
    <BackHeader title="Order details" to="/orders" />
    {query.isLoading ? <p role="status">Loading order…</p> : query.error ? <p role="alert">{query.error.message}</p> : order && <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h1 className="font-heading text-3xl">Order {order.id}</h1>
      <StatusChip status={order.status} />
      <p>{order.location} · {order.fulfillment === 'delivery' ? 'Delivery' : 'Pickup'} · {formatDate(order.date)}</p>
      <ul className="divide-y divide-border">{order.lines.map((line) => <li key={line.sku} className="py-3">{line.qty} × {line.name}</li>)}</ul>
      {Number.isFinite(order.holdAmount) && <p>Authorized: {formatMoney(order.holdAmount)}</p>}
      {Number.isFinite(order.finalAmount) && <p>Charged: {formatMoney(order.finalAmount)}</p>}
    </section>}
  </div>;
}
