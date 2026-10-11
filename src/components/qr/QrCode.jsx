import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
// Generate locally: member QR tokens are never sent to an external image service.
export default function QrCode({
  value,
  size = 220,
  alt = "QR code",
  className = "",
}) {
  const [src, setSrc] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setSrc("");
    setError("");
    QRCode.toDataURL(value, {
      width: size,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active)
          setError("The QR code could not be generated. Use the link below.");
      });
    return () => {
      active = false;
    };
  }, [value, size]);
  if (error)
    return (
      <p role="alert" className="text-destructive">
        {error}
      </p>
    );
  if (!src)
    return (
      <div
        role="status"
        style={{ width: size, height: size }}
        className="grid place-items-center bg-muted rounded-xl"
      >
        Generating QR…
      </div>
    );
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      className={`bg-white rounded-xl ${className}`}
    />
  );
}
