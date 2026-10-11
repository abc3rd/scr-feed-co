import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { setPendingReorder } from "@/lib/deepLink";
import StatusChip from "@/components/dashboard/StatusChip";
import { formatDate, formatMoney } from "@/lib/format";

export default function MemberLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .getMemberByQr(token)
      .then((d) => { if (active) setData(d); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const reorder = () => {
    setPendingReorder({ location: data.reorder.location, lines: data.reorder.lines });
    navigate("/");
  };

  const last = data?.lastOrder;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-8 safe-area-bottom">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl bg-card border border-border p-5 text-center">
            <p className="font-semibold text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-4 h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold"
            >
              Go to the app
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">SCR Feed Co.</p>
            <h1 className="font-heading text-5xl leading-none mt-2">
              Welcome back{data.member.firstName ? `, ${data.member.firstName}` : ""}.
            </h1>
            <p className="text-muted-foreground mt-2">
              Scanned from the barn — here's your last order at {data.member.store}.
            </p>

            {last ? (
              <div className="mt-6 rounded-2xl bg-card border border-border p-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold break-all">{last.id}</span>
                  <StatusChip status={last.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {last.location} · {last.fulfillment === "delivery" ? "Delivery" : "Pickup"} · {formatDate(last.date)}
                </p>
                <ul className="mt-4 divide-y divide-border">
                  {last.lines.map((l) => (
                    <li key={l.sku} className="py-2 text-sm">
                      {l.qty} × {l.name}
                      {l.size ? ` · ${l.size}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="text-sm mt-2 font-semibold">
                  {last.finalAmount != null ? `Recorded amount ${formatMoney(last.finalAmount)}` : `Estimated items ${formatMoney(last.subtotal)}`}
                </p>
                <button
                  type="button"
                  onClick={reorder}
                  className="mt-5 w-full h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  Reorder these items
                </button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  We'll load them into your cart — review stock and submit your order.
                </p>
              </div>
            ) : (
              <p className="mt-6 text-muted-foreground rounded-2xl border border-dashed border-border p-4">
                No past orders found.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
