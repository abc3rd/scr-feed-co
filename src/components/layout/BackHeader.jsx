import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackHeader({ title, to = "/" }) {
  const navigate = useNavigate();

  const back = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate(to);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border safe-area-top">
      <div className="max-w-3xl mx-auto px-2 h-14 flex items-center gap-1">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="h-11 w-11 rounded-xl flex items-center justify-center text-primary hover:bg-secondary transition-colors select-none"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="font-heading text-2xl tracking-wide truncate">{title}</h1>
      </div>
    </header>
  );
}