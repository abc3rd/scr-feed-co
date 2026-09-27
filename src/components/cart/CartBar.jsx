import React from "react";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

export default function CartBar({ count, location, onOpen }) {
  if (!count) return null;
  return (
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky bottom-3 z-30 mt-6">
      <button
        type="button"
        onClick={onOpen}
        className="w-full h-16 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 flex items-center justify-between px-5 font-bold"
      >
        <span className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          View cart · {location}
        </span>
        <span className="h-9 min-w-9 px-2 rounded-full bg-primary-foreground text-primary grid place-items-center">{count}</span>
      </button>
    </motion.div>
  );
}