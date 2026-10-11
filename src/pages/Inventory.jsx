import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, STORES } from "@/lib/api";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";
import { formatMoney } from "@/lib/format";
import InboundManager from "@/components/dashboard/InboundManager";

const empty = {
  sku: "",
  name: "",
  size: "",
  category: "",
  price: "",
  onHand: "",
  reorderThreshold: "0",
  active: true,
  expectedVersion: null,
  expectedCatalogVersion: null,
};
export default function Inventory() {
  const [location, setLocation] = useState(STORES[0]),
    [form, setForm] = useState(empty),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const {
    data,
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["inventory", location],
    queryFn: () => api.getInventory(location),
  });
  const change = (field, value) => {
    setForm({ ...form, [field]: value });
    setSaved(false);
  };
  const select = (p) => {
    setForm({
      sku: p.sku,
      name: p.name,
      size: p.size,
      category: p.category,
      price: p.price.toFixed(2),
      onHand: String(p.onHand),
      reorderThreshold: String(p.reorderThreshold),
      active: p.active,
      expectedVersion: p.version,
      expectedCatalogVersion: p.catalogVersion,
    });
    setError("");
    setSaved(false);
  };
  const initialize = async () => {
    setBusy(true);
    setError("");
    try {
      await api.initializeStore();
      await refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!/^\d+(\.\d{1,2})?$/.test(form.price))
        throw new Error("Enter a price with up to two decimal places.");
      await api.saveProduct({
        ...form,
        location,
        priceCents: Math.round(Number(form.price) * 100),
        onHand: Number(form.onHand),
        reorderThreshold: Number(form.reorderThreshold),
      });
      setForm(empty);
      setSaved(true);
      await client.invalidateQueries();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <h1 className="font-heading text-4xl">Products & inventory</h1>
      <Link to="/yard" className="inline-block underline">
        Back to pick tickets
      </Link>
      <StoreSwitcher
        value={location}
        onChange={(value) => {
          setLocation(value);
          setForm(empty);
          setError("");
        }}
      />
      {loadError && (
        <div
          role="alert"
          className="rounded-xl bg-card border border-border p-4 space-y-3"
        >
          <p>{loadError.message}</p>
          <p className="text-sm text-muted-foreground">
            For first-time setup, connect SCR_DATABASE_URL in Base44, then
            initialize the empty store tables. No products or orders are added
            automatically.
          </p>
          <button
            disabled={busy}
            onClick={initialize}
            className="h-12 px-4 rounded-xl bg-primary text-primary-foreground"
          >
            Initialize store tables
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-primary">
          Product and stock saved.
        </p>
      )}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl bg-card border border-border p-4"
      >
        <h2 className="font-heading text-3xl">
          {form.expectedCatalogVersion == null
            ? "Add real product"
            : "Edit product"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Product name, category, price, and visibility apply across stores.
          Stock counts apply to {location}. Enter the physical count, including
          reserved units.
        </p>
        {[
          ["sku", "SKU", "text"],
          ["name", "Product name", "text"],
          ["size", "Package size", "text"],
          ["category", "Category", "text"],
          ["price", "Price ($)", "number"],
          ["onHand", "Physical stock count", "number"],
          ["reorderThreshold", "Low-stock threshold", "number"],
        ].map(([field, label, type]) => (
          <label key={field} className="block font-semibold">
            {label}
            <input
              required={field !== "size"}
              maxLength={field === "sku" ? 80 : field === "name" ? 160 : 120}
              type={type}
              min={type === "number" ? 0 : undefined}
              step={
                field === "price" ? "0.01" : type === "number" ? "1" : undefined
              }
              disabled={field === "sku" && form.expectedCatalogVersion != null}
              value={form[field]}
              onChange={(e) => change(field, e.target.value)}
              className="block w-full h-12 mt-2 px-3 rounded-xl bg-background border border-input disabled:opacity-60"
            />
          </label>
        ))}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => change("active", e.target.checked)}
            className="h-5 w-5"
          />
          Visible in the catalog
        </label>
        <button
          disabled={busy || !!loadError}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save product & stock"}
        </button>
        <button
          type="button"
          onClick={() => setForm(empty)}
          className="underline"
        >
          Clear form
        </button>
      </form>
      {isLoading ? (
        <p role="status">Loading inventory…</p>
      ) : data?.products.length ? (
        <ul className="space-y-3">
          {data.products.map((p) => (
            <li
              key={p.sku}
              className="p-4 rounded-xl bg-card border border-border"
            >
              <strong>{p.name}</strong>
              <p className="text-sm text-muted-foreground">
                {p.sku} · {p.size} · {formatMoney(p.price)}
                {!p.active ? " · Hidden" : ""}
              </p>
              <p>
                Physical: {p.onHand} · Reserved: {p.reserved} · Available:{" "}
                {p.available}
              </p>
              <button
                type="button"
                onClick={() => select(p)}
                className="mt-3 underline"
              >
                Edit product
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !loadError && (
          <p>
            No products entered at {location}. Add SCR’s actual catalog above.
          </p>
        )
      )}
      {!loadError && !isLoading && (
        <InboundManager key={location} location={location} />
      )}
    </div>
  );
}
