import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { readPendingAdd, clearPendingAdd } from "@/lib/deepLink";

// Adds the QR-linked item to the cart once the store's catalog has loaded.
export default function usePendingAdd(data, productIndex, add, openCart) {
  const { toast } = useToast();

  useEffect(() => {
    const pending = readPendingAdd();
    if (!data || !pending || (pending.loc && pending.loc !== data.location)) return;
    clearPendingAdd();
    const product = productIndex[pending.sku];
    if (!product) {
      toast({ title: "Item not found", description: `That item isn't carried at ${data.location}.` });
    } else if (product.available <= 0) {
      toast({ title: "Out of stock", description: `${product.name} is out of stock at ${data.location}.` });
    } else {
      add(product);
      toast({ title: "Added to cart", description: product.name });
      openCart();
    }
  }, [data]);
}