import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

const button =
  "h-12 px-4 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40";
const input =
  "block w-full h-12 mt-2 px-3 rounded-xl bg-background border border-input";
const pendingKey = (location) => "scr_stock_move:" + location;
function pendingMovement(location) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(pendingKey(location)) || "null",
    );
    return value?.location === location && typeof value.requestId === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}

export default function StockScanner({ location, products }) {
  const [pending, setPending] = useState(() => pendingMovement(location));
  const [code, setCode] = useState(""),
    [match, setMatch] = useState(null),
    [lookedUp, setLookedUp] = useState(false);
  const [sku, setSku] = useState(""),
    [qty, setQty] = useState("1"),
    [direction, setDirection] = useState("in");
  const [reason, setReason] = useState("received"),
    [note, setNote] = useState("");
  const [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const video = useRef(null),
    controls = useRef(null),
    generation = useRef(0);
  const client = useQueryClient();
  const { data, error: historyError } = useQuery({
    queryKey: ["stock-moves", location],
    queryFn: () => api.getStockMoves(location),
  });
  const stopCamera = () => {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    const stream = video.current?.srcObject;
    if (stream && typeof stream.getTracks === "function")
      stream.getTracks().forEach((track) => track.stop());
    setCamera(false);
  };
  useEffect(
    () => () => {
      generation.current++;
      controls.current?.stop();
    },
    [],
  );
  const lookup = async (value = code) => {
    stopCamera();
    setBusy(true);
    setError("");
    setMessage("");
    setLookedUp(false);
    setMatch(null);
    try {
      const result = await api.lookupCode(value.trim(), location);
      setCode(result.code);
      setMatch(result.product);
      setLookedUp(true);
      setSku("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const startCamera = async () => {
    setError("");
    setCamera(true);
    const current = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera scanning needs HTTPS and camera access. You can still type a code or use a barcode scanner below.",
        );
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (current !== generation.current) return;
      const reader = new BrowserMultiFormatReader();
      const active = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        video.current,
        (result, _error, scanner) => {
          if (!result || current !== generation.current) return;
          scanner.stop();
          const value = result.getText();
          setCode(value);
          lookup(value);
        },
      );
      if (current !== generation.current) active.stop();
      else controls.current = active;
    } catch {
      if (current === generation.current) {
        stopCamera();
        setError(
          "Camera could not start. Allow camera access, or use a barcode scanner or type the code.",
        );
      }
    }
  };
  const link = async () => {
    setBusy(true);
    setError("");
    try {
      await api.linkCode(code, sku, location);
      await lookup(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const unlink = async () => {
    if (
      !window.confirm(
        "Remove this code's product match? Stock will not change.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api.unlinkCode(code, match.sku, location);
      await lookup(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const move = async () => {
    if (busy) return;
    const amount = Number(qty);
    if (
      !pending &&
      (!match ||
        !Number.isSafeInteger(amount) ||
        amount < 1 ||
        amount > 1000000)
    ) {
      setError("Enter a whole positive quantity.");
      return;
    }
    const request = pending || {
      requestId: crypto.randomUUID(),
      location,
      code,
      sku: match.sku,
      expectedVersion: match.version,
      qty: amount,
      direction,
      reason,
      note,
    };
    // Persist before sending. A lost response/reload must retry this same movement.
    sessionStorage.setItem(pendingKey(location), JSON.stringify(request));
    setPending(request);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.moveStock(request);
      sessionStorage.removeItem(pendingKey(location));
      setPending(null);
      setMessage("Stock movement saved. Scan the next item.");
      setCode("");
      setMatch(null);
      setLookedUp(false);
      setQty("1");
      setNote("");
      await client.invalidateQueries({ queryKey: ["inventory", location] });
      await client.invalidateQueries({ queryKey: ["stock-moves", location] });
      await client.invalidateQueries({ queryKey: ["dashboard", location] });
    } catch (err) {
      // A validation/conflict rejection was not committed. An interrupted or 5xx
      // response may have committed, so retain the request and offer only retry.
      if (err.status >= 400 && err.status < 500) {
        sessionStorage.removeItem(pendingKey(location));
        setPending(null);
        setMatch(null);
        setLookedUp(false);
      }
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const initialize = async () => {
    setBusy(true);
    setError("");
    try {
      await api.initializeStore();
      await client.invalidateQueries({ queryKey: ["stock-moves", location] });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="space-y-4 rounded-2xl bg-card border border-border p-4"
      aria-label="Scan inventory"
    >
      <h2 className="font-heading text-3xl">Scan stock in / out</h2>
      <p className="text-sm text-muted-foreground">
        Use the existing product barcode or QR label. Match an unfamiliar label
        once. Confirm the package size and quantity before changing stock at{" "}
        {location}.
      </p>
      {historyError && (
        <div role="alert">
          <p>{historyError.message}</p>
          {historyError instanceof ApiError && historyError.status === 503 && (
            <button onClick={initialize} disabled={busy} className={button}>
              Set up scanning tables
            </button>
          )}
        </div>
      )}
      {pending ? (
        <div className="space-y-3 border border-border rounded-xl p-3">
          <p>
            A stock movement needs confirmation:{" "}
            {pending.direction === "in" ? "add" : "remove"} {pending.qty} units
            of {pending.sku}. Retry the same request to confirm it without
            applying it twice.
          </p>
          <button onClick={move} disabled={busy} className={button}>
            {busy ? "Checking…" : "Retry stock movement"}
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={camera ? stopCamera : startCamera}
            disabled={busy}
            className={button}
          >
            {camera ? "Stop camera" : "Scan with camera"}
          </button>
          {camera && (
            <video
              ref={video}
              autoPlay
              muted
              playsInline
              className="w-full rounded-xl bg-muted"
              aria-label="Barcode camera preview"
            />
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup();
            }}
            className="space-y-3"
          >
            <label className="block font-semibold">
              Barcode or QR contents
              <input
                className={input}
                value={code}
                maxLength={512}
                disabled={busy || camera}
                autoComplete="off"
                onChange={(e) => {
                  setCode(e.target.value);
                  setMatch(null);
                  setLookedUp(false);
                  setMessage("");
                }}
              />
            </label>
            <button
              disabled={busy || !code.trim() || camera}
              className={button}
            >
              {busy ? "Looking up…" : "Find product"}
            </button>
          </form>
          {lookedUp && !match && (
            <div className="space-y-3">
              <p>
                No product match yet. Choose the exact item and package size. A
                shared manufacturer or marketing QR may not identify one
                product; use the package barcode instead.
              </p>
              <label className="block font-semibold">
                Match this label to
                <select
                  className={input}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={busy}
                >
                  <option value="">Choose a product</option>
                  {products.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} · {p.size} · {p.sku}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={link} disabled={busy || !sku} className={button}>
                Save product match
              </button>
            </div>
          )}
          {match && (
            <div className="space-y-3">
              <strong className="block">
                {match.name} · {match.size}
              </strong>
              <p className="break-all">SKU: {match.sku}</p>
              {match.version == null ? (
                <p>
                  Add this SKU's physical count at {location} using the product
                  form below before scanning stock movements.
                </p>
              ) : (
                <>
                  <p>
                    Physical: {match.onHand} · Reserved: {match.reserved} ·
                    Available: {match.onHand - match.reserved}
                  </p>
                  <label className="block font-semibold">
                    Movement
                    <select
                      className={input}
                      disabled={busy}
                      value={direction}
                      onChange={(e) => {
                        setDirection(e.target.value);
                        setReason(
                          e.target.value === "in" ? "received" : "counter_sale",
                        );
                      }}
                    >
                      <option value="in">Stock in</option>
                      <option value="out">Stock out</option>
                    </select>
                  </label>
                  <label className="block font-semibold">
                    Quantity
                    <input
                      className={input}
                      type="number"
                      min="1"
                      max="1000000"
                      step="1"
                      value={qty}
                      disabled={busy}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </label>
                  <label className="block font-semibold">
                    Reason
                    <select
                      className={input}
                      value={reason}
                      disabled={busy}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      {(direction === "in"
                        ? [
                            ["received", "Received stock"],
                            ["return", "Restocked return"],
                            ["correction", "Count correction"],
                          ]
                        : [
                            ["counter_sale", "Counter sale"],
                            ["damage", "Damage / loss"],
                            ["correction", "Count correction"],
                          ]
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block font-semibold">
                    Note (optional)
                    <input
                      className={input}
                      value={note}
                      maxLength={500}
                      disabled={busy}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <p className="text-sm text-muted-foreground">
                    App orders deduct stock through their pick ticket's Done
                    action. Do not scan them out again. Counter sale stock-outs
                    update inventory only; they do not charge a customer or post
                    a QuickBooks receipt.
                  </p>
                  <button onClick={move} disabled={busy} className={button}>
                    {busy
                      ? "Saving…"
                      : direction === "in"
                        ? "Confirm stock in"
                        : "Confirm stock out"}
                  </button>
                </>
              )}
              <button
                onClick={unlink}
                disabled={busy}
                className="block underline text-sm"
              >
                Remove code match
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!!data?.movements.length && (
        <div>
          <h3 className="font-semibold mb-2">Recent stock movements</h3>
          <ul className="space-y-2 text-sm">
            {data.movements.map((m) => (
              <li key={m.request_id} className="border-t border-border pt-2">
                {m.name} · {m.size} · {m.delta > 0 ? "+" : ""}
                {m.delta} · {m.reason.replaceAll("_", " ")}
                <span className="block text-muted-foreground">
                  {new Date(m.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
