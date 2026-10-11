import React from "react";
import { Link } from "react-router-dom";
export default function PaymentInfo() {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-4xl">Pay at the store</h1>
      <p>
        Place your order ahead and pay SCR staff when you collect it or receive
        your delivery. The store confirms the final total, including tax and any
        delivery fee.
      </p>
      <p className="text-muted-foreground">
        This app does not collect card details or make online card charges or
        holds.
      </p>
      <Link
        to="/"
        className="inline-block rounded-xl bg-primary text-primary-foreground px-6 py-3 font-bold"
      >
        Browse feed
      </Link>
    </div>
  );
}
