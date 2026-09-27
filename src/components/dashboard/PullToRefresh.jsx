import React, { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

const THRESHOLD = 64;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const onStart = (e) => {
      if (window.scrollY <= 0 && !refreshing) {
        startYRef.current = e.touches[0].clientY;
        pullingRef.current = true;
      }
    };
    const onMove = (e) => {
      if (!pullingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0 && window.scrollY <= 0) {
        const next = Math.min(dy * 0.5, 96);
        pullRef.current = next;
        setPull(next);
      } else if (dy <= 0) {
        pullRef.current = 0;
        setPull(0);
      }
    };
    const onEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const triggered = pullRef.current >= THRESHOLD;
      pullRef.current = 0;
      setPull(0);
      if (triggered) {
        setRefreshing(true);
        try {
          await onRefreshRef.current?.();
        } finally {
          setRefreshing(false);
        }
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [refreshing]);

  const height = refreshing ? 56 : pull;

  return (
    <>
      <div
        aria-hidden={pull <= 0 && !refreshing}
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
        style={{ height }}
      >
        {refreshing ? (
          <Loader2 className="h-6 w-6 text-primary animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw
            className="h-5 w-5 text-muted-foreground transition-transform"
            style={{ transform: `rotate(${pull * 3}deg)` }}
            aria-hidden="true"
          />
        )}
      </div>
      {children}
    </>
  );
}