// Small inline icons for the product page, drawn as SVG so they stay sharp
// at any size and need no image files.

// Food mark: a square with a dot, green for veg and
// brown-red for non-veg.
export function VegMark({ veg, size = 20, className = "" }) {
  const color = veg ? "#1a8f3c" : "#a52a1a";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
    >
      <rect x="1.5" y="1.5" width="21" height="21" rx="3" fill="#fff" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="5.5" fill={color} />
    </svg>
  );
}

// Delivery van with speed lines, in the site's brown.
export function DeliveryIcon({ size = 22, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 24"
      fill="none"
      stroke="#3F2305"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* speed lines */}
      <path d="M1 8h4M2 12h3M1 16h4" />
      {/* cargo box */}
      <path d="M8 4.5h12.5v13H8z" fill="#ede7e1" />
      {/* cab */}
      <path d="M20.5 8.5h4.6l3.9 4.6v4.4h-8.5z" fill="#ede7e1" />
      <path d="M22.5 10.5h2l2 2.5h-4z" fill="#3F2305" stroke="none" />
      {/* wheels */}
      <circle cx="12" cy="19" r="2.3" fill="#f9f9f9" />
      <circle cx="24.5" cy="19" r="2.3" fill="#f9f9f9" />
    </svg>
  );
}
