import React, { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { assistantChat } from "@/functions/assistantChat";

export default function AssistantChat({ context = {}, greeting, className = "" }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: greeting || "Hi! Ask me about feed, orders, or reorders." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const res = await assistantChat({
        messages: next.map(({ role, content }) => ({ role, content })),
        context,
      });
      const reply = res.data?.reply;
      if (!reply) throw new Error("No reply");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "The assistant is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-card border border-border">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive font-medium mt-2">{error}</p>}
      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the assistant…"
          aria-label="Message the assistant"
          className="flex-1 h-14 rounded-2xl border-2 border-input bg-card px-4 text-base focus:border-primary"
        />
        <button
          type="submit"
          disabled={!input.trim() || busy}
          aria-label="Send"
          className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-40"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}