import React, { useEffect, useState } from 'react';
import { createQrImage } from '@/lib/qrImage';

export default function QrCode({ value, size = 240, alt = 'QR code', className = '' }) {
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setImage(null); setError('');
    createQrImage(value, size)
      .then((data) => { if (active) setImage(data); })
      .catch(() => { if (active) setError('The QR code could not be generated.'); });
    return () => { active = false; };
  }, [value, size]);
  if (error) return <p role="alert">{error}</p>;
  if (!image) return <p role="status">Generating QR code…</p>;
  return <img src={image.src} width={image.width} height={image.width} alt={alt} className={`max-w-full h-auto bg-white rounded-xl ${className}`} />;
}
