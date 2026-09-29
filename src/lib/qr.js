// Builds the deep links encoded in SCR Feed Co. QR codes.

// Register / sign-up QR — one code, printed at the counter.
export const joinUrl = (source) =>
  `${window.location.origin}/join${source ? `?src=${encodeURIComponent(source)}` : ""}`;

// Member barn QR — one per member, hung in the barn.
export const memberUrl = (token) =>
  `${window.location.origin}/m/${encodeURIComponent(token)}`;