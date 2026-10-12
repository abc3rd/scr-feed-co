import React from 'react';
import { Link } from 'react-router-dom';
export default function PaymentStatus() {
  return <div className="py-8 space-y-5"><h1 className="font-heading text-4xl">Online payment unavailable</h1><p>Please contact the store to complete your order. Your cart remains saved.</p><Link to="/" className="inline-block rounded-2xl bg-primary px-6 py-3 text-primary-foreground">Return to your cart</Link></div>;
}
