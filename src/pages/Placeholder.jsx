import React from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import BackHeader from "@/components/layout/BackHeader";

export default function Placeholder({ title, note }) {
  return (
    <div>
      <BackHeader title={title} />
      <div className="pt-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-accent grid place-items-center mx-auto">
          <Package className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-5xl mt-4">{title}</h1>
        <p className="text-muted-foreground mt-2">{note || "This screen is coming in the next build."}</p>
        <Link to="/" className="mt-6 inline-flex h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold items-center">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}