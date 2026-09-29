import React from "react";

// Renders a scannable QR image for a value. A plain <img> keeps the code crisp
// (no resize/re-encode), which matters for reliable scanning.
export default function QrCode({ value, size = 220, alt = "QR code", className = "" }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(value)}`;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      loading="lazy"
      className={`bg-white rounded-xl ${className}`}
    />
  );
}