import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function InboundManager({ location }) {
  const [supplier, setSupplier] = useState(""),
    [eta, setEta] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const client = useQueryClient();
  const { data } = useQuery({
    queryKey: ["dashboard", location],
    queryFn: () => api.getDashboard(location),
  });
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.saveInbound({ location, supplier, eta, note });
      setSupplier("");
      setEta("");
      setNote("");
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const arrive = async (id) => {
    setBusy(true);
    setError("");
    try {
      await api.arriveInbound(id);
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-4 rounded-2xl bg-card border border-border p-4">
      <h2 className="font-heading text-3xl">Inbound truck schedule</h2>
      <p className="text-sm text-muted-foreground">
        Publish an actual supplier arrival estimate. Marking a truck arrived
        removes its estimate from the customer dashboard; count received goods
        and update physical inventory separately.
      </p>
      <form onSubmit={save} className="space-y-3">
        <label className="block font-semibold">
          Supplier
          <input
            required
            maxLength={160}
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="block mt-2 w-full h-12 px-3 bg-background border border-input rounded-xl"
          />
        </label>
        <label className="block font-semibold">
          Expected arrival
          <input
            required
            type="date"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            className="block mt-2 w-full h-12 px-3 bg-background border border-input rounded-xl"
          />
        </label>
        <label className="block font-semibold">
          Shipment details
          <textarea
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block mt-2 w-full p-3 bg-background border border-input rounded-xl"
          />
        </label>
        <button
          disabled={busy}
          className="h-12 px-4 bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-40"
        >
          Save arrival estimate
        </button>
      </form>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {data?.trucks.map((truck) => (
        <div key={truck.id} className="border-t border-border pt-3">
          <strong>{truck.supplier}</strong>
          <p>
            {formatDate(truck.eta)} · {truck.note}
          </p>
          <button
            onClick={() => arrive(truck.id)}
            disabled={busy}
            className="mt-2 underline"
          >
            Mark arrived
          </button>
        </div>
      ))}
    </section>
  );
}
